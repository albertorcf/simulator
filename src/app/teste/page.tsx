// frontend/src/app/teste/page.tsx
"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
import JSON5 from 'json5';
import FeesTable from "@/components/FeesTable";
import { runSimulation, Operation } from "@/lib/simulator/runSimulation";
import { Candle } from '@/types/types';
import { parseRange } from "@/utils/dateRange";
import { SimulationControls } from "@/components/SimulationControls";
import { fetchBinanceCandles } from "@/utils/candles";
import { baseStrategy } from "@/data/strategies/baseStrategy";
import { useApexOptions } from "@/hooks/useApexOptions";
import { QueryBuilderEditor, Listbox } from "visual-editor";
import { RuleGroupType } from "react-querybuilder";

export default function TestePage() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  // 📈 linhas dinâmicas de Suporte & Resistência
  const [suporte, setSuporte] = useState(110);
  const [resistencia, setResistencia] = useState(120);

  // 📍 anotações de pontos (compras / vendas)
  const [pointAnnotations, setPointAnnotations] = useState<any[]>([]);

  // ── linha vertical (cursor da simulação) ──
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [position, setPosition] = useState<number>(0);
  
  const [taxa, setTaxa] = useState<number>(0.001);

  const [simulando, setSimulando] = useState(false);
  const [delaySec, setDelaySec] = useState<number>(0);  // ⏱️ delay em segundos (aceita frações, ex: 0.5 ⇒ 500 ms)
  const cancelRef = useRef(false);

  const operationsRef = useRef<Operation[] | null>(null);

  const { rules, vars } = baseStrategy;
  const [selectedRuleIndex, setSelectedRuleIndex] = useState(0);

  // Gerencie o estado da regra selecionada
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

  // Função para atualizar a regra ao trocar de seleção
  function handleSelectRule(newIndex: number) {
    // Atualiza a regra atual com as edições feitas
    rules[selectedRuleIndex].condition = condQuery as any;
    rules[selectedRuleIndex].action = actionQuery as any;
    setSelectedRuleIndex(newIndex);
  }

  // Função para montar os campos do editor
  function buildFieldList(rawFields: string[]) {
    return rawFields.map((name) => ({
      name,
      label: name,
      valueSources: name.endsWith("()") ? ['value'] : ['value', 'field'],
    }));
  }
  const init = vars.filter(v => v.type === "state" || v.type === "candle");
  const varsCondition = vars.filter(v => v.type === "computed" && !v.name.endsWith("()"));
  const varsAction = vars.filter(v => v.type === "action");

  // ─── helper para “dormir” ────────────────────────────
  const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  const [estrategiaTexto, setEstrategiaTexto] = useState(
    JSON5.stringify(baseStrategy, null, 2)
  );

  /** 
  * Lê candles de acordo com o bloco `candles` do JSON.
  * Se o bloco não existir, usa intervalo padrão – 7 dias → agora.
  */
  async function loadCandlesFromStrategy(jsonText: string) {
    try {
      const { candles = { start: "-7d", end: "now" } } = JSON5.parse(jsonText);
      const { start, end } = parseRange(candles.start ?? "-7d", candles.end ?? "now");
      const fetched = await fetchBinanceCandles({
        symbol: "SOLUSDT",
        interval: "1h",
        startTime: start.getTime(),   // ✅ número,
        endTime: end.getTime(),
      });
      return fetched;
    } catch (err) {
      console.warn("⚠️ Erro ao interpretar bloco `candles` – usando padrão – 7d → now", err);
      const { start, end } = parseRange("-7d", "now");
      return fetchBinanceCandles({
        symbol: "SOLUSDT",
        interval: "1h",
        startTime: start.getTime(),
        endTime: end.getTime(),
      });
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const initialCandles = await loadCandlesFromStrategy(estrategiaTexto);
      setCandles(initialCandles);
      console.log(`[UI] Recebidos ${initialCandles.length} candles`,
        formatDateTime(new Date(initialCandles[0].time)),
        "→",
        formatDateTime(new Date(initialCandles.at(-1)!.time))
      );
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);       // ← executa só na montagem (gráfico inicial)

  const chartData = candles.map((candle) => ({ x: candle.time, y: candle.close }));

  // Série principal
  const apexSeries = useMemo(() => [
    { name: "Preço", data: chartData }
  ], [chartData]);

  // ───── opções do gráfico (dependem de estados dinâmicos) ─────
  const apexOptions = useApexOptions({
    suporte,
    resistencia,
    pointAnnotations,
    cursorX,
    onSeekHandler
  });

  //
  // ─────────────────────────── simulação ───────────────────────────
  //
  async function startSimulation() {
    if (simulando) return;             // evita clique duplo
    cancelRef.current = false;
    setSimulando(true);                // 🔒 desabilita botão

    try {
      const freshCandles = await loadCandlesFromStrategy(estrategiaTexto);
      setCandles(freshCandles);       // <-- atualiza state (gráfico reage)

      operationsRef.current = null;
      const result = runSimulation({ candles: freshCandles, strategyData: baseStrategy });
      if (!result) { setSimulando(false); return; }
      
      operationsRef.current = [...result.operations];

      if (delaySec === 0) {
        // • modo instantâneo
        const markers = operationsRef.current
          .filter(op => op.type === "buy" || op.type === "sell" || op.type === "reset")
          .map(op => ({
            x: op.timestamp,
            y: op.price,
            marker: {
              size: 4,
              fillColor: op.type === "buy" ? "green" : (op.type === "sell" ? "red" : "silver"),
              strokeColor: "#fff",
              strokeWidth: 1,
              shape: op.type === "reset" ? "square" : "circle"
            }
          }));
        setPointAnnotations(markers);
        setCursorX(null);
        // ajusta S/R para o final da simulação
        const lastOp = result.operations[result.operations.length - 1];
        setSuporte(lastOp.S ?? suporte);
        setResistencia(lastOp.R ?? resistencia);
      }
      else {
        // • modo slow‑motion
        setPointAnnotations([]);
        for (let [index, op] of operationsRef.current.entries()) {
          if (cancelRef.current) break;

          // move linha vertical
          setCursorX(op.timestamp);

          setPosition(index);

          // atualiza S/R se presentes no objeto op
          setSuporte(op.S ?? suporte);
          setResistencia(op.R ?? resistencia);

          // se for compra / venda / reset → adiciona ponto
          if (op.type === "buy" || op.type === "sell" || op.type === "reset") {
            setPointAnnotations(prev => ([
              ...prev,
              {
                x: op.timestamp,
                y: op.price,
                marker: {
                  size: 4,
                  fillColor: op.type === "buy" ? "green" : (op.type === "sell" ? "red" : "silver"),
                  strokeColor: "#fff",
                  strokeWidth: 1,
                  shape: op.type === "reset" ? "square" : "circle"
                }
              }
            ]));
          }

          await sleep(delaySec * 1000);
        }
      }

      // 📊 RESULTADOS DA SIMULAÇÃO
      console.log("📊 Resultado:", result);

      result.operations.forEach((op, i) => {
        if (op.type !== "none") {
          const dataHora = formatDateTime(new Date(op.timestamp));

          const emoji = op.type === "buy" ? "🟢" : "🔴";
          const tipo = op.type.toUpperCase();
          console.log(`${emoji} ${dataHora} — ${tipo} @ ${op.price.toFixed(2)} (${op.qty})`);
        }
      });

      const precoInicial = candles[0].close;
      const precoFinal = candles[candles.length - 1].close;

      const valorInicial = result.initialUSDT + result.initialSOL * precoInicial;
      const valorFinal = result.finalUSDT + result.finalSOL * precoFinal;
      const pnl = valorFinal - valorInicial;
      const pnlPercent = (pnl / valorInicial) * 100;

      console.log(`💰 Saldo inicial: ${valorInicial.toFixed(2)} USDT = ${result.initialUSDT.toFixed(2)} USDT + ${result.initialSOL} SOL`);
      console.log(`💰 Saldo final:   ${valorFinal.toFixed(2)} USDT = ${result.finalUSDT.toFixed(2)} USDT + ${result.finalSOL} SOL`);
      console.log(`📈 PnL:           ${pnl.toFixed(2)} USDT (${pnlPercent.toFixed(2)}%)`);


    } catch (error) {
      console.error("❌ Erro ao iniciar simulação:", error);
    } finally {
      setSimulando(false);           // 🔓 reabilita botão ao terminar (ou erro)
    }

  }

  // handler do botão: inicia ou para
  function handleRunButton() {
    if (simulando) {
      cancelRef.current = true; // sinaliza para interromper loop async
    } else {
      startSimulation();
    }
  }

  function onSeekHandler(pos: number) {
    console.log('onSeekHandler pos=', pos)
    setPosition(pos);
    setCursorX(candles[pos].time);
    let operations = operationsRef.current;
    if (operations && operations[pos].R && operations[pos].S) {
      setResistencia(operations[pos].R);
      setSuporte(operations[pos].S)
    }
  }

  if (loading) return <div className="p-4">Carregando dados...</div>;

  function formatDateTime(timestamp: number | Date): string {
    return new Date(timestamp).toLocaleString("pt-BR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).replace(", ", " ");
  }

  return (
    <main className="flex flex-col items-center justify-center p-4">

      <h1 className="text-3xl font-bold mb-1">📈 Gráfico SOLUSDT (últimos 7 dias)</h1>

      {/* Gráfico de linha com dados de candles */}
      <div className="w-full max-w-4xl h-[400px] mb-1 px-2">
        <ApexChart
          type="line"
          height="100%"
          width="100%"
          options={apexOptions}
          series={apexSeries}
        />
      </div>

      <div className="w-full max-w-4xl flex flex-col md:flex-row items-center md:justify-between gap-2 font-sans">
        {/* ▶️ Simulation Controls */}
        <SimulationControls
          length={candles.length}
          position={position}
          playing={simulando}
          onSeek={pos => onSeekHandler(pos)}
          onStepForward={() => onSeekHandler(Math.min(position + 1, candles.length - 1))}
          onStepBackward={() => onSeekHandler(Math.max(position - 1, 0))}
        />

        {/* 🗓️ Informações atuais simplificadas */}
        <div className="text-sm flex gap-2">
          <span><strong>Data/Hora:</strong></span>
          <span>
            {cursorX ? formatDateTime(new Date(cursorX)) : '—'}
          </span>
        </div>
      </div>

      <div className="flex flex-col w-full max-w-4xl gap-4">
        
        {/* Bloco de edição da estratégia */}
        <section className="w-full">

          <h2 className="text-xl font-bold mb-2 text-center">⚙️ Estratégia</h2>

          {/* Edição da estratégia */}
          <div className="flex flex-col gap-6 w-full">
            
            {/* Linha: Listbox de regras à esquerda, controles à direita */}
            <div className="flex flex-row gap-4 items-start">
              <div className="flex-1">
                <div className="mb-1 text-lg font-semibold">Regras</div>
                <Listbox
                  className="rounded border bg-white h-37"
                  items={rules.map((r) => r.descr)}
                  selectedIndex={selectedRuleIndex}
                  onSelect={handleSelectRule}
                />
              </div>

              <div className="flex flex-col gap-2 mt-8">
                {/* ▶️ Botão de iniciar */}
                <button
                  onClick={handleRunButton}
                  className={`text-white py-2 px-4 rounded hover:opacity-90 ${simulando ? "bg-red-600" : "bg-blue-600"}`}
                >
                  {simulando ? "⏹️ Parar Simulação" : "▶️ Iniciar Simulação"}
                </button>
                
                {/* ⏱️ Delay em segundos */}
                <label className="flex items-center gap-2 text-base">
                  Delay (s):
                  <input
                    type="number" step="0.05"
                    min={0}
                    max={1}
                    className="w-24 rounded border px-2 py-2 bg-background"
                    value={delaySec}
                    onChange={e => setDelaySec(parseFloat(e.target.value))}
                  />
                </label>
              </div>
            </div>

            {/* Editor de Condição */}
            <div>
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
            <div>
              <h2 className="text-lg font-semibold mb-1">Editor de Ação</h2>
              <QueryBuilderEditor
                fields={buildFieldList([
                  ...init.map((v) => v.name),
                  ...varsAction.map((v) => v.name)
                ])}
                query={actionQuery}
                onQueryChange={setActionQuery}
                className="bg-red-50"
                operators={[
                  { name: "=", label: "=" },
                  // outros operadores se quiser
                ]}
              />
            </div>
          </div>

        </section>

        {/* Tabela de taxas */}
        <div className="w-full max-w-2xl">
          <FeesTable suporte={suporte} taxa={taxa} range={{ inicio: 1, fim: 4, passo: 0.5 }} />
        </div>
      </div>

    </main>
  );
}