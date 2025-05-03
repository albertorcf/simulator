// frontend/src/app/teste/page.tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { ApexOptions } from "apexcharts";
import FeesTable from "@/components/FeesTable";
import { avaliarExpressao, avaliarCondicao } from "@/utils/evalExpr";

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
  const [pointAnnotations, setPointAnnotations] = useState<any[]>([]);
  const [taxa, setTaxa] = useState<number>(0.001);

  const [estrategiaTexto, setEstrategiaTexto] = useState(`{
  "init": {
    "saldoUSDT": 1000,
    "saldoSOL": 2,
    "suporte": 110,
    "resistencia": 112,
    "delta": 2,
    "qty": 0.5
  },
  "estrategia": [
    {
      "descr": "Venda se o preço romper resistência",
      "condicao": "atual.close >= resistencia && current.saldoSOL >= qty",
      "acao": "current.saldoSOL -= qty; current.saldoUSDT += atual.close * qty"
    },
    {
      "descr": "Compra se o preço cair abaixo do suporte",
      "condicao": "atual.close <= suporte && current.saldoUSDT >= atual.close * qty",
      "acao": "current.saldoUSDT -= atual.close * qty; current.saldoSOL += qty"
    }
  ]
}
`);


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

  // Dados com timestamps para usar em xaxis datetime
  const chartData = candles.map((candle) => ({
    x: candle.openTime,
    y: candle.close,
  }));

  // Série principal
  const apexSeries = useMemo(() => [
    {
      name: "Preço",
      data: chartData
    }
  ], [chartData]);

  // Configurações do gráfico
  // Configurações do gráfico
  const apexOptions: ApexOptions = {
    chart: {
      id: "linha-solusdt",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true },
    },
    xaxis: {
      type: "datetime", // 👈 importante
      labels: {
        datetimeFormatter: {
          day: 'dd/MM',
          month: 'MM/yyyy',
          hour: 'HH:mm'
        }
      },
      tickAmount: 6,
      //labels: { rotate: -45 }
    },
    yaxis: {
      opposite: true,
      labels: {
        formatter: (val: number) => val.toFixed(2)
      }
    },
    tooltip: {
      x: {
        format: "dd/MM/yy HH:mm"
      },
      y: {
        formatter: (val: number) => `${val.toFixed(4)} USDT`
      }
    },
    annotations: {
      yaxis: [
        {
          y: suporte,
          borderColor: "rgba(0, 128, 0, 0.6)",
          label: {
            text: "Suporte",
            position: "center",
            style: {
              color: "#fff",
              background: "rgba(0, 128, 0, 0.3)"
            }
          }
        },
        {
          y: resistencia,
          borderColor: "rgba(255, 0, 0, 0.6)",
          label: {
            text: "Resistência",
            position: "center",
            style: {
              color: "#fff",
              background: "rgba(255, 0, 0, 0.3)"
            }
          }
        }
      ],
      points: pointAnnotations // 👈 Ponto(s) adicionados dinamicamente
    },
    stroke: {
      curve: "smooth" as const,
      width: 2
    }
  };

  /**
   * Simulação de compras e vendas
   */
  function simulate(
    candles: Candle[],
    suporteInicial: number,
    resistenciaInicial: number,
    delta: number,
    taxa: number,
    qtyCrypto: number = 0.5
  ): {
    markers: any[];
    buys: { x: number; y: number }[];
    sells: { x: number; y: number }[];
    resumo: {
      buys: number;
      sells: number;
      pnlBruto: number;
      pnlLiquido: number;
    };
    operacoes: string[];
  } {
    let suporte = suporteInicial;
    let resistencia = resistenciaInicial;
    let saldoSOL = 2;
    let saldoUSDT = 200;

    const buys: { x: number; y: number }[] = [];
    const sells: { x: number; y: number }[] = [];
    const operacoes: string[] = [];

    // Percorrer todos os candles
    for (const candle of candles) {
      const time = candle.openTime;
      const price = candle.close;
      const dataHora = new Date(time).toLocaleString("pt-BR", {year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit"});

      if (price >= resistencia && saldoSOL >= qtyCrypto) {
        // Venda
        sells.push({ x: time, y: price });
        saldoSOL -= qtyCrypto;
        saldoUSDT += price * qtyCrypto;
        resistencia = price - delta/2;
        suporte = price + delta/2;
        operacoes.push(`${dataHora} 🔴 SELL at ${price.toFixed(2)} | R=${resistencia} S=${suporte} | SOL=${saldoSOL}, USDT=${saldoUSDT.toFixed(2)}`);
      } else if (price <= suporte && saldoUSDT >= qtyCrypto * price) {
        // Compra
        buys.push({ x: time, y: price });
        saldoSOL += qtyCrypto;
        saldoUSDT -= price * qtyCrypto;
        operacoes.push(`${dataHora} 🟢 BUY  at ${price.toFixed(2)} | R=${resistencia} S=${suporte} | SOL=${saldoSOL}, USDT=${saldoUSDT.toFixed(2)}`);
        resistencia = price - delta/2;
        suporte = price + delta/2;
      } else {
        if (price >= resistencia) {
          operacoes.push(`${dataHora} 🛑 SEM SALDO para VENDA at ${price.toFixed(2)} | R=${resistencia} S=${suporte} | SOL=${saldoSOL}`);
        } else if (price <= suporte) {
          operacoes.push(`${dataHora} 🛑 SEM SALDO para COMPRA at ${price.toFixed(2)} | R=${resistencia} S=${suporte} | USDT=${saldoUSDT.toFixed(2)}`);
        }
      }
    }

    // Gerar marcadores para o gráfico
    const markers = [
      ...buys.map((p) => ({
        x: p.x,
        y: p.y,
        marker: {
          size: 4,
          fillColor: "green",
          strokeColor: "#fff",
          strokeWidth: 2,
          shape: "circle"
        }
      })),
      ...sells.map((p) => ({
        x: p.x,
        y: p.y,
        marker: {
          size: 4,
          fillColor: "red",
          strokeColor: "#fff",
          strokeWidth: 2,
          shape: "circle"
        }
      }))
    ];

    // Calcular PnL
    const numTrades = Math.min(buys.length, sells.length);
    let pnlBruto = 0;
    let pnlLiquido = 0;

    for (let i = 0; i < numTrades; i++) {
      const precoCompra = buys[i].y;
      const precoVenda = sells[i].y;
      const lucroBruto = precoVenda - precoCompra;
      const custoTaxa = (precoCompra + precoVenda) * taxa;

      pnlBruto += lucroBruto;
      pnlLiquido += lucroBruto - custoTaxa;
    }

    const pnlPercent = saldoUSDT > 0 ? (pnlLiquido / saldoUSDT) * 100 : 0;

    // 🔄 LOGS DA SIMULAÇÃO
    console.log("");
    console.log("🔄 SIMULATION BEGIN");

    // 🕒 Linha do tempo
    console.log("🕒 LINHA DO TEMPO DAS OPERAÇÕES:");
    operacoes.forEach((op, i) => {
      console.log(`${i + 1}. ${op}`);
    });

    // 📍 Parâmetros
    console.log(`📍 Parâmetros: suporte=${suporteInicial}, resistência=${resistenciaInicial}, delta=${delta}, taxa=${(taxa * 100).toFixed(2)}%`);

    // 🟢 Compras
    const totalComprado = buys.reduce((acc, b) => acc + b.y * qtyCrypto, 0);
    const taxasCompra = buys.reduce((acc, b) => acc + b.y * qtyCrypto * taxa, 0);
    console.log("🟢 COMPRAS");
    console.log(`  - Total: ${buys.length} operações`);
    console.log(`  - Total gasto: ${totalComprado.toFixed(2)} USDT`);
    console.log(`  - Taxas pagas: ${taxasCompra.toFixed(2)} USDT`);

    // 🔴 Vendas
    const totalVendido = sells.reduce((acc, s) => acc + s.y * qtyCrypto, 0);
    const taxasVenda = sells.reduce((acc, s) => acc + s.y * qtyCrypto * taxa, 0);
    console.log("🔴 VENDAS");
    console.log(`  - Total: ${sells.length} operações`);
    console.log(`  - Total recebido: ${totalVendido.toFixed(2)} USDT`);
    console.log(`  - Taxas pagas: ${taxasVenda.toFixed(2)} USDT`);

    // 💵 Resultados
    console.log("💵 RESULTADOS");
    console.log(`  - PnL Bruto: ${pnlBruto.toFixed(2)} USDT`);
    console.log(`  - PnL Líquido (com taxas): ${pnlLiquido.toFixed(2)} USDT`);
    console.log(`  - Retorno (% sobre saldo inicial): ${pnlPercent.toFixed(2)}%`);
    console.log("✅ SIMULATION END");

    return {
      markers,
      buys,
      sells,
      resumo: {
        buys: buys.length,
        sells: sells.length,
        pnlBruto,
        pnlLiquido
      },
      operacoes
    };
  }

  // Função para iniciar a simulação
  function runSimulation() {
    try {

      // 🧪 INICIALIZAÇÃO

      let config;
      try {
        config = JSON.parse(estrategiaTexto);
      } catch (err) {
        console.error("❌ Erro de parse do JSON:", err);
        return;
      }

      // Verifica estrutura esperada
      if (!config.init || typeof config.init !== 'object') {
        console.error("❌ Estrutura inválida: campo 'init' é obrigatório.");
        return;
      }

      if (!Array.isArray(config.estrategia)) {
        console.error("❌ Estrutura inválida: campo 'estrategia' deve ser uma lista.");
        return;
      }

      console.log("✅ INIT carregado:", config.init);
      console.log("✅ ESTRATÉGIA:", config.estrategia);
      
      const current = structuredClone(config.init); // Estado mutável
      const operacoes: string[] = [];


      // 🔁 LOOP PRINCIPAL

      const scope = {
        atual: { close: 120 },
        current: { saldoSOL: 2, saldoUSDT: 0 },
        resistencia: 115,
        qty: 0.5
      };

      const cond = avaliarCondicao('atual.close >= resistencia && current.saldoSOL >= qty', scope);
      console.log("🧪 Condição avaliada:", cond); // true

      avaliarExpressao(`
  current.saldoSOL -= qty;
  current.saldoUSDT += atual.close * qty;
`, scope);


      // 📊 RESULTADOS DA SIMULAÇÃO

      console.log("🧾 Escopo atualizado:", scope.current);

      
      // Simulação
      //const resultado = simulate(candles, suporte, resistencia, delta, taxa, qtyCrypto);

      //setPointAnnotations(resultado.markers);

    } catch (error) {
      console.error("❌ Erro ao iniciar simulação:", error);
    }
  }

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
  function parseNumber(n: number | string): number {
    if (typeof n === "number") return n;
    if (typeof n === "string") {
      return parseFloat(n.replace(",", "."));
    }
    throw new Error("Número inválido!");
  }

  if (loading) return <div className="p-4">Carregando dados...</div>;

  return (
    <main className="flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">📈 Gráfico SOLUSDT (últimos 7 dias)</h1>

      {/* Gráfico de linha com dados de candles */}
      <div className="w-full max-w-4xl h-[400px] mb-4 px-2">
        <ApexChart
          type="line"
          height="100%"
          width="100%"
          options={apexOptions}
          series={apexSeries}
        />
      </div>

      <div className="flex flex-col w-full max-w-4xl gap-4 mt-4">
        {/* Bloco de edição da estratégia */}
        <section className="w-full border rounded p-4 shadow-md bg-gray-50">
          <h2 className="text-xl font-bold mb-2">⚙️ Estratégia de Simulação</h2>
          <textarea
            value={estrategiaTexto}
            onChange={(e) => setEstrategiaTexto(e.target.value)}
            spellCheck={false}
            className="w-full h-72 p-2 border rounded font-mono text-sm"
          />

          <button
            onClick={runSimulation}
            className="mt-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            ▶️ Iniciar Simulação
          </button>
        </section>

        {/* Tabela de taxas abaixo */}
        <div className="w-full max-w-2xl">
          <FeesTable suporte={suporte} taxa={taxa} range={{ inicio: 1, fim: 4, passo: 0.5 }} />
        </div>
      </div>

    </main>
  );
}
