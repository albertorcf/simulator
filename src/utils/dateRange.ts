// frontend/src/utils/dateRange.ts
// ---------------------------------------------------------
// Utilidades de parsing / normalização de período de candles
// ---------------------------------------------------------
// 👉 Aceita datas absolutas (ISO‑8601) ou relativas a partir de "agora":
//    "now" | "today" | "yesterday" | "-7d" | "+36h" ...
// 👉 Retorna objetos Date *UTC* já alinhados ao intervalo (1h, 4h, 1d…) se desejado.
// ---------------------------------------------------------

export type ParsedRange = {
  start: Date;
  end: Date;
};

// ──────────────────────────────────────────────────────────
// ✅ parseFlexibleDate — interpreta string em Date (UTC)
// ──────────────────────────────────────────────────────────
export function parseFlexibleDate(raw: string, now: Date = new Date()): Date {
  const str = raw.trim().toLowerCase();

  // Palavras‑chave rápidas
  if (str === "now") return new Date(now);
  if (str === "today") return startOfDayUTC(now);
  if (str === "yesterday") return addDaysUTC(startOfDayUTC(now), -1);

  // Relativo «±Nd / ±Nh / ±Nm / ±Ns»
  const m = str.match(/^([+-]?\d+)([dhms])$/);
  if (m) {
    const val = parseInt(m[1], 10);
    const unit = m[2] as "d" | "h" | "m" | "s";
    return shiftUTC(now, val, unit);
  }

  // ISO (ou qualquer formato válido por Date)
  const explicit = new Date(raw);
  if (!Number.isNaN(explicit.valueOf())) return explicit;

  throw new Error(`Formato de data inválido: ${raw}`);
}

// ──────────────────────────────────────────────────────────
// ✅ normaliseToInterval — alinha Data ao início do candle
// ──────────────────────────────────────────────────────────
export function normaliseToInterval(date: Date, interval: string): Date {
  const d = new Date(date); // cópia
  if (/^\d+h$/.test(interval)) {
    // ex: "1h", "4h"
    d.setUTCMinutes(0, 0, 0);
    const step = parseInt(interval.replace("h", ""), 10);
    const hour = d.getUTCHours();
    d.setUTCHours(Math.floor(hour / step) * step);
  } else if (/^\d+d$/.test(interval)) {
    d.setUTCHours(0, 0, 0, 0);
  }
  return d;
}

// ──────────────────────────────────────────────────────────
// ✅ validateRange — simples sanidade (start < end)
// ──────────────────────────────────────────────────────────
export function validateRange(start: Date, end: Date) {
  if (end <= start) throw new Error("Data final deve ser posterior à inicial");
}

// ──────────────────────────────────────────────────────────
// ✅ parseRange — high‑level util p/ objeto { start, end, interval }
// ──────────────────────────────────────────────────────────
export function parseRange(start: string, end: string, interval: string = '1h' ): ParsedRange {
  const now = new Date();
  const s = parseFlexibleDate(start, now);
  const e = parseFlexibleDate(end, now);

  validateRange(s, e);

  return {
    start: normaliseToInterval(s, interval),
    end:   normaliseToInterval(e, interval)
  };
}

// ──────────────────────────────────────────────────────────
// 🔸 helper internals (UTC‑based)
// ──────────────────────────────────────────────────────────
function startOfDayUTC(d: Date) {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

function addDaysUTC(d: Date, days: number) {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + days);
  return c;
}

function shiftUTC(base: Date, value: number, unit: "d" | "h" | "m" | "s") {
  const d = new Date(base);
  switch (unit) {
    case "d": d.setUTCDate(d.getUTCDate() + value); break;
    case "h": d.setUTCHours(d.getUTCHours() + value); break;
    case "m": d.setUTCMinutes(d.getUTCMinutes() + value); break;
    case "s": d.setUTCSeconds(d.getUTCSeconds() + value); break;
  }
  return d;
}
