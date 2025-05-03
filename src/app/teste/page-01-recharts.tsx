// frontend/src/app/teste/page.tsx
"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export default function TestePage() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [suporte, setSuporte] = useState(110);
  const [resistencia, setResistencia] = useState(120);
  const [tabelaTaxas, setTabelaTaxas] = useState<any[]>([]);

  const [variaveis, setVariaveis] = useState(`  "saldoUSDT": 1000,
  "saldoSOL": 0,
  "operacaoInicial": "COMPRA",
  "suporte": 110,
  "resistencia": 120,
  "delta": 2,
  "taxa": "0,10%",
  "difSR": 4`);

  useEffect(() => {
    fetch("/api/binance/klines")
      .then((res) => res.json())
      .then((data) => {
        setCandles(data.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Erro ao buscar dados:", error);
        setLoading(false);
      });
  }, []);

  const chartData = candles.map((candle) => ({
    date: new Date(candle.openTime).toLocaleString("pt-BR", {day: '2-digit', month: '2-digit', year: '2-digit'}),
    close: candle.close,
  }));

  // Função para converter a taxa
  function parseTaxa(taxa: number | string): number {
    if (typeof taxa === "number") return taxa;
    if (typeof taxa === "string") {
      taxa = taxa.replace("%", "").replace(",", ".").trim();
      return parseFloat(taxa) / 100;
    }
    throw new Error("Taxa inválida!");
  }

  // Função para converter a diferença SR
  function parseDifSR(difSR: number | string): number {
    if (typeof difSR === "number") return difSR;
    if (typeof difSR === "string") {
      return parseFloat(difSR.replace(",", "."));
    }
    throw new Error("Diferença SR inválida!");
  }

  function handleIniciar() {
    try {
      const vars = JSON.parse(`{${variaveis}}`);
      console.log("✅ Variáveis iniciais carregadas:", vars);

      // Atualizando os estados do gráfico
      setSuporte(vars.suporte);
      setResistencia(vars.resistencia);

      // Atualizando a tabela de taxas
      const suporte = vars.suporte;
      const taxa = parseTaxa(vars.taxa);
      const difSR = parseDifSR(vars.difSR);

      const diferencasSR = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

      const tabela = diferencasSR.map((diff) => {
        const resistencia = suporte + diff;
        const lucroBruto = resistencia - suporte;
        const lucroLiquido = lucroBruto - taxa * (resistencia + suporte);

        return {
          diff,
          suporte,
          resistencia,
          lucroBruto,
          lucroLiquido: parseFloat(lucroLiquido.toFixed(4)),
        };
      });

      setTabelaTaxas(tabela);
    } catch (error) {
      console.error("❌ Erro ao ler variáveis:", error);
      alert("Formato inválido! Use um JSON válido.");
    }
  }

  if (loading) return <div className="p-4">Carregando dados...</div>;

  return (
    <main className="flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">📈 Gráfico SOLUSDT (últimos 7 dias)</h1>

      <div className="w-full max-w-4xl h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis 
              domain={['auto', 'auto']}
              tick={{ fontSize: 12 }}
              orientation="right" // 👉 Adiciona o eixo Y à direita
            />
            <Tooltip />

            {/* Linha com preços de fechamento */}
            <Line type="monotone" dataKey="close" stroke="#8884d8" strokeWidth={2} dot={false} />

            {/* Linhas horizontais de suporte e resistência */}
            <ReferenceLine y={suporte} label="Suporte" stroke="green" strokeDasharray="3 3" />
            <ReferenceLine y={resistencia} label="Resistência" stroke="red" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Container para variáveis e tabela lado a lado */}
      <div className="flex flex-col md:flex-row w-full max-w-4xl gap-4 mt-4">
        {/* Nova seção para variáveis da simulação */}
        <section className="md:w-1/2 border rounded p-4 shadow-md bg-gray-50">
          <h2 className="text-xl font-bold mb-2">⚙️ Variáveis Iniciais da Simulação</h2>
          <textarea
            className="w-full h-50 p-2 border rounded font-mono text-sm"
            value={variaveis}
            onChange={(e) => setVariaveis(e.target.value)}
            spellCheck={false} // 👈 Desativa o corretor ortográfico
          />

          <button
            onClick={handleIniciar}
            className="mt-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            ▶️ Iniciar Simulação
          </button>
        </section>

        {/* Tabela com impacto das taxas */}
        {tabelaTaxas.length > 0 && (
          <section className="md:w-1/2 border rounded p-4 shadow-md bg-white overflow-auto">
            <h2 className="text-xl font-bold mb-2">📊 Impacto da Taxa nas Diferenças R-S</h2>
            <table className="w-full text-sm text-center border-collapse">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">R-S (USDT)</th>
                  <th className="border p-2">S</th>
                  <th className="border p-2">R</th>
                  <th className="border p-2">R-S</th>
                  <th className="border p-2">Líq (USDT)</th>
                </tr>
              </thead>
              <tbody>
                {tabelaTaxas.map((row, index) => (
                  <tr key={index}>
                    <td className="border p-1">{row.diff}</td>
                    <td className="border p-1">{row.suporte}</td>
                    <td className="border p-1">{row.resistencia}</td>
                    <td className="border p-1">{row.lucroBruto.toFixed(4)}</td>
                    <td className="border p-1">{row.lucroLiquido.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

    </main>
  );
}
