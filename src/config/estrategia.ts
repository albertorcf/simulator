export default {
  // Configuração dos candles
  candles: {
    start: "-7d",
    end: "now"
  },

  // Estado inicial da simulação
  init: {
    saldoUSDT: 100,
    saldoSOL: 0.1,
    delta: 1,
    qty: 0.1,
    taxa: 0.001,
    flagBuy: true,
    last: 1,
    iddle: 10
  },

  // Regras da estratégia
  estrategia: [
    {
      type: "sell",
      descr: "VENDA se o preço romper resistência",
      condicao: "(atual.close >= resistencia && saldoSOL >= qty && !flagBuy)",
      acao: "sell(qty); flagBuy = true; reset(); last = index;"
    },
    {
      type: "buy",
      descr: "COMPRA se o preço cair abaixo do suporte",
      condicao: "index == 1 || (atual.close <= suporte && saldoUSDT >= atual.close * qty && flagBuy)",
      acao: "buy(qty); flagBuy = false; reset(); last = index;"
    },
    {
      type: "reset",
      descr: "RESET S e R se ficar muito tempo sem comprar e vender",
      condicao: "(index - last) > iddle",
      acao: "reset(); last = index;"
    }
  ]
}
