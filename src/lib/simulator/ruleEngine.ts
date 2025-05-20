// lib/simulator/ruleEngine.ts
// Engine para interpretar e executar condições e ações de regras/UDFs
import type { RuleGroupType, RuleGroupTypeAny } from "react-querybuilder";

/**
 * Avalia um RuleGroupType ou RuleGroupTypeAny sobre o escopo fornecido.
 * Retorna true se a condição for satisfeita, false caso contrário.
 */
export function evaluateRuleGroup(
  group: RuleGroupType | RuleGroupTypeAny,
  scope: any
): boolean {
  // Inicializa o resultado com base no combinator (short-circuit)
  const isAnd = group.combinator === "and";

  for (const rule of group.rules) {
    let result: boolean;

    if (typeof rule !== "object" || rule === null) {
      // Ignora strings ou placeholders. Ajuste conforme sua lógica (true ignora)
      result = true;
    }
    else if ('combinator' in rule && rule.rules) {
      // Subgrupo (recursivo!)
      result = evaluateRuleGroup(rule as RuleGroupTypeAny, scope);
    }
    else {
      // Regra simples
      const left = 'field' in rule ? scope[rule.field] : undefined;
      const right =
        'valueSource' in rule && rule.valueSource === "field"
          ? scope[rule.value]
          : 'value' in rule ? rule.value : undefined;

      if ('operator' in rule) {
        switch (rule.operator) {
          case "=": result = left == right; break;
          case "==": result = left == right; break;
          case "!=": result = left != right; break;
          case ">": result = left > right; break;
          case ">=": result = left >= right; break;
          case "<": result = left < right; break;
          case "<=": result = left <= right; break;
          default: result = false;
        }
      } else {
        result = false;
      }
    }

    // Short-circuit: Se já determinou o resultado final, retorna imediatamente
    // Em um AND, um único false define tudo
    if (isAnd && !result) return false;
    // Em um OR, um único true define tudo
    if (!isAnd && result) return true;

  } // for

  // Caso não haja short-circuit, retorna o valor padrão
  return isAnd; // true para AND (todos true, todas as condições atendidas), false para OR (todos false, nenhuma condição atendida)
}

/**
 * Executa um grupo de ações (RuleGroupType) sobre o escopo fornecido.
 * Pode suportar ações do tipo atribuição, chamada de função, etc.
 */
export function executeActions(
  actions: RuleGroupType | RuleGroupTypeAny,
  scope: any
): void {
  // TODO: Implementar lógica de execução de ações
}

/**
 * Avalia e executa todos os blocos de uma UDF.
 * Retorna true se algum bloco foi executado.
 */
export function runUdfBlocks(
  blocks: { condition: RuleGroupType; actions: RuleGroupType }[],
  scope: any
): boolean {
  // TODO: Implementar lógica para percorrer blocos, avaliar condição e executar ações
  return false;
}