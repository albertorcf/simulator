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
        descr: "Bloco 1",
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
            { field: "break", operator: "=", valueSource: "value", value: "true" },
            { field: "returnValue", operator: "=", valueSource: "value", value: "true" },
          ]
        }
      },
      {
        descr: "Bloco 2",
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