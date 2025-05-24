// apps/simulator/src/app/udf/page.tsx
"use client";
import { useState } from "react";
import { RuleGroupType } from "react-querybuilder";
import { QueryBuilderEditor, Listbox } from "visual-editor";
import { evaluateRuleGroup, executeActions, runUdf } from "@/lib/simulator/ruleEngine";
import { userDefinedFunctions, UserDefinedFunction, UdfBlock } from "@/data/strategies/udfs";
import { buildScopeFromVars } from "@/lib/simulator/scopeUtils";
import { baseStrategy } from "@/data/strategies/baseStrategy"; // <-- adicione esta linha

// Use vars do baseStrategy para montar os fields e o scope de teste
const vars = baseStrategy.vars;

// Gera os fields para o QueryBuilderEditor a partir de vars
const fields = vars.map(v => ({
  name: v.name,
  label: v.name
}));

// Monta o scope de teste a partir de vars
const testScope = buildScopeFromVars(vars);

export default function UdfPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [udfs, setUdfs] = useState<UserDefinedFunction[]>(userDefinedFunctions);

  const udf = udfs[selectedIdx];

  const [selectedBlockIdx, setSelectedBlockIdx] = useState(0);

  const block = udf.blocks[selectedBlockIdx];

  // Atualiza a condição do bloco selecionado
  const handleConditionChange = (q: RuleGroupType) => {
    setUdfs(udfs.map((udfItem, udfIdx) =>
      udfIdx === selectedIdx
        ? {
          ...udfItem,
          blocks: udfItem.blocks.map((b, bIdx) =>
            bIdx === selectedBlockIdx ? { ...b, condition: q } : b
          )
        }
        : udfItem
    ));
  };

  // Atualiza as ações do bloco selecionado
  const handleActionsChange = (q: RuleGroupType) => {
    setUdfs(udfs.map((udfItem, udfIdx) =>
      udfIdx === selectedIdx
        ? {
          ...udfItem,
          blocks: udfItem.blocks.map((b, bIdx) =>
            bIdx === selectedBlockIdx ? { ...b, actions: q } : b
          )
        }
        : udfItem
    ));
  };

  // Quando trocar de função, resetar o bloco selecionado para o primeiro
  const handleSelectUdf = (idx: number) => {
    setSelectedIdx(idx);
    setSelectedBlockIdx(0);
  };

  // ======================
  // Avaliar/executar rules
  // ======================

  // Estado para mostrar o resultado do teste
  const [testResult, setTestResult] = useState<null | boolean>(null);

  // Função para testar a condição do bloco selecionado
  const handleTestCondition = () => {
    const result = evaluateRuleGroup(block.condition, testScope);
    setTestResult(result);
  };

  // =======================
  // Testar executar actions
  // =======================

  // Novo estado para armazenar o resultado da execução das ações
  const [actionResult, setActionResult] = useState<Record<string, any> | null>(null);

  // Função para testar as ações do bloco selecionado
  const handleTestActions = () => {
    // Cria uma cópia do scope para não afetar o original
    const testScopeCopy = { ...testScope };

    // Executa as ações no scope copiado
    executeActions(block.actions, testScopeCopy);

    // Atualiza o estado com o resultado
    setActionResult(testScopeCopy);
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      
      {/* Listboxs e botão run UDF */}
      <div className="flex flex-row gap-4 mb-2">
        {/* Coluna 1: Função */}
        <div>
          <div className="font-semibold mb-1">Função:</div>
            <div className="h-38">
              <Listbox
                className="w-48 rounded border bg-white"
                items={udfs.map(u => u.name)}
                selectedIndex={selectedIdx}
                onSelect={handleSelectUdf}
              />
            </div>
        </div>
        {/* Coluna 2: Bloco */}
        <div>
          <div className="font-semibold mb-1">Bloco:</div>
            <div className="h-38">
              <Listbox
                className="w-48 rounded border bg-white"
                items={udf.blocks.map(b => b.descr)}
                selectedIndex={selectedBlockIdx}
                onSelect={setSelectedBlockIdx}
              />
            </div>
        </div>
        {/* Coluna 3: Botão Executar UDF e resultado */}
        <div className="flex flex-col items-start justify-start gap-2">
          <button
            className="px-3 py-1 rounded bg-green-600 text-white"
            onClick={() => {
              const testScopeCopy = { ...testScope };
              // Chama a UDF completa
              runUdf(udf.blocks, testScopeCopy);
              setActionResult(testScopeCopy);
            }}
          >
            Executar UDF completa
          </button>
          {/* Mostra o returnValue e variáveis alteradas */}
          {actionResult && (
            <div className="text-xs mt-1">
              <div>
                <span className="font-semibold">returnValue:</span>{" "}
                <span className="text-blue-700">{JSON.stringify(actionResult.returnValue)}</span>
              </div>
              <div className="mt-1">
                <span className="font-semibold">Alterados:</span>
                <ul className="list-disc ml-4">
                  {Object.entries(actionResult)
                    .filter(([key, value]) =>
                      key !== "returnValue" &&
                      (!(key in testScope) || JSON.stringify(testScope[key as keyof typeof testScope]) !== JSON.stringify(value))
                    )
                    .map(([key, value]) => (
                      <li key={key}>
                        <span className="text-gray-600">{key}:</span>{" "}
                        <span className="text-green-700">{JSON.stringify(value)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-1">
        Função: <span className="text-blue-700">{udf.name}</span>
      </h1>
      <p className="mb-2 text-gray-700">{udf.descr}</p>
      <h2 className="text-lg font-semibold mb-1">
        Bloco: <span className="text-blue-700">{block.descr}</span>
      </h2>

      <div className="mb-2">
        <div className="font-semibold mb-1">Condição</div>
        <QueryBuilderEditor
          fields={fields}
          query={block.condition}
          onQueryChange={handleConditionChange}
        />
        <button
          className="mt-2 px-3 py-1 rounded bg-blue-600 text-white"
          onClick={handleTestCondition}
        >
          Testar condição
        </button>
        {testResult !== null && (
          <span className="ml-4 align-middle">
            <span className="font-semibold">Resultado do teste:</span>{" "}
            <span className={testResult ? "text-green-600" : "text-red-600"}>
              {testResult ? "Verdadeiro" : "Falso"}
            </span>
          </span>
        )}
      </div>
      
      {/* Ações */}
      <div className="mb-2">
        <div className="font-semibold mb-1">Ações</div>
        <QueryBuilderEditor
          fields={fields}
          query={block.actions}
          onQueryChange={handleActionsChange}
          className="bg-red-100"
        />
        <button
          className="mt-2 px-3 py-1 rounded bg-blue-600 text-white"
          onClick={handleTestActions}
        >
          Testar ações
        </button>
      </div>

      {/* Visualização do resultado da execução das ações */}
      {actionResult && (
        <div className="mt-3 mb-4">
          <div className="font-semibold mb-1">Variáveis alteradas/criadas:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
            {Object.entries(actionResult)
              .filter(([key, value]) =>
                !(key in testScope) || JSON.stringify(testScope[key as keyof typeof testScope]) !== JSON.stringify(value)
              )
              .map(([key, value]) => {
                const oldValue = key in testScope ? testScope[key as keyof typeof testScope] : "<não existia>";
                return (
                  <div key={key} className="p-1 rounded bg-yellow-100 font-medium flex items-center gap-1">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-blue-700">{JSON.stringify(oldValue)}</span>
                    <span className="mx-1">➡️</span>
                    <span className="text-green-700">{JSON.stringify(value)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}


      {/* Visualização da query em JSON */}
      <div className="mt-1">
        <div className="font-semibold mb-1">Bloco (JSON):</div>
        <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto">
          {JSON.stringify(block, null, 2)}
        </pre>
      </div>
    </main>
  );

}