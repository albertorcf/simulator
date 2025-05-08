// src/data/strategies/baseStrategy.ts
import { RuleGroupType } from "react-querybuilder";

export const baseStrategy = {
  // Campos usados nas condições e ações
  init: [     
    { name: "saldoUSDT", value: 100 },
    { name: "saldoSOL", value: 0.1 },
    { name: "delta", value: 1 },
    { name: "qty", value: 0.1 },       // qty a comprar e vender
    { name: "taxa", value: 0.001 },
    { name: "lastOp", value: "V" },    // última op de compra ou venda "C" | "V"
    { name: "candleOp", value: "I" },  // op do candle "C" | "V" | "R" (reset) | "I" (iddle)
    { name: "last", value: 1 },
    { name: "iddleInit", value: 10 },  // valor inicial de iddleCount
    { name: "iddleCount", value: 10 }, // contador de candles (time) inativos (nem compra nem venda)
    { name: "resistencia", value: 0 },
    { name: "suporte", value: 0 },
    { name: "close", value: 0 },      // close price do candle; atualizar a cada iteração do loop
    { name: "sellCount", value: 0},
    { name: "buyCount", value: 0 },
    { name: "opCount", value: 0 },
    { name: "last", value: 0 },
  ],

  // Campos usados apenas nas condições. Não são usados nas ações (readonly)! Atualizados no código!
  varsCondition: [
    { name: "index", value: 0 },                // index do loop de candles
    { name: "valorOp", expr: "close * qty" },   // campo calculado - valor da operação (close * qty)
    { name: "inativo", expr: "index - last" },  // tempo inativo - campo calculado (index - last)
  ],

  // Campos/funções usados apenas nas ações
  varsAction: [
    { name: "buy()",    descr: "Compra qty, atualiza saldoUSDT, saldoSOL, buyCount, lastOp, candleOp" },
    { name: "sell()",   descr: "Vende qty, atualiza saldoUSDT, saldoSOL, sellCount, lastOp, candleOp" },
    { name: "reset()",  descr: "Atualiza suporte e resistência para close -+ delta, candleOp = 'R'" },
    { name: "resetR()", descr: "Atualiza resistência para close + delta, candleOp = 'R'" },
    { name: "resetS()", descr: "Atualiza suporte para close - delta, candleOp = 'R'" },
  ],

  // Regras de decisão
  rules: [
    {
      type: "sell",
      descr: "VENDA se o preço romper resistência",
      condition: {
        combinator: "and",
        rules: [
          { field: "close",    operator: ">=", valueSource: "field", value: "resistencia" },
          { field: "saldoSOL", operator: ">=", valueSource: "field", value: "qty" },
          { field: "lastOp",   operator: "==", valueSource: "value", value: "C" }
        ]
      } satisfies RuleGroupType,
      action: {
        combinator: "and",
        rules: [
          { field: "sell()",  operator: "=", value: "" },
          { field: "reset()", operator: "=", value: "" },
        ]
      } satisfies RuleGroupType,
    },
    {
      type: "buy",  // ToDo: mover para cima de sell
      descr: "COMPRA se o preço cair abaixo do suporte",
      condition: {
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
      action: {
        combinator: "and",
        rules: [
          { field: "buy()",   operator: "=", value: "" },
          { field: "reset()", operator: "=", value: "" },
        ]
      } satisfies RuleGroupType,
    },
    {
      type: "reset",
      descr: "RESET se tempo inativo for alto",
      condition: {
        combinator: "and",
        rules: [
          { field: "iddleCount", operator: "<=", valueSource: "value", value: 0 }
        ]
      } satisfies RuleGroupType,
      action: {
        combinator: "and",
        rules: [
          { field: "reset()", operator: "=", value: "" },
        ]
      } satisfies RuleGroupType,
    }
  ]
};