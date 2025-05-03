// components/FeesTable.tsx

type Props = {
  suporte: number;
  taxa: number;
  range?: {
    inicio: number;
    fim: number;
    passo: number;
  };
};

export default function FeesTable({ suporte, taxa, range }: Props) {
  const { inicio = 0.5, fim = 5, passo = 0.5 } = range || {};

  const tabela = [];
  for (let diff = inicio; diff <= fim; diff += passo) {
    const resistencia = suporte + diff;
    const lucroBruto = resistencia - suporte;
    const lucroLiquido = lucroBruto - taxa * (resistencia + suporte);

    tabela.push({
      diff,
      suporte,
      resistencia,
      lucroBruto,
      lucroLiquido: parseFloat(lucroLiquido.toFixed(4)),
    });
  }

  return (
    <section className="md:w-1/2 border rounded p-4 shadow-md bg-white overflow-auto">
      <h2 className="text-xl font-bold mb-2">📊 Impacto da Taxa nas Diferenças R-S</h2>

      <div className="w-full text-sm">
        <div className="font-semibold text-gray-700 bg-gray-200 grid grid-cols-5 mb-2">
          <div>R-S (USDT)</div>
          <div>S</div>
          <div>R</div>
          <div>R-S</div>
          <div>Líq (USDT)</div>
        </div>

        {tabela.map((row, index) => (
          <div
            key={index}
            className={`grid grid-cols-5 p-1 rounded ${index % 2 === 0 ? "bg-white" : "bg-gray-100"
              }`}
          >
            <div>{row.diff}</div>
            <div>{row.suporte}</div>
            <div>{row.resistencia}</div>
            <div>{row.lucroBruto.toFixed(4)}</div>
            <div>{row.lucroLiquido.toFixed(4)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
