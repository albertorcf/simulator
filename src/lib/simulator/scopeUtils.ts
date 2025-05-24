// lib/simulator/scopeUtils.ts
import { evalExpr } from "@/utils/evalExpr";
import { UserDefinedFunction } from "@/data/strategies/udfs"; // Importar o tipo
import { runUdf } from "@/lib/simulator/ruleEngine"; // Importar runUdf

export function buildScopeFromVars(vars: any[]): Record<string, any> {
  const scope: Record<string, any> = {};
  for (const v of vars) {
    if (v.type === "state" || v.type === "candle") {
      scope[v.name] = v.value;
    } else if (v.type === "computed" && v.value !== undefined) {
      scope[v.name] = v.value;
    } else if (v.type === "computed" && v.expr) {
      try {
        scope[v.name] = evalExpr(v.expr, scope);
      } catch (e) {
        console.warn(`❌ Erro ao avaliar expressão para ${v.name}:`, e);
        scope[v.name] = null;
      }
    }
    // Funções podem ser adicionadas aqui se necessário
  }
  return scope;
}

export function addUdfsToScope(scope: Record<string, any>, udfs: UserDefinedFunction[]): void {
  for (const udf of udfs) {
    // O nome da UDF vira uma função no scope
    scope[udf.name] = () => {
        // Limpa o returnValue antes de cada execução da UDF
      scope.returnValue = undefined;
      runUdf(udf.blocks, scope); // runUdf opera sobre o 'scope'
      return scope.returnValue;
    };
  }
}