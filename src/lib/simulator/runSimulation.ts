// frontend/src/lib/simulator/runSimulation.ts
import { avaliarExpressao, avaliarCondicao } from "@/utils/evalExpr";
import { Candle } from '@/types/types';

export type RunSimulationParams = {
  candles: Candle[];
  strategyData: any; // JSON vindo da textarea
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
 * Funções desacopladas chamadas nas condições e ações de forma simples, 
 * somente com os parâmetros principais.
 * Em scope são criadas (closures) através de funções adaptadoras (wrappers functions),
 * que passam o parâmetro scope para acesso ao contexto dentro da função desacoplada.
 */

function execReset(scope: any) {
  const close = scope.atual.close;
  const delta = scope.delta;
  scope.resistencia = close + delta;
  scope.suporte = close - delta;

  scope.oper.R = scope.resistencia;
  scope.oper.S = scope.suporte;
}

/**
 * qty     = quantidade de SOL que você quer negociar
 * price   = preço do candle (USDT por SOL)
 * feeRate = 0.001  // 0 ,1 %
 */
function execBuy(qty: number, scope: any) {
  const atual   = scope.atual;
  const feeRate = scope.taxa || 0.001;
  const price   = atual.close;

  const feeSOL = qty * feeRate;    // taxa cobrada em SOL
  const netSOL = qty - feeSOL;     // SOL realmente creditado
  const costUSD = qty * price;     // USDT que sai da conta

  // Atualizar tanto o current quanto o scope
  scope.saldoSOL += netSOL;
  scope.saldoUSDT -= costUSD;

  // ToDo: retornar taxas calculadas para totalização
  scope.oper.timestamp = atual.time;
  scope.oper.price = price;
  scope.oper.qty = netSOL;
  scope.oper.R = scope.resistencia;
  scope.oper.S = scope.suporte;
}

function execSell(qty: number, scope: any) {
  const atual = scope.atual;
  const feeRate = scope.taxa || 0.001;
  const price = atual.close;

  const grossUSD = qty * price;         // USDT que você *receberia*
  const feeUSD = grossUSD * feeRate;    // taxa cobrada em USDT
  const netUSD = grossUSD - feeUSD;     // USDT realmente creditado

  // Atualizar tanto o current quanto o scope
  scope.saldoSOL -= qty;
  scope.saldoUSDT += netUSD;

  // ToDo: retornar taxas calculadas para totalização
  scope.oper.timestamp = atual.time;
  scope.oper.price = price;
  scope.oper.qty = qty;
  scope.oper.R = scope.resistencia;
  scope.oper.S = scope.suporte;
}


export function runSimulation(params: RunSimulationParams): SimulationResult | null {
  const { candles, strategyData: config } = params;

  // 🧪 INICIALIZAÇÃO
  // Validação da estrutura da configuração
  if (!config.init || typeof config.init !== 'object') {
    console.error("❌ Configuração inválida: campo 'init' é obrigatório.");
    return null;
  }
  if (!Array.isArray(config.estrategia)) {
    console.error("❌ Configuração inválida: campo 'estrategia' deve ser uma lista.");
    return null;
  }

  // Configuração dos valores iniciais
  const current = structuredClone(config.init);

  // Definir suporte e resistência se não foram especificados
  current.suporte = current.suporte || (candles[0].close - current.delta);
  current.resistencia = current.resistencia || (candles[0].close + current.delta);

  // Taxa de operação
  const taxa = parseTaxa(config.init.taxa ?? 0.001);

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
    initialUSDT: config.init.saldoUSDT,
    initialSOL: config.init.saldoSOL,
    finalUSDT: scope.saldoUSDT,
    finalSOL: scope.saldoSOL,
    operations
  };
}