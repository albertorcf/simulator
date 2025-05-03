// frontend/src/hooks/useApexOptions.ts
"use client";
import { useMemo } from "react";
import { ApexOptions } from "apexcharts";

export function useApexOptions(params: {
  suporte: number;
  resistencia: number;
  pointAnnotations: any[];
  cursorX: number | null;
  onSeekHandler: (pos: number) => void;
}): ApexOptions {
  const { suporte, resistencia, pointAnnotations, cursorX, onSeekHandler } = params;

  const apexOptions: ApexOptions = useMemo(() => ({
    chart: {
      id: "linha-solusdt",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      events: {
        click(event: any, chartContext: any, config: any) {
          const dataPointIndex = config.dataPointIndex;
          if (dataPointIndex >= 0) {
            onSeekHandler(dataPointIndex);
          }
        },
      },
    },
    xaxis: {
      type: "datetime",
      labels: {
        datetimeUTC: false, // ✅ força GMT-3 na exibição. Important!
        datetimeFormatter: {
          day: "dd/MM",
          month: "MM/yyyy",
          hour: "HH:mm"
        }
      },
      tickAmount: 6
    },
    yaxis: {
      opposite: true,
      labels: { formatter: (v: number) => v.toFixed(2) }
    },
    tooltip: {
      x: { format: "dd/MM/yy HH:mm" },
      y: { formatter: (v: number) => `${v.toFixed(4)} USDT` }
    },
    annotations: {
      // linha vertical
      xaxis: cursorX !== null ? [{ x: cursorX, borderColor: "#666", strokeDashArray: 4 }] : [],
      // suporte & resistência
      yaxis: [
        {
          y: suporte,
          borderColor: "rgba(0,128,0,0.6)",
          label: {
            text: "Suporte",
            position: "center",
            style: { color: "#fff", background: "rgba(0,128,0,0.3)" }
          }
        },
        {
          y: resistencia,
          borderColor: "rgba(255,0,0,0.6)",
          label: {
            text: "Resistência",
            position: "center",
            style: { color: "#fff", background: "rgba(255,0,0,0.3)" }
          }
        }
      ],
      points: pointAnnotations,
    },
    stroke: { curve: "smooth", width: 2 }
  }), [suporte, resistencia, pointAnnotations, cursorX, onSeekHandler]);

  return apexOptions;
}
