import { RuleGroupType } from "react-querybuilder";
import { evaluateRuleGroup } from "./ruleEngine";

describe("evaluateRuleGroup", () => {
  it("deve retornar true para grupo AND com todas as condições verdadeiras", () => {
    const scope = { a: 5, b: 10 };
    const group: RuleGroupType = {
      combinator: "and",
      rules: [
        { field: "a", operator: ">=", valueSource: "value", value: 5 },
        { field: "b", operator: "<", valueSource: "value", value: 20 }
      ]
    };
    expect(evaluateRuleGroup(group, scope)).toBe(true);
  });
});