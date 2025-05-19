// apps/simulator/src/app/udf/page.tsx
"use client";
import { useState } from "react";
import { RuleGroupType } from "react-querybuilder";
import { QueryBuilderEditor } from "visual-editor";

/*
Simular essa função no QueryBuilderEditor:

function reset(scope: any) {
  const close = scope.close;
  const delta = scope.delta;
  scope.resistencia = close + delta;
  scope.suporte = close - delta;

  scope.iddleCount = scope.iddleInit;  // zera contador de iterações iddle (inativas)
  
  if (scope.candleOp === 'I') {
    scope.candleOp = "R";
    scope.op.type = 'reset';
  }
  scope.op.R = scope.resistencia;
  scope.op.S = scope.suporte;
}
*/

type UserDefinedFunction = {
  name: string;
  descr: string;
  query: RuleGroupType;
};

const userDefinedFunctions: UserDefinedFunction[] = [
  {
    name: "reset",
    descr: "Atualiza suporte e resistência para close -+ delta, candleOp = 'R'",
    query: {
      combinator: "and",
      rules: [
        // Exemplo de regra, adapte conforme necessário
        { field: "close", operator: ">=", valueSource: "field", value: "resistencia" }
      ]
    },
  }
];

// Campos de exemplo (ajuste conforme seu contexto real)
const fields = [
  { name: "close", label: "close" },
  { name: "delta", label: "delta" },
  { name: "resistencia", label: "resistencia" },
  { name: "suporte", label: "suporte" },
  { name: "candleOp", label: "candleOp" },
  { name: "iddleCount", label: "iddleCount" },
]

export default function UdfPage() {
  const [udf, setUdf] = useState<UserDefinedFunction>(userDefinedFunctions[0]);

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Teste de User Defined Function: <span className="text-blue-700">{udf.name}</span></h1>
      <p className="mb-4 text-gray-700">{udf.descr}</p>
      <QueryBuilderEditor
        fields={fields}
        query={udf.query}
        onQueryChange={q => setUdf({ ...udf, query: q })}
      />

      {/* Visualização da query em JSON */}
      <div className="mt-6">
        <div className="font-semibold mb-1">Query (JSON):</div>
        <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto">
          {JSON.stringify(udf.query, null, 2)}
        </pre>
      </div>
      
      {/* Aqui você pode adicionar botões para salvar, testar, etc */}
      
    </main>
  );
}