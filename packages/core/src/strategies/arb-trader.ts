import { BaseStrategy } from './base';
import type { MarketContext, Action } from '../types';

interface ArbOpportunity {
  tokenIn: string;
  tokenOut: string;
  buyProtocol: string;
  sellProtocol: string;
  profitUsd: number;
  amountIn: string;
}

export class ArbTrader extends BaseStrategy {
  private minProfitUsd: number;

  constructor(config: ConstructorParameters<typeof BaseStrategy>[0] & { minProfitUsd?: number }) {
    super(config);
    this.minProfitUsd = config.minProfitUsd ?? 10;
  }

  async evaluate(ctx: MarketContext): Promise<Action | null> {
    const gasPrice = await ctx.getGasPrice();
    const gasGwei = Number(gasPrice / 1_000_000_000n);

    if (gasGwei > this.maxGasGwei()) return null;

    const opportunity = await this.findBestArb(ctx);
    if (!opportunity) return null;

    const gasCostUsd = await this.estimateGasCostUsd(ctx, gasPrice);
    if (opportunity.profitUsd - gasCostUsd < this.minProfitUsd) return null;

    return {
      type: 'SWAP',
      protocol: opportunity.buyProtocol,
      token: opportunity.tokenIn,
      toToken: opportunity.tokenOut,
      amount: opportunity.amountIn,
      toProtocol: opportunity.sellProtocol,
      metadata: {
        profitUsd: opportunity.profitUsd,
        gasCostUsd,
        netProfitUsd: opportunity.profitUsd - gasCostUsd,
        useFlashbots: true,
      },
    };
  }

  private async findBestArb(ctx: MarketContext): Promise<ArbOpportunity | null> {
    const pairs = [
      ['ETH', 'USDC'],
      ['WBTC', 'ETH'],
      ['stETH', 'ETH'],
    ];

    const opportunities: ArbOpportunity[] = [];

    for (const [tokenIn, tokenOut] of pairs) {
      const pools = await ctx.getPools({ token: tokenIn });
      if (pools.length < 2) continue;

      const sorted = pools.sort((a, b) => a.apy - b.apy);
      const buyPool = sorted[0];
      const sellPool = sorted[sorted.length - 1];

      const spread = sellPool.apy - buyPool.apy;
      if (spread < 0.1) continue;

      const amountIn = '1';
      const profitUsd = (spread / 100) * parseFloat(amountIn) * (await ctx.getPrice(tokenIn));

      opportunities.push({
        tokenIn,
        tokenOut,
        buyProtocol: buyPool.protocol,
        sellProtocol: sellPool.protocol,
        profitUsd,
        amountIn,
      });
    }

    if (opportunities.length === 0) return null;
    return opportunities.sort((a, b) => b.profitUsd - a.profitUsd)[0];
  }

  private async estimateGasCostUsd(ctx: MarketContext, gasPrice: bigint): Promise<number> {
    const GAS_UNITS = 200_000n;
    const ethCostWei = gasPrice * GAS_UNITS;
    const ethCostEth = Number(ethCostWei) / 1e18;
    const ethPrice = await ctx.getPrice('ETH');
    return ethCostEth * ethPrice;
  }
}
