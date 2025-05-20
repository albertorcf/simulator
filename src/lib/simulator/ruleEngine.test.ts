import { RuleGroupType } from "react-querybuilder";
import { evaluateRuleGroup, executeActions } from "./ruleEngine";

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

describe("executeActions", () => {
  it("deve atribuir valores diretos", () => {
    const scope = { a: 0, b: 0 };
    
    const actions: RuleGroupType = {
      combinator: "and",
      rules: [
        { field: "a", operator: "=", valueSource: "value", value: 10 },
        { field: "b", operator: "=", valueSource: "value", value: 20 }
      ]
    };
    
    executeActions(actions, scope);
    
    expect(scope.a).toBe(10);
    expect(scope.b).toBe(20);
  });
  
  it("deve atribuir valores referenciando outros campos", () => {
    const scope = { a: 10, b: 0, c: 0 };
    
    const actions: RuleGroupType = {
      combinator: "and",
      rules: [
        { field: "b", operator: "=", valueSource: "field", value: "a" },
        { field: "c", operator: "=", valueSource: "field", value: "b" }
      ]
    };
    
    executeActions(actions, scope);
    
    expect(scope.b).toBe(10); // b recebe valor de a
    expect(scope.c).toBe(10); // c recebe valor de b
  });
  
  it("deve avaliar expressões", () => {
    const scope = { a: 5, b: 10, resultado: 0 };
    
    const actions: RuleGroupType = {
      combinator: "and",
      rules: [
        { field: "resultado", operator: "=", valueSource: "value", value: "expr: a + b * 2" }
      ]
    };
    
    executeActions(actions, scope);
    
    expect(scope.resultado).toBe(25); // 5 + (10 * 2)
  });
  
  it("deve chamar funções do scope", () => {
    const mockFn = jest.fn();
    const scope = { resetar: mockFn };
    
    const actions: RuleGroupType = {
      combinator: "and",
      rules: [
        { field: "resetar()", operator: "=", valueSource: "value", value: "" }
      ]
    };
    
    executeActions(actions, scope);
    
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});