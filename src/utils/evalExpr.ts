// frontend/src/utils/evalExpr.ts

/**
 * Executa uma expressão JS em contexto isolado usando `new Function` com `with(ctx)`.
 * NÃO usar com entradas públicas. Seguro para uso controlado.
 */
export function runExpr(expr: string, ctx: Record<string, any>): any {
  try {
    const fn = new Function("ctx", `with (ctx) { ${expr} }`);
    return fn(ctx);
  } catch (e) {
    console.warn("❌ Erro ao avaliar expressão:", expr, "\nDetalhes:", e);
    return undefined;
  }
}

export function evalExpr(expr: string, ctx: Record<string, any>): boolean {
  try {
    const fn = new Function("ctx", `with (ctx) { return (${expr}); }`);
    return fn(ctx);
  } catch (e) {
    console.warn("❌ Erro ao avaliar condicao:", expr, "\nDetalhes:", e);
    return false;
  }
}

