// apps/simulator/src/app/udf/page.tsx
"use client";
import { useState } from "react";
import { RuleGroupType } from "react-querybuilder";
import { QueryBuilderEditor, Listbox } from "visual-editor";

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
  },
  {
    name: "exemplo2",
    descr: "Exemplo de outra função UDF",
    query: {
      combinator: "and",
      rules: [
        { field: "delta", operator: "<=", valueSource: "value", value: 10 }
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
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [udfs, setUdfs] = useState<UserDefinedFunction[]>(userDefinedFunctions);

  const udf = udfs[selectedIdx];

  // Atualiza a query da UDF selecionada
  const handleQueryChange = (q: RuleGroupType) => {
    setUdfs(udfs.map((item, idx) =>
      idx === selectedIdx ? { ...item, query: q } : item
    ));
  };

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="mb-4">
        <div className="font-semibold mb-1">Selecione a função:</div>
        <Listbox
          items={udfs.map(u => u.name)}
          selectedIndex={selectedIdx}
          onSelect={setSelectedIdx}
          className="w-full max-w-xs"
        />
      </div>

      <h1 className="text-2xl font-bold mb-4">
        Teste de User Defined Function: <span className="text-blue-700">{udf.name}</span>
      </h1>
      
      <p className="mb-4 text-gray-700">{udf.descr}</p>
      <QueryBuilderEditor
        fields={fields}
        query={udf.query}
        onQueryChange={handleQueryChange}
      />

      {/* Visualização da query em JSON */}
      <div className="mt-6">
        <div className="font-semibold mb-1">Query (JSON):</div>
        <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto">
          {JSON.stringify(udf.query, null, 2)}
        </pre>
      </div>
    </main>
  );
}