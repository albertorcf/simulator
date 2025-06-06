// apps/simulator/src/app/query-builder/page.tsx
"use client";
import { useState, useEffect } from "react";
import { RuleGroupType } from "react-querybuilder"; // Certifique-se que RuleType também seja importado se necessário ou usado internamente por RuleGroupType
import { QueryBuilderEditor, Listbox } from "visual-editor";

// Carrega a estratégia de exemplo
import { baseStrategy } from "@/data/strategies/baseStrategy";

// Define a type for the items in the 'vars' array
interface VarItem {
  name: string;
  type: string;
  expr?: string;
  value?: string | number | boolean; // Ajuste este tipo se 'value' puder ter outros tipos
}

// 1. Renomeie as importações originais para evitar conflito
const { vars: originalVars, rules: originalRules } = baseStrategy;

// 2. Defina uma interface para as regras que o componente usará,
//    garantindo que condition e action sejam RuleGroupType.
interface ComponentRule {
  descr: string; // Mantenha outras propriedades que suas regras possuem
  // Adicione aqui outras propriedades que existem em cada objeto de 'originalRules'
  // Exemplo: id?: string | number;
  condition: RuleGroupType;
  action: RuleGroupType;
}

// 3. Crie o novo array 'rules' para ser usado pelo componente.
//    Mapeie 'originalRules' para 'ComponentRule[]', fazendo um type assertion
//    para 'condition' e 'action'.
const rules: ComponentRule[] = originalRules.map(rule => ({
  ...rule, // Isso copia todas as propriedades da regra original
  condition: rule.condition as RuleGroupType, // Assegura que 'condition' é tratada como RuleGroupType
  action: rule.action as RuleGroupType,     // Assegura que 'action' é tratada como RuleGroupType
}));

// 4. Use 'originalVars' para definir init, varsCondition, varsAction
const init: VarItem[] = (originalVars as VarItem[]).filter(v => v.type === "state" || v.type === "candle");
const varsCondition: VarItem[] = (originalVars as VarItem[]).filter(v => v.type === "computed" && !v.name.endsWith("()"));
const varsAction: VarItem[] = (originalVars as VarItem[]).filter(v => v.type === "action");

console.log('vars =', originalVars); // Use originalVars para logging se desejar
console.log('init =', init);
console.log('varsCondition =', varsCondition);
console.log('varsAction =', varsAction);
console.log('rules (component) =', rules); // Este é o array 'rules' que o componente usará

const actionOperators = [
  { name: "=", label: "=" },
  //{ name: "+=", label: "+=" },
  //{ name: "-=", label: "-=" },
  //{ name: "*=", label: "*=" },
  //{ name: "/=", label: "/=" },
];

export default function QueryBuilderPage() {

  const [selectedRuleIndex, setSelectedRuleIndex] = useState(0);

  // Agora, rules[selectedRuleIndex].condition e .action são do tipo RuleGroupType,
  // tornando a inicialização e as atribuições subsequentes compatíveis.
  const [condQuery, setCondQuery] = useState<RuleGroupType>(
    rules[selectedRuleIndex].condition
  );

  const [actionQuery, setActionQuery] = useState<RuleGroupType>(
    rules[selectedRuleIndex].action
  );

  useEffect(() => {
    setCondQuery(rules[selectedRuleIndex].condition);
    setActionQuery(rules[selectedRuleIndex].action);
  }, [selectedRuleIndex]);

  function handleSelectRule(newIndex: number) {
    // Esta atribuição agora é válida porque ambos os lados da atribuição
    // (rules[selectedRuleIndex].condition e condQuery) são do tipo RuleGroupType.
    rules[selectedRuleIndex].condition = condQuery;
    rules[selectedRuleIndex].action = actionQuery;

    // Muda o índice selecionado
    setSelectedRuleIndex(newIndex);
  }

  function buildFieldList(rawFields: string[]): { name: string; label: string; valueSources: string[] }[] {
    return rawFields.map((name) => ({
      name,
      label: name,
      valueSources: name.endsWith("()") ? ['value'] : ['value', 'field'],
    }));
  }

  return (
    <main className="flex flex-col gap-4 w-full max-w-none px-4 sm:px-6 mx-auto">

      <h1 className="text-2xl font-bold mb-2">Query Builder Editor</h1>

      <div className="flex flex-col lg:flex-row gap-6 mb-4 h-37 w-full">

        {/* Listbox de regras (selecionável) */}
        <div className="flex-1">
          <h2 className="mb-1 font-semibold">Regras</h2>
          <Listbox 
            className="rounded border bg-white h-37"
            items={rules.map((r) => r.descr)}
            selectedIndex={selectedRuleIndex}
            onSelect={handleSelectRule}
          />
        </div>

        {/* Listbox de variáveis da condição */}
        <div className="flex-1">
          <h2 className="mb-1 font-semibold">Variáveis da Condição</h2>
          <Listbox
            className="rounded border bg-white"
            headers={["Nome", "Valor", "Expr"]}
            items={[...init, ...varsCondition].map((v: VarItem) => [
              v.name,
              v.value !== undefined ? String(v.value) : "",
              v.expr ?? ""
            ])}
          />
        </div>

        {/* Listbox de variáveis da ação */}
        <div className="flex-1">
          <h2 className="mb-1 font-semibold">Variáveis da Ação</h2>
          <Listbox
            className="rounded border bg-white"
            headers={["Nome", "Valor", "Expr"]}
            items={[...init, ...varsAction].map((v: VarItem) => [
              v.name,
              v.value !== undefined ? String(v.value) : "",
              v.expr ?? ""
            ])}
          />
        </div>
      </div>


      <div className="flex flex-col lg:flex-row gap-4 w-full">
        {/* Editor de Condição */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-1">Editor de Condição</h2>
          <QueryBuilderEditor
            fields={buildFieldList([
              ...init.map((v) => v.name),
              ...varsCondition.map((v) => v.name)
            ])}
            query={condQuery}
            onQueryChange={setCondQuery}
          />
        </div>

        {/* Editor de Ação */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-1">Editor de Ação</h2>
          <QueryBuilderEditor
            fields={buildFieldList([
              ...init.map((v) => v.name),
              ...varsAction.map((v) => v.name)
            ])}
            query={actionQuery}
            onQueryChange={setActionQuery}
            className="bg-red-50"
            operators={actionOperators}
          />
        </div>
      </div>


      {/* Área de visualização do JSON gerado */}
      <div className="flex flex-col lg:flex-row gap-4 mt-1">

        {/* Coluna 1: JSON Condição */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-1">JSON Condição:</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs">
            {JSON.stringify(condQuery, null, 2)}
          </pre>
        </div>

        {/* Coluna 2: JSON Ação */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-1">JSON ação:</h2>
          <pre className="bg-red-50 p-4 rounded text-xs">
            {JSON.stringify(actionQuery, null, 2)}
          </pre>
        </div>


      </div>
    </main>
  );
}