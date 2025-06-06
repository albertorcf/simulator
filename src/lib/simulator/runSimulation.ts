// frontend/src/lib/simulator/runSimulation.ts
import { evalExpr } from "@/utils/evalExpr";
import { Candle } from '@/types/types';
import type { RuleGroupTypeAny } from "react-querybuilder";
import { evaluateRuleGroup } from "./ruleEngine";
import { buildScopeFromVars, addUdfsToScope } from "@/lib/simulator/scopeUtils"; // Adicionar import
import { userDefinedFunctions } from "@/data/strategies/udfs";

export type RunSimulationParams = {
  candles: Candle[];
  strategyData: any; // JS da estratégia
};

export type Operation = {
  opType: "buy" | "sell" | "reset" | "none";
  opTimestamp: number;
  opPrice: number;
  opQty?: number;
  opDescr?: string;
  opResistencia?: number;
  opSuporte?: number;
};

export type SimulationResult = {
  initialUSDT: number;
  initialSOL: number;
  finalUSDT: number;
  finalSOL: number;
  operations: Operation[];
};

// ───────────────────────────────────────────────────────────────────
// ✅ Helpers
// ───────────────────────────────────────────────────────────────────

// Função para converter a taxa
function parseTaxa(taxa: number | string): number {
  if (typeof taxa === "number") return taxa;
  if (typeof taxa === "string") {
    taxa = taxa.replace("%", "").replace(",", ".").trim();
    return parseFloat(taxa) / 100;
  }
  throw new Error("Taxa inválida!");
}

/**
 * ruleGroup to String
 */
export function ruleGroupToString(group: RuleGroupTypeAny): string {
  return '(' + group.rules.map(rule => {
    if (typeof rule !== "object" || rule === null) return '';
    if ('combinator' in rule && rule.rules) {
      return ruleGroupToString(rule as RuleGroupTypeAny);
    } else {
      const left = 'field' in rule ? rule.field : undefined;
      const op = 'operator' in rule ? rule.operator : undefined;
      const right = 'valueSource' in rule && rule.valueSource === "field" 
              ? rule.value 
              : 'value' in rule ? JSON.stringify(rule.value) : undefined;
      return `${left} ${op} ${right}`;
    }
  }).filter(Boolean).join(` ${group.combinator} `) + ')';
}

// ───────────────────────────────────────────────────────────────────
// Funções desacopladas chamadas nas condições (futuramente) e ações de forma simples.
// Em scope são criadas (closures) através de funções adaptadoras (wrappers functions),
// que passam o parâmetro scope para acesso ao contexto dentro da função desacoplada.
// ToDo: aceitar parâmetros e returnar um valor
// ───────────────────────────────────────────────────────────────────
// Migradas para UDFs!!!

// ───────────────────────────────────────────────────────────────────
// ────────────────────────── runSimulation ──────────────────────────
// ───────────────────────────────────────────────────────────────────
//
export function runSimulation(params: RunSimulationParams): SimulationResult | null {
  const { candles, strategyData: strategy } = params;
  if (!candles || candles.length < 2) return null;

  // ─────────────────────────────────────────
  // ─────────── 🧪 INICIALIZAÇÃO ────────────
  // ─────────────────────────────────────────

  // Monta o escopo inicial a partir de strategy.vars
  let scope = buildScopeFromVars(strategy.vars);

  // Candles
  scope.candles = candles;

  // Taxa de operação
  scope.taxa = parseTaxa(scope.taxa ?? 0.001);

  // Definir suporte e resistência para os valores iniciais (ajuste temporário)
  if ('delta' in scope && 'close' in scope) {
    scope.suporte = candles[0].close - scope.delta;
    scope.resistencia = candles[0].close + scope.delta;
  }

  // Funções hard-coded (serão gradualmente substituídas por UDFs)
  //scope.buy = () => buy(scope);
  //scope.sell = () => sell(scope);
  // scope.resetR = () => resetR(scope); // <--- Comentar esta linha
  // scope.resetS = () => resetS(scope); // <--- Comentar esta linha

  // Adiciona todas as UDFs definidas em udfs.ts ao scope
  // Isso sobrescreverá qualquer função de mesmo nome definida anteriormente (ex: se houver uma UDF "buy")
  addUdfsToScope(scope, userDefinedFunctions);

  // Array de operações por candle
  const operations: Operation[] = [{
    opType: "none",
    opTimestamp: candles[0].time,
    opPrice: candles[0].close,
    opQty: 0,
    opDescr: "",
    opResistencia: scope.resistencia,
    opSuporte: scope.suporte,
  }];

  // Saldos iniciais
  const saldoSOLinit = scope.saldoSOL;
  const saldoUSDTinit = scope.saldoUSDT;

  // ─────────────────────────────────────────
  // ─────────── 🔁 LOOP PRINCIPAL ───────────
  // ─────────────────────────────────────────
  for (let i = 1; i < candles.length; i++) {
    // Atualiza variáveis do candle no escopo
    const candle = candles[i];
    scope.atual = candle;
    scope.anterior = candles[i - 1];
    scope.index = i;
    scope.time = candle.time;
    scope.close = candle.close;
    scope.open = candle.open;
    scope.high = candle.high;
    scope.low = candle.low;
    scope.volume = candle.volume;

    // Inicializa op para esta iteração de candle
    scope.opType = "none";
    scope.opTimestamp = candle.time;
    scope.opPrice = candle.close;
    scope.opQty = 0;
    scope.opDescr = "";
    scope.opResistencia = scope.resistencia;
    scope.opSuporte = scope.suporte;

    // Atualiza campos computed (expr) no escopo
    for (const v of strategy.vars) {
      if (v.type === "computed" && v.expr) {
        try {
          scope[v.name] = evalExpr(v.expr, scope);
        } catch (e) {
          console.warn(`❌ Erro ao avaliar expressão para ${v.name}:`, e);
          scope[v.name] = null;
        }
      }
    }

    // Inicializa demais variáveis no loop
    scope.candleOp = 'I';   // Inicializa candle op para iddle (inativo)
    scope.break = false;    // Inicializa break como false para avaliar todas as regras

    // ───── Loop para avaliar condições das regras e executar ações ─────
    for (const rule of strategy.rules) {
      // Avalia a condição da regra usando a função recursiva
      if (evaluateRuleGroup(rule.condition, scope)) {
        // Executa todas as ações da regra (pode ser uma ou várias)
        if (rule.action && Array.isArray(rule.action.rules)) {
          for (const actionRule of rule.action.rules) {
            if (typeof actionRule.field === "string" && actionRule.field.endsWith("()")) {
              // Chama a função correspondente no escopo (ex: buy(), sell(), reset())
              const fnName = actionRule.field.replace("()", "");
              if (typeof scope[fnName] === "function") {
                scope[fnName]();
              }
            } else if (typeof actionRule.field === "string") {
              // Caso queira suportar atribuições diretas no futuro
              scope[actionRule.field] = actionRule.value;
            }
          }
        }
        // Permite customizar se deve parar o loop de regras, ou não, após validar a regra atual
        // Incluir campo break: false se quiser seguir adiante nas validações em qualquer caso
        // Também pode alterar scope.break na udf
        // Ex.: após um sell não vai testar buy e reset
        if (scope.break || rule.break !== false) break;
      }
    }

    // Gravar operação do candle no array de operações
    // [TODO] Retornar operações "none"???
    // [TODO] Melhorar esse código obtendo somente os campos de scope automaticamente
    //if (scope.op.type !== "none") {
      operations.push({ 
        opType: scope.opType,
        opTimestamp: scope.opTimestamp,
        opPrice: scope.opPrice,
        opQty: scope.opQty,
        opDescr: scope.opDescr,
        opResistencia: scope.opResistencia,
        opSuporte: scope.opSuporte,
      });
    //}
    
    // [TODO] Qualquer lógica extra de controle/estatística
    if (scope.candleOp === 'I') scope.iddleCount--;

  } // END loop principal para cada candle

  // 📊 Resultados finais da simulação
  console.clear();
  console.log('✅ Resultados');
  console.log('operations', operations);
  console.log('scope', scope);
  return {
    initialUSDT: saldoUSDTinit,
    initialSOL: saldoSOLinit,
    finalUSDT: scope.saldoUSDT,
    finalSOL: scope.saldoSOL,
    operations,
  };
}

// Exportar as funções auxiliares para testes
// export { resetR, resetS }; // <--- Comentar ou remover esta linha
