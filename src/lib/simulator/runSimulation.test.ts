import { runSimulation } from './runSimulation';

describe('runSimulation', () => {
  it('deve retornar null se não houver candles', () => {
    const result = runSimulation({ candles: [], strategyData: { vars: [] } });
    expect(result).toBeNull();
  });

  it('deve inicializar corretamente com candles e strategy simples', () => {
    const candles = [
      { close: 10, open: 10, high: 10, low: 10, volume: 1, time: 1 },
      { close: 11, open: 10, high: 12, low: 9, volume: 2, time: 2 }
    ];
    const strategyData = {
      vars: [
        { name: "saldoUSDT", value: 100, type: "state" },
        { name: "close", value: 0, type: "candle" }
      ]
    };
    const result = runSimulation({ candles, strategyData });
    // Como a função retorna null no final, esperamos null
    expect(result).toBeNull();
  });

  // Testa alguns campos do scope final após o loop
  // Esse teste é simples e serve para validar o comportamento incremental do loop
  it('atualiza campos computed (expr) a cada iteração', () => {
    const candles = [
      { close: 10, open: 10, high: 10, low: 10, volume: 1, time: 1 },
      { close: 20, open: 19, high: 21, low: 18, volume: 2, time: 2 },
      { close: 30, open: 29, high: 31, low: 28, volume: 3, time: 3 }
    ];
    const strategyData = {
      vars: [
        { name: "close", value: 0, type: "candle" },
        { name: "qty", value: 2, type: "state" },
        { name: "valorOp", expr: "close * qty", type: "computed" }
      ]
    };

    // Mock para capturar logs do escopo em cada iteração
    const logs: any[] = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args);

    runSimulation({ candles, strategyData });

    console.log = originalLog; // restaura o log

    // O último escopo logado deve ter valorOp = close * qty do último candle
    const lastScope = logs[logs.length - 1][1];
    expect(lastScope.valorOp).toBe(30 * 2);
  });
});

/**
 * Testes unitários básicos para as funções buy, sell, reset, resetR e resetS.
 * 
 * - Use `pnpm exec jest` para rodar os testes.
 * - Sempre escreva e rode os testes ao implementar novas funções!
 * - Estes testes são exemplos simples para garantir que as funções principais do simulador funcionam isoladamente.
 */

import { buy, sell, reset, resetR, resetS } from './runSimulation';

describe('Funções de operação do simulador', () => {
  let scope: any;

  beforeEach(() => {
    // Estado inicial padrão para cada teste
    scope = {
      saldoUSDT: 100,
      saldoSOL: 1,
      taxa: 0.01,
      close: 10,
      qty: 0.5,
      delta: 2,
      resistencia: 12,
      suporte: 8,
      iddleInit: 5,
      iddleCount: 3,
      op: {},
      time: 123,
      candleOp: "",
      lastOp: "",
    };
  });

  it('buy deve comprar SOL e debitar USDT', () => {
    buy(scope);
    expect(scope.saldoSOL).toBeCloseTo(1 + 0.5 - 0.5 * 0.01); // netSOL
    expect(scope.saldoUSDT).toBeCloseTo(100 - 0.5 * 10); // costUSD
    expect(scope.lastOp).toBe("C");
    expect(scope.op.type).toBe("buy");
  });

  it('sell deve vender SOL e creditar USDT', () => {
    sell(scope);
    expect(scope.saldoSOL).toBeCloseTo(1 - 0.5);
    expect(scope.saldoUSDT).toBeCloseTo(100 + (0.5 * 10) * (1 - 0.01)); // netUSD
    expect(scope.lastOp).toBe("V");
    expect(scope.op.type).toBe("sell");
  });

  it('reset deve atualizar suporte e resistência', () => {
    scope.close = 20;
    reset(scope);
    expect(scope.resistencia).toBe(22);
    expect(scope.suporte).toBe(18);
    expect(scope.candleOp).toBe("R");
  });

  it('resetR deve atualizar apenas resistência', () => {
    scope.close = 30;
    resetR(scope);
    expect(scope.resistencia).toBe(32);
    expect(scope.candleOp).toBe("R");
  });

  it('resetS deve atualizar apenas suporte', () => {
    scope.close = 40;
    resetS(scope);
    expect(scope.suporte).toBe(38);
    expect(scope.candleOp).toBe("R");
  });
});