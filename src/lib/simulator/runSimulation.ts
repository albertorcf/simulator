// frontend/src/lib/simulator/runSimulation.ts
import { evalExpr, runExpr } from "@/utils/evalExpr";
import { Candle } from '@/types/types';
import type { RuleGroupType, RuleGroupTypeAny } from "react-querybuilder";

export type RunSimulationParams = {
  candles: Candle[];
  strategyData: any; // JS da estratégia
};

export type Operation = {
  type: "buy" | "sell" | "reset" | "none";
  timestamp: number;
  price: number;
  qty?: number;
  descr?: string;
  R?: number;
  S?: number;
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

// Avaliador recursivo de RuleGroupType/RuleGroupTypeAny para condições de estratégia
// Pode usar RuleGroupTypeAny para máxima flexibilidade, mas se suas regras seguem sempre o padrão do RuleGroupType,
// não há problema em usar RuleGroupType. O uso de RuleGroupTypeAny só é necessário se você espera regras
// aninhadas ou formatos mistos vindos de diferentes fontes ou do usuário.

/**
 * Avalia um RuleGroupType ou RuleGroupTypeAny sobre o escopo fornecido.
 * Retorna true se a condição for satisfeita, false caso contrário.
 Exemplo de group:
 {
   combinator: "or",
   rules: [
     { field: "index", operator: "=", valueSource: "value", value: 1 },
     {
       combinator: "and",
       rules: [
         { field: "close",     operator: "<=", valueSource: "field", value: "suporte" },
         { field: "saldoUSDT", operator: ">=", valueSource: "field", value: "valorOp" },
         { field: "lastOp",    operator: "==", valueSource: "value", value: "V" }
       ]
     }
   ]
 } satisfies RuleGroupType,
 */
export function evaluateRuleGroup(
  group: RuleGroupType | RuleGroupTypeAny,
  scope: any
): boolean {
  // Inicializa o resultado com base no combinator (short-circuit)
  const isAnd = group.combinator === "and";

  for (const rule of group.rules) {
    let result: boolean;

    if (typeof rule !== "object" || rule === null) {
      // Ignora strings ou placeholders
      result = true; // Ajuste conforme sua lógica (true ignora)
    } 
    else if ('combinator' in rule && rule.rules) {
      // Subgrupo (recursivo!)
      result = evaluateRuleGroup(rule as RuleGroupTypeAny, scope);
    } 
    else {
      // Regra simples
      const left = 'field' in rule ? scope[rule.field] : undefined;
      const right =
        'valueSource' in rule && rule.valueSource === "field"
          ? scope[rule.value]
          : 'value' in rule ? rule.value : undefined;

      if ('operator' in rule) {
        switch (rule.operator) {
          case "=": result = left == right; break;
          case "==": result = left == right; break;
          case "!=": result = left != right; break;
          case ">": result = left > right; break;
          case ">=": result = left >= right; break;
          case "<": result = left < right; break;
          case "<=": result = left <= right; break;
          default: result = false;
        }
      } else {
        result = false;
      }
    }

    // Short-circuit: Se já determinou o resultado final, retorna imediatamente
    if (isAnd && !result) {
      // Em um AND, um único false define tudo
      return false;
    }
    else if (!isAnd && result) {
      // Em um OR, um único true define tudo
      return true;
    }
  } // for

  // Caso não haja short-circuit, retorna o valor padrão
  return isAnd; // true para AND (todos true, todas as condições atendidas), false para OR (todos false, nenhuma condição atendida)
}

/**
 * 
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


function buy(scope: any) {
  const time   =  scope.time;
  const feeRate = scope.taxa || 0.001;
  const price   = scope.close;
  const qty     = scope.qty;

  const feeSOL = qty * feeRate;    // taxa cobrada em SOL
  const netSOL = qty - feeSOL;     // SOL realmente creditado
  const costUSD = qty * price;     // USDT que sai da conta

  scope.saldoSOL += netSOL;
  scope.saldoUSDT -= costUSD;

  scope.lastOp = "C";
  scope.candleOp = "C";
  scope.iddleCount = scope.iddleInit;

  // ToDo: retornar taxas calculadas para totalização
  scope.op.type = 'buy';
  scope.op.timestamp = time;
  scope.op.price = price;
  scope.op.qty = netSOL;
  scope.op.R = scope.resistencia;
  scope.op.S = scope.suporte;
}

function sell(scope: any) {
  const time = scope.time;
  const feeRate = scope.taxa || 0.001;
  const price = scope.close;
  const qty = scope.qty;

  const grossUSD = qty * price;         // USDT que você *receberia*
  const feeUSD = grossUSD * feeRate;    // taxa cobrada em USDT
  const netUSD = grossUSD - feeUSD;     // USDT realmente creditado

  scope.saldoSOL -= qty;
  scope.saldoUSDT += netUSD;

  scope.lastOp = "V";
  scope.candleOp = "V";
  scope.iddleCount = scope.iddleInit;

  scope.op.type = 'sell';
  scope.op.timestamp = time;
  scope.op.price = price;
  scope.op.qty = qty;
  scope.op.R = scope.resistencia;
  scope.op.S = scope.suporte;
}

function reset(scope: any) {
  const close = scope.close;
  const delta = scope.delta;
  scope.resistencia = close + delta;
  scope.suporte = close - delta;

  scope.iddleCount = scope.iddleInit;  // zera contador de iterações iddle (inativas)
  
  if (scope.candleOp === 'I') {
    scope.candleOp = "R";
    scope.op.type = 'reset';
  }
  scope.op.R = scope.resistencia;
  scope.op.S = scope.suporte;
}

function resetR(scope: any) {
  const close = scope.close;
  const delta = scope.delta;
  scope.resistencia = close + delta;
  
  scope.iddleCount = scope.iddleInit;

  if (scope.candleOp === 'I') {
    scope.candleOp = "R";
    scope.op.type = 'reset';
  }
  scope.op.R = scope.resistencia;
}

function resetS(scope: any) {
  const close = scope.close;
  const delta = scope.delta;
  scope.suporte = close - delta;

  scope.iddleCount = scope.iddleInit;

  if (scope.candleOp === 'I') {
    scope.candleOp = "R";
    scope.op.type = 'reset';
  }
  scope.op.S = scope.suporte;
}

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
  let scope: Record<string, any> = {};

  for (const v of strategy.vars) {
    if (v.type === "state" || v.type === "candle") {
      scope[v.name] = v.value;
    } else if (v.type === "computed" && v.value !== undefined) {
      scope[v.name] = v.value;
    } else if (v.type === "computed" && v.expr) {
      try {
        scope[v.name] = evalExpr(v.expr, scope);
      } catch (e) {
        console.warn(`❌ Erro ao avaliar expressão para ${v.name}:`, e);
        scope[v.name] = null;
      }
    }
    // Actions não são inicializadas aqui, só referenciadas depois
  }

  // Candles
  scope.candles = candles;

  // Taxa de operação
  scope.taxa = parseTaxa(scope.taxa ?? 0.001);

  // Definir suporte e resistência para os valores iniciais (ajuste temporário)
  if ('delta' in scope && 'close' in scope) {
    scope.suporte = candles[0].close - scope.delta;
    scope.resistencia = candles[0].close + scope.delta;
  }

  // Funções
  scope.buy = () => buy(scope);
  scope.sell = () => sell(scope);
  scope.reset = () => reset(scope);
  scope.resetR = () => resetR(scope);
  scope.resetS = () => resetS(scope);

  // Array de operações por candle
  const operations: Operation[] = [{
    type: "none",
    timestamp: candles[0].time,
    price: candles[0].close,
    qty: 0,
    descr: "",
    R: scope.resistencia,
    S: scope.suporte,
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

    // Inicializa op para esta iteração
    scope.op = {
      type: "none",
      timestamp: candle.time,
      price: candle.close,
      qty: 0,
      descr: "",
      R: scope.resistencia,
      S: scope.suporte,
    };

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

    // ───── Avaliar condições das regras e executar ações ─────
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
        // Ex.: após um sell não vai testar buy e reset
        if (rule.break !== false) break;
      }
    }

    // Gravar operação no array de operações
    // [TODO] Retornar operações "none"???
    //if (scope.op.type !== "none") {
      operations.push({ ...scope.op });
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
export { buy, sell, reset, resetR, resetS };
