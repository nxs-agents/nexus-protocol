import type { MarketContext, Action, StrategyConfig } from '../types';

export abstract class BaseStrategy {
  protected config: StrategyConfig;

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  abstract evaluate(ctx: MarketContext): Promise<Action | null>;

  protected maxGasGwei(): number {
    const limits: Record<string, number> = {
      conservative: 30,
      moderate: 60,
      aggressive: 120,
    };
    return limits[this.config.riskTolerance];
  }

  protected minApyThreshold(): number {
    if (this.config.minApy !== undefined) return this.config.minApy;
    const defaults: Record<string, number> = {
      conservative: 4,
      moderate: 2,
      aggressive: 0,
    };
    return defaults[this.config.riskTolerance];
  }
}
