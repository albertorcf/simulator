"use client";
import { useState, useEffect, Fragment } from "react";
import { RuleGroupType } from "react-querybuilder";
import { QueryBuilderEditor, Listbox } from "visual-editor";

// Carrega a estratégia de exemplo
import { baseStrategy } from "@/data/strategies/baseStrategy";
const { init, varsCondition, varsAction, rules } = baseStrategy;
console.log('init =', init)
console.log('varsCondition =', varsCondition)
console.log('varsAction =', varsAction)
console.log('rules =', rules)

const actionOperators = [
  { name: "=", label: "=" },
  //{ name: "+=", label: "+=" },
  //{ name: "-=", label: "-=" },
  //{ name: "*=", label: "*=" },
  //{ name: "/=", label: "/=" },
];

export default function QueryBuilderPage() {
  const [query, setQuery] = useState<RuleGroupType>({
    combinator: "and",
    rules: [],
  });

  const [action, setAction] = useState<RuleGroupType>({
    combinator: "and",
    rules: [],
  });

  const [selectedCondition, setSelectedCondition] = useState<string | null>(
    null
  );
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCondition) {
      const condition = varsCondition.find(
        (condition) => condition.name === selectedCondition
      );
      if (condition) {
        setQuery({
          combinator: "and",
          rules: condition.rules,
        });
      }
    }
  }, [selectedCondition]);

  useEffect(() => {
    if (selectedAction) {
      const action = varsAction.find((action) => action.name === selectedAction);
      if (action) {
        setAction({
          combinator: "and",
          rules: action.rules,
        });
      }
    }
  }, [selectedAction]);

  return (
    <Fragment>
      <div className="flex flex-col space-y-4">
        <Listbox
          label="Condição"
          options={varsCondition.map((condition) => ({
            value: condition.name,
            label: condition.label,
          }))}
          value={selectedCondition}
          onChange={setSelectedCondition}
        />
        <QueryBuilderEditor
          query={query}
          setQuery={setQuery}
          fields={varsCondition}
        />
      </div>
      <div className="flex flex-col space-y-4 mt-8">
        <Listbox
          label="Ação"
          options={varsAction.map((action) => ({
            value: action.name,
            label: action.label,
          }))}
          value={selectedAction}
          onChange={setSelectedAction}
        />
        <QueryBuilderEditor
          query={action}
          setQuery={setAction}
          fields={varsAction}
          operators={actionOperators}
        />
      </div>
    </Fragment>
  );
}