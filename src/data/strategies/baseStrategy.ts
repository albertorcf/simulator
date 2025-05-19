// src/data/strategies/baseStrategy.ts
import { RuleGroupType } from "react-querybuilder";
//import { Field } from 'react-querybuilder';

export const baseStrategy = {
  // Todas as variáveis e funções em uma única seção "vars"
  vars: [
    // State
    { name: "saldoUSDT",  value: 100,   type: "state" },
    { name: "saldoSOL",   value: 1,     type: "state" },
    { name: "delta",      value: 1,     type: "state" },
    { name: "qty",        value: 0.1,   type: "state" },
    { name: "taxa",       value: 0.001, type: "state" },
    { name: "lastOp",     value: "V",   type: "state" },
    { name: "candleOp",   value: "I",   type: "state" },
    { name: "last",       value: 1,     type: "state" },
    { name: "iddleInit",  value: 10,    type: "state" },
    { name: "iddleCount", value: 10,    type: "state" },
    { name: "sellCount",  value: 0,     type: "state" },
    { name: "buyCount",   value: 0,     type: "state" },
    { name: "opCount",    value: 0,     type: "state" },
    { name: "last",       value: 0,     type: "state" },

    // Candle
    { name: "close", value: 0, type: "candle" },
    { name: "index", value: 0, type: "candle" },
    { name: "time",  value: 0, type: "candle" },

    // Computed
    { name: "resistencia",  value: 0, type: "computed" },
    { name: "suporte",      value: 0, type: "computed" },
    { name: "valorOp",      expr: "close * qty", type: "computed" },
    { name: "inativo",      expr: "index - last", type: "computed" },

    // Funções (exemplo!!!)
    {
      name: "rsi()",
      descr: "Retorna o valor do RSI calculado para o candle atual",
      type: "state",
      datatype: "number",
      sideEffect: false
    },

    // Funções (ações)
    { 
      name: "buy()", 
      descr: "Compra qty, atualiza saldoUSDT, saldoSOL, buyCount, lastOp, candleOp", 
      type: "function",
      datatype: "void",
      sideEffect: true,
    },
    { 
      name: "sell()",
      descr: "Vende qty, atualiza saldoUSDT, saldoSOL, sellCount, lastOp, candleOp",
      type: "function",
      datatype: "void",
      sideEffect: true,
    },
    { 
      name: "reset()",  
      descr: "Atualiza suporte e resistência para close -+ delta, candleOp = 'R'", 
      type: "function", 
      datatype: "void", 
      sideEffect: true,
    },
    { 
      name: "resetR()", 
      descr: "Atualiza resistência para close + delta, candleOp = 'R'", 
      type: "function", 
      datatype: "void", 
      sideEffect: true,
    },
    { 
      name: "resetS()", 
      descr: "Atualiza suporte para close - delta, candleOp = 'R'", 
      type: "function", 
      datatype: "void", 
      sideEffect: true,
    },
  ],

  // Regras de decisão permanecem iguais
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
          { field: "sell()",  operator: "function", value: "" },
          { field: "reset()", operator: "function", value: "" },
        ]
      } satisfies RuleGroupType,
    },
    {
      type: "buy",
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