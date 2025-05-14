// frontend/src/lib/simulator/runSimulation.ts
import { evalExpr, runExpr } from "@/utils/evalExpr";
import { Candle } from '@/types/types';

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

/**
 * Helpers
 */

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
 * Funções desacopladas chamadas nas condições (futuramente) e ações de forma simples.
 * Em scope são criadas (closures) através de funções adaptadoras (wrappers functions),
 * que passam o parâmetro scope para acesso ao contexto dentro da função desacoplada.
 * ToDo: aceitar parâmetros e returnar um valor
 */

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

  scope.candleOp = "R";
  scope.iddleCount = scope.iddleInit;
  
  scope.op.type = 'reset';  // ???
  scope.op.R = scope.resistencia;
  scope.op.S = scope.suporte;
}

function resetR(scope: any) {
  const close = scope.close;
  const delta = scope.delta;
  scope.resistencia = close + delta;
  
  scope.candleOp = "R";
  scope.iddleCount = scope.iddleInit;

  scope.op.type = 'reset';  // ???
  scope.op.R = scope.resistencia;
}

function resetS(scope: any) {
  const close = scope.close;
  const delta = scope.delta;
  scope.suporte = close - delta;

  scope.candleOp = "R";
  scope.iddleCount = scope.iddleInit;

  scope.op.type = 'reset';  // ???
  scope.op.S = scope.suporte;
}

//
// —————————————runSimulation———————————————
//
export function runSimulation(params: RunSimulationParams): SimulationResult | null {
  const { candles, strategyData: strategy } = params;

  // 🧪 INICIALIZAÇÃO

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


  // 🔁 LOOP PRINCIPAL
  for (let i = 1; i < candles.length; i++) {
    scope.index = 1;

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

    // [TODO] Atualizar campos computed (expr) no escopo

    // [TODO] Avaliar condições das regras e executar ações

    // [TODO] Gravar operação no array de operações

    // [TODO] Qualquer lógica extra de controle/estatística
  }

  // [TODO] Retornar resultados finais da simulação
  //
  // Testando até aqui!
  //

  console.clear();
  console.log('initialScope', scope);
  return null;

  /*

  // Lista para armazenar operações realizadas
  const operations: Operation[] = [];

  console.log("✅ INIT carregado:", config.init);
  console.log("✅ ESTRATÉGIA:", config.estrategia);


  // 🗂️ Cria escopo inicial
  var scope = {
    init: config.init,
    candles,
    oper: {
      type: "none",
      timestamp: candles[0].time,
      price: 0,
      qty: 0,
      descr: ''
    },
    ...current,
    index: 0,
    buy: (qty: number) => {
      const result = execBuy(qty, scope);
      return qty;
    },    
    sell: (qty: number) => {
      const result = execSell(qty, scope);
      return qty;
    },
    reset: () => {
      execReset(scope);
    },
  };

  
  // 🔁 LOOP PRINCIPAL
  for (let i = 1; i < candles.length; i++) {
    // Para cada candle
    scope.anterior = candles[i - 1];
    scope.atual = candles[i];
    scope.index = i;
    scope.timestamp = scope.atual.time;

    scope.oper.type = 'none';
    scope.oper.timestamp = scope.atual.time,
    scope.oper.price = scope.atual.close

    // Avalia condições e executa ações
    for (const regra of config.estrategia) {
      try {
        const cond = avaliarCondicao(regra.condicao, scope);
        if (cond) {
          scope.oper.type = regra.type;
          scope.oper.descr = regra.descr;
          avaliarExpressao(regra.acao, scope);
        }

      } catch (err) {
        console.warn(`❌ Erro ao avaliar regra '${regra.descr}':`, err);
      }
    }

    operations.push( { ...scope.oper } );
  } // for candle
 
  // 📊 RESULTADOS DA SIMULAÇÃO
  return {
    initialUSDT: scope.saldoUSDT,
    initialSOL: scope.saldoSOL,
    finalUSDT: scope.saldoUSDT,
    finalSOL: scope.saldoSOL,
    //operations
  };
  */
}

// Exportar as funções auxiliares para testes
export { buy, sell, reset, resetR, resetS };
