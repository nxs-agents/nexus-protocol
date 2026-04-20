import type { MarketContext, Action, StrategyConfig } from './types';
import { BaseStrategy } from './strategies/base';

export interface EngineConfig {
  agentId: string;
  rpcUrl: string;
  strategy: BaseStrategy;
  onAction?: (action: Action) => void;
  onError?: (err: Error) => void;
}

export class AgentEngine {
  private config: EngineConfig;
  private running = false;
  private pollIntervalMs = 12_000; // roughly one Ethereum block

  constructor(config: EngineConfig) {
    this.config = config;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        const ctx = await this.buildMarketContext();
        const action = await this.config.strategy.evaluate(ctx);

        if (action) {
          this.config.onAction?.(action);
        }
      } catch (err) {
        this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
      }

      await this.sleep(this.pollIntervalMs);
    }
  }

  private async buildMarketContext(): Promise<MarketContext> {
    const block = await this.rpcCall<string>('eth_blockNumber', []);
    const gasPrice = await this.rpcCall<string>('eth_gasPrice', []);

    return {
      blockNumber: parseInt(block, 16),
      timestamp: Date.now(),
      getPools: async () => [],
      getPrice: async () => 0,
      getGasPrice: async () => BigInt(gasPrice),
    };
  }

  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(this.config.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });

    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result as T;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
