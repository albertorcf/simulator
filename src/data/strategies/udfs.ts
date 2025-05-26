// data/strategies/udfs.ts
import { RuleGroupType } from "react-querybuilder";

export type UdfBlock = {
  descr: string;
  condition: RuleGroupType;
  actions: RuleGroupType;
};

export type UserDefinedFunction = {
  name: string;
  descr: string;
  blocks: UdfBlock[];
};

export const userDefinedFunctions: UserDefinedFunction[] = [
  {
    name: "reset",
    descr: "Atualiza suporte e resistência para close -+ delta, candleOp = 'R' se 'I'",
    blocks: [
      {
        descr: "Bloco 1: Atualiza S/R e iddleCount",
        condition: {
          combinator: "and",
          rules: [
            { field: "true", operator: "=", valueSource: "value", value: true }
          ]
        },
        actions: {
          combinator: "and",
          rules: [
            { field: "resistencia", operator: "=", valueSource: "value", value: "expr: close + delta" },
            { field: "suporte", operator: "=", valueSource: "value", value: "expr: close - delta" },
            { field: "opResistencia", operator: "=", valueSource: "field", value: "resistencia" },
            { field: "opSuporte", operator: "=", valueSource: "field", value: "suporte" },
            { field: "iddleCount", operator: "=", valueSource: "field", value: "iddleInit" },
            // { field: "break", operator: "=", valueSource: "value", value: "true" }, // break é específico da regra principal, não da UDF em si
            { field: "returnValue", operator: "=", valueSource: "value", value: "true" },
          ]
        }
      },
      {
        descr: "Bloco 2: Atualiza candleOp e opType se candleOp era 'I'",
        condition: {
          combinator: "and",
          rules: [
            { field: "candleOp", operator: "=", valueSource: "value", value: "I" }
          ]
        },
        actions: {
          combinator: "and",
          rules: [
            { field: "candleOp", operator: "=", value: "R" },
            { field: "opType", operator: "=", value: "reset" }
          ]
        }
      }
    ]
  },

  {
    name: "buy",
    descr: "Executa uma operação de compra, atualizando saldos e registrando a operação.",
    blocks: [
      {
        descr: "Bloco principal de compra",
        condition: { // Condição sempre verdadeira, a lógica de quando comprar fica na estratégia principal
          combinator: "and",
          rules: [
            { field: "true", operator: "=", valueSource: "value", value: true }
          ]
        },
        actions: {
          combinator: "and",
          rules: [
            // Cálculos e atualizações de saldo
            // Taxa cobrada em SOL
            // feeSOL = qty * taxa; netSOL = qty - feeSOL; costUSD = qty * close;
            // saldoSOL += netSOL; saldoUSDT -= costUSD;
            { field: "saldoSOL", operator: "=", valueSource: "value", value: "expr: saldoSOL + (qty - (qty * taxa))" },
            { field: "saldoUSDT", operator: "=", valueSource: "value", value: "expr: saldoUSDT - (qty * close)" },

            // Atualizações de estado
            { field: "lastOp", operator: "=", valueSource: "value", value: "C" },
            { field: "candleOp", operator: "=", valueSource: "value", value: "C" },
            { field: "iddleCount", operator: "=", valueSource: "field", value: "iddleInit" },

            // Registro da operação
            { field: "opType", operator: "=", valueSource: "value", value: "buy" },
            { field: "opTimestamp", operator: "=", valueSource: "field", value: "time" },
            { field: "opPrice", operator: "=", valueSource: "field", value: "close" },
            { field: "opQty", operator: "=", valueSource: "value", value: "expr: qty - (qty * taxa)" }, // netSOL
            { field: "opResistencia", operator: "=", valueSource: "field", value: "resistencia" },
            { field: "opSuporte", operator: "=", valueSource: "field", value: "suporte" },

            // Definir um valor de retorno se necessário, ou deixar undefined
            { field: "returnValue", operator: "=", valueSource: "value", value: true }
          ]
        }
      }
    ]
  },
  {
    name: "sell",
    descr: "Executa uma operação de venda, atualizando saldos e registrando a operação.",
    blocks: [
      {
        descr: "Bloco principal de venda",
        condition: { // Condição sempre verdadeira, a lógica de quando vender fica na estratégia principal
          combinator: "and",
          rules: [
            { field: "true", operator: "=", valueSource: "value", value: true }
          ]
        },
        actions: {
          combinator: "and",
          rules: [
            // Cálculos e atualizações de saldo
            // Taxa cobrada em USDT
            // grossUSD = qty * close; feeUSD = grossUSD * taxa; netUSD = grossUSD - feeUSD;
            // saldoSOL -= qty; saldoUSDT += netUSD;
            { field: "saldoSOL", operator: "=", valueSource: "value", value: "expr: saldoSOL - qty" },
            { field: "saldoUSDT", operator: "=", valueSource: "value", value: "expr: saldoUSDT + ((qty * close) - ((qty * close) * taxa))" },

            // Atualizações de estado
            { field: "lastOp", operator: "=", valueSource: "value", value: "V" },
            { field: "candleOp", operator: "=", valueSource: "value", value: "V" },
            { field: "iddleCount", operator: "=", valueSource: "field", value: "iddleInit" },

            // Registro da operação
            { field: "opType", operator: "=", valueSource: "value", value: "sell" },
            { field: "opTimestamp", operator: "=", valueSource: "field", value: "time" },
            { field: "opPrice", operator: "=", valueSource: "field", value: "close" },
            { field: "opQty", operator: "=", valueSource: "field", value: "qty" }, // Na venda, opQty é a quantidade bruta vendida
            { field: "opResistencia", operator: "=", valueSource: "field", value: "resistencia" },
            { field: "opSuporte", operator: "=", valueSource: "field", value: "suporte" },

            // Definir um valor de retorno se necessário
            { field: "returnValue", operator: "=", valueSource: "value", value: true }
          ]
        }
      }
    ]
  },
  {
    name: "exemplo2",
    descr: "Exemplo de outra função UDF",
    blocks: [
      {
        descr: "Bloco único",
        condition: {
          combinator: "and",
          rules: [
            { field: "delta", operator: "<=", valueSource: "value", value: 10 }
          ]
        },
        actions: {
          combinator: "and",
          rules: [
            { field: "suporte", operator: "=", valueSource: "value", value: 5 }
          ]
        }
      }
    ]
  }
];