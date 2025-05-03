import { NextResponse } from "next/server";
import { fetchBinanceCandles } from "@/utils/candles";           // 👈 mudou o caminho

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const symbol = searchParams.get("symbol") ?? "SOLUSDT";
  const interval = searchParams.get("interval") ?? "1h";
  const start = searchParams.get("startTime");
  const end = searchParams.get("endTime");

  try {
    const candles = await fetchBinanceCandles({
      symbol,
      interval,
      ...(start && { startTime: Number(start) }),
      ...(end && { endTime: Number(end) }),
    });

    return NextResponse.json({ data: candles });
  } catch (err) {
    console.error("Erro Binance:", err);
    return NextResponse.json({ error: "Falha ao obter candles" }, { status: 500 });
  }
}
