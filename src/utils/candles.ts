// frontend/src/utils/candles.ts
import axios from "axios";
import { Candle } from '@/types/types';

export interface FetchBinanceParams {
  symbol: string;           // ex: "SOLUSDT"
  interval: string;         // ex: "1h"
  startTime?: number;       // epoch-ms
  endTime?: number;         // epoch-ms
  limit?: number;           // padrão 1000
}

export async function fetchBinanceCandles(params: FetchBinanceParams): Promise<Candle[]> {
  const { symbol, interval, startTime, endTime, limit = 1000 } = params;

  const url = "https://api.binance.com/api/v3/klines";
  const { data } = await axios.get(url, {
    params: {
      symbol,
      interval,
      limit,
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
    },
  });

  // mapeia o payload bruto da Binance para o tipo Candle
  const candles: Candle[] = data.map((c: any[]) => ({
    time:   c[0],
    open:   Number(c[1]),
    high:   Number(c[2]),
    low:    Number(c[3]),
    close:  Number(c[4]),
    volume: Number(c[5]),
  }));

  /* -------------- LOGS ÚTEIS PARA DEPURAÇÃO -------------- */
  if (candles.length) {
    const fmt = (t: number) =>
      new Date(t).toLocaleString("pt-BR", {
        year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit"
      });

    console.log(
      `[Binance] ${symbol} ${interval} → ${candles.length} candles`,
      "|", fmt(candles[0].time), "→", fmt(candles[candles.length - 1].time)
    );
  } else {
    console.log(`[Binance] ${symbol} ${interval} → sem dados para o período solicitado`);
  }
  /* ------------------------------------------------------- */

  return candles;
}

// Agrupa cada 4 candles de 15m em 1 de 1h
// ToDo: testar
export function aggregateCandles(candles15m: Candle[], intervalInMinutes = 60) {
  const groupSize = intervalInMinutes / 15;
  const candles1h = [];
  for (let i = 0; i < candles15m.length; i += groupSize) {
    const group = candles15m.slice(i, i + groupSize);
    if (group.length < groupSize) break;
    candles1h.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
    });
  }
  return candles1h;
}
