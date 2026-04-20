import { BaseStrategy } from './base';
import type { MarketContext, Action } from '../types';

export class YieldOptimizer extends BaseStrategy {
  private currentProtocol: string | null = null;
  private currentApy: number = 0;

  async evaluate(ctx: MarketContext): Promise<Action | null> {
    const gasPrice = await ctx.getGasPrice();
    const gasGwei = Number(gasPrice / 1_000_000_000n);

    if (gasGwei > this.maxGasGwei()) {
      return null;
    }

    const pools = await ctx.getPools({
      minTvl: 1_000_000,
      token: this.config.capital.token,
    });

    const eligible = pools
      .filter((p) => this.config.protocols.includes(p.protocol))
      .filter((p) => p.apy >= this.minApyThreshold())
      .sort((a, b) => b.apy - a.apy);

    if (eligible.length === 0) return null;

    const best = eligible[0];

    if (this.currentProtocol === best.protocol) return null;

    const delta = best.apy - this.currentApy;
    if (this.currentProtocol !== null && delta < this.config.rebalanceThreshold) {
      return null;
    }

    const action: Action = this.currentProtocol
      ? {
          type: 'REBALANCE',
          protocol: this.currentProtocol,
          toProtocol: best.protocol,
          token: this.config.capital.token,
          amount: this.config.capital.amount,
          metadata: {
            fromApy: this.currentApy,
            toApy: best.apy,
            delta,
          },
        }
      : {
          type: 'DEPOSIT',
          protocol: best.protocol,
          token: this.config.capital.token,
          amount: this.config.capital.amount,
          metadata: { apy: best.apy },
        };

    this.currentProtocol = best.protocol;
    this.currentApy = best.apy;

    return action;
  }
}
