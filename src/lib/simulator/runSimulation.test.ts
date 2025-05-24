import type { RuleGroupTypeAny } from 'react-querybuilder';
import { baseStrategy } from '../../data/strategies/baseStrategy';
import { evaluateRuleGroup } from './ruleEngine';
import { 
  runSimulation, 
  ruleGroupToString 
} from './runSimulation';
import { buy, sell, resetR, resetS } from './runSimulation';
import { userDefinedFunctions } from "../../data/strategies/udfs";
import { runUdf } from "./ruleEngine";

// Desabilita console.log para todos os testes deste arquivo
/*
    enableConsoleLog();     // Restaura o log original só para este teste
    try {
      // ... teste ...
     } finally {
      disableConsoleLog();  // Desabilita o log novamente após o teste
    }
*/
const originalLog = console.log;
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => { });
});

afterAll(() => {
  (console.log as jest.Mock).mockRestore();
});

function enableConsoleLog() {
  (console.log as jest.Mock).mockRestore();
}

function disableConsoleLog() {
  jest.spyOn(console, 'log').mockImplementation(() => { });
}

// Testes
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
      ],
      rules: [] // Corrigido: adiciona rules vazio para evitar erro de iteração
    };
    const result = runSimulation({ candles, strategyData });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('object');
    expect(Array.isArray(result!.operations)).toBe(true);
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
      ],
      rules: [] // Corrigido: adiciona rules vazio para evitar erro de iteração
    };

    // Mock para capturar logs do escopo em cada iteração
    const logs: any[] = [];   // Cria um array vazio para armazenar tudo o que for "logado" durante a execução do teste
    const originalLog = console.log;  // Salva a função original do console.log para poder restaurar depois.
    console.log = (...args) => logs.push(args);   // Substitui o console.log por uma função que, ao invés de imprimir no terminal, guarda os argumentos (tudo o que seria impresso) no array logs

    runSimulation({ candles, strategyData });

    console.log = originalLog; // restaura o log
    // Depois de rodar a função, devolve o console.log ao seu comportamento normal, para não afetar outros testes ou prints

    // O último escopo logado deve ter valorOp = close * qty do último candle
    // Pega o último log feito durante a execução (normalmente, o escopo do último candle)
    // Se você faz console.log('scope', scope), o segundo argumento (scope) é o que interessa, por isso pega o índice 1
    const lastScope = logs[logs.length - 1][1];
    expect(lastScope.valorOp).toBe(30 * 2);
  });
});


/**
 * Teste da function evaluateRuleGroup
 */

describe('evaluateRuleGroup', () => {
  it('deve avaliar corretamente a condição de compra (buy)', () => {
    const buyCondition: RuleGroupTypeAny = {
      combinator: "or",
      rules: [
        { field: "index", operator: "=", valueSource: "value", value: 1 },
        {
          combinator: "and",
          rules: [
            { field: "close", operator: "<=", valueSource: "field", value: "suporte" },
            { field: "saldoUSDT", operator: ">=", valueSource: "field", value: "valorOp" },
            { field: "lastOp", operator: "==", valueSource: "value", value: "V" }
          ]
        }
      ]
    };

    const scope = {
      index: 2,
      close: 10,
      suporte: 11,
      saldoUSDT: 100,
      valorOp: 50,
      lastOp: "V"
    };

    expect(evaluateRuleGroup(buyCondition, scope)).toBe(true);
  });
});

/**
 * 
 */
describe('ruleGroupToString', () => {
  it('deve montar a expressão string corretamente para uma condição aninhada', () => {
    const buyCondition: RuleGroupTypeAny = {
      combinator: "or",
      rules: [
        { field: "index", operator: "=", valueSource: "value", value: 1 },
        {
          combinator: "and",
          rules: [
            { field: "close", operator: "<=", valueSource: "field", value: "suporte" },
            { field: "saldoUSDT", operator: ">=", valueSource: "field", value: "valorOp" },
            { field: "lastOp", operator: "==", valueSource: "value", value: "V" }
          ]
        }
      ]
    };

    const expr = ruleGroupToString(buyCondition);
    expect(expr.replace(/\s+/g, ' ')).toBe(
      '(index = 1 or (close <= suporte and saldoUSDT >= valorOp and lastOp == "V"))'
    );
  });
});

/**
 * Testes unitários básicos para as funções buy, sell, reset, resetR e resetS.
 * 
 * - Use `pnpm exec jest` para rodar os testes.
 * - Sempre escreva e rode os testes ao implementar novas funções!
 * - Estes testes são exemplos simples para garantir que as funções principais do simulador funcionam isoladamente.
 */

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
      true: true,
    };
  });

  it('buy deve comprar SOL e debitar USDT', () => {
    buy(scope);
    expect(scope.saldoSOL).toBeCloseTo(1 + 0.5 - 0.5 * 0.01); // netSOL
    expect(scope.saldoUSDT).toBeCloseTo(100 - 0.5 * 10); // costUSD
    expect(scope.lastOp).toBe("C");
    expect(scope.opType).toBe("buy");
  });

  it('sell deve vender SOL e creditar USDT', () => {
    sell(scope);
    expect(scope.saldoSOL).toBeCloseTo(1 - 0.5);
    expect(scope.saldoUSDT).toBeCloseTo(100 + (0.5 * 10) * (1 - 0.01)); // netUSD
    expect(scope.lastOp).toBe("V");
    expect(scope.opType).toBe("sell");
  });

  it('reset deve atualizar suporte e resistência', () => {
    scope.close = 20;
    scope.candleOp = "I";

    // Encontra a UDF reset
    const udfReset = userDefinedFunctions.find(u => u.name === "reset");
    
    // Cria o wrapper no escopo para simular o comportamento do simulador
    scope.reset = () => {
      if (udfReset) {
        scope.returnValue = undefined;
        runUdf(udfReset.blocks, scope);
        return scope.returnValue;
      }
    };

    scope.reset();

    expect(scope.resistencia).toBe(22);
    expect(scope.suporte).toBe(18);
    expect(scope.candleOp).toBe("R");
  });

  it('resetR deve atualizar apenas resistência', () => {
    scope.close = 30;
    scope.candleOp = "I";
    resetR(scope);
    expect(scope.resistencia).toBe(32);
    expect(scope.candleOp).toBe("R");
  });

  it('resetS deve atualizar apenas suporte', () => {
    scope.close = 40;
    scope.candleOp = "I";
    resetS(scope);
    expect(scope.suporte).toBe(38);
    expect(scope.candleOp).toBe("R");
  });
});

/**
 * Testa se o runSimulation preenche corretamente o array de operações
 * ao executar uma estratégia real (baseStrategy) com candles que forçam
 * uma operação de compra (buy) e depois uma de venda (sell).
 * Verifica se as operações relevantes (buy/sell) estão presentes,
 * na ordem correta e com os preços esperados.
 */
describe('runSimulation - operações', () => {
  it('deve registrar operações buy e sell corretamente', () => {
    //enableConsoleLog();   // Restaura o log original só para este teste
    //try {
      const candles = [
        { close: 10, open: 10, high: 10, low: 10, volume: 1, time: 1 },
        { close: 8, open: 10, high: 10, low: 8, volume: 2, time: 2 },   // buy esperado
        { close: 12, open: 8, high: 12, low: 8, volume: 3, time: 3 },   // sell esperado
      ];
      
      const result = runSimulation({ candles, strategyData: baseStrategy });

      // Espera pelo menos duas operações relevantes: buy e sell
      expect(result).not.toBeNull();
      expect(Array.isArray(result!.operations)).toBe(true);

      const ops = result!.operations.filter(op => op.opType === "buy" || op.opType === "sell");
      expect(ops.length).toBeGreaterThanOrEqual(2);

      expect(ops[0].opType).toBe("buy");
      expect(ops[0].opPrice).toBe(8);
      expect(ops[1].opType).toBe("sell");
      expect(ops[1].opPrice).toBe(12);
    //} finally {
    //  disableConsoleLog();  // Desabilita o log novamente após o teste
    //}
  });
});