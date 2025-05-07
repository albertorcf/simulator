import { RuleGroupType } from "react-querybuilder";

export const baseStrategy = {
  // Estado inicial da simulação
  init: [
    { name: "saldoUSDT", value: 100 },
    { name: "saldoSOL", value: 0.1 },
    { name: "delta", value: 1 },
    { name: "qty", value: 0.1 },      // qty a comprar e vender
    { name: "taxa", value: 0.001 },
    { name: "flagBuy", value: true },
    { name: "last", value: 1 },
    { name: "iddle", value: 10 },
    { name: "close", value: 0 },      // close price do candle; atualizar a cada iteração do loop
  ],

  // Campos usados nas condições
  varsCondition: [
    { name: "resistencia" },
    { name: "suporte" },
    { name: "atual.close" },
    { name: "index" },
    { name: "valorOp", expr: "close * qty" },       // campo calculado - valor da operação (atual.close * qty)
    { name: "tempoInativo", expr: "index - last" }  // campo calculado (index - last)
  ],

  // Campos/funções usados nas ações
  varsAction: [
    { name: "buy()" },
    { name: "sell()" },
    { name: "reset()", descr: "Recalcula suportes e resistências" }
  ],

  // Regras de decisão
  rules: [
    {
      type: "sell",
      descr: "VENDA se o preço romper resistência",
      condition: {
        combinator: "and",
        rules: [
          { field: "close", operator: ">=", valueSource: "field", value: "resistencia" },
          { field: "saldoSOL", operator: ">=", valueSource: "field", value: "qty" },
          { field: "flagBuy", operator: "==", valueSource: "value", value: false }
        ]
      } satisfies RuleGroupType,
      action: {
        combinator: "and",
        rules: [
          { field: "sell()", operator: "=", value: "" },
          { field: "flagBuy", operator: "=", value: true },
          { field: "reset()", operator: "=", value: "" },
          { field: "last", operator: "=", value: "index", valueSource: "field" }
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
              { field: "atual.close", operator: "<=", valueSource: "field", value: "suporte" },
              { field: "saldoUSDT", operator: ">=", valueSource: "field", value: "valorOp" },
              { field: "flagBuy", operator: "=", valueSource: "value", value: true }
            ]
          }
        ]
      } satisfies RuleGroupType,
      action: {
        combinator: "and",
        rules: [
          { field: "buy()", operator: "=", value: "" },
          { field: "flagBuy", operator: "=", value: false },
          { field: "reset()", operator: "=", value: "" },
          { field: "last", operator: "=", value: "index", valueSource: "field" }
        ]
      } satisfies RuleGroupType,
    },
    {
      type: "reset",
      descr: "RESET se tempo inativo for alto",
      condition: {
        combinator: "and",
        rules: [
          { field: "tempoInativo", operator: ">", valueSource: "value", value: 10 }
        ]
      } satisfies RuleGroupType,
      action: {
        combinator: "and",
        rules: [
          { field: "reset()", operator: "=", value: "" },
          { field: "last", operator: "=", value: "index", valueSource: "field" }
        ]
      } satisfies RuleGroupType,
    }
  ]
};