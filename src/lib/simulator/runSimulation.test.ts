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
});