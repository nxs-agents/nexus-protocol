import { BaseStrategy } from './base';
import type { MarketContext, Action } from '../types';

export interface LpManagerConfig {
  pool: string;
  token0: string;
  token1: string;
  rangeWidthPercent: number;
  compoundIntervalBlocks: number;
  rebalanceOnOutOfRange: boolean;
}

interface PositionState {
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  liquidity: string;
  lastCompoundBlock: number;
}

export class LpManager extends BaseStrategy {
  private lpConfig: LpManagerConfig;
  private position: PositionState | null = null;

  constructor(
    config: ConstructorParameters<typeof BaseStrategy>[0],
    lpConfig: LpManagerConfig
  ) {
    super(config);
    this.lpConfig = lpConfig;
  }

  async evaluate(ctx: MarketContext): Promise<Action | null> {
    const gasPrice = await ctx.getGasPrice();
    const gasGwei = Number(gasPrice / 1_000_000_000n);

    if (gasGwei > this.maxGasGwei()) return null;

    const currentPrice = await ctx.getPrice(this.lpConfig.token0);
    const currentTick = this.priceToTick(currentPrice);

    // Initial deposit — no position exists yet
    if (!this.position) {
      const { tickLower, tickUpper } = this.calculateRange(currentTick);
      this.position = {
        tickLower,
        tickUpper,
        currentTick,
        liquidity: this.config.capital.amount,
        lastCompoundBlock: ctx.blockNumber,
      };

      return {
        type: 'DEPOSIT',
        protocol: 'uniswap-v3',
        token: this.lpConfig.token0,
        amount: this.config.capital.amount,
        metadata: {
          pool: this.lpConfig.pool,
          tickLower,
          tickUpper,
          action: 'initial_deposit',
        },
      };
    }

    this.position.currentTick = currentTick;

    // Check if price has moved out of range
    const outOfRange =
      currentTick < this.position.tickLower ||
      currentTick > this.position.tickUpper;

    if (outOfRange && this.lpConfig.rebalanceOnOutOfRange) {
      const { tickLower, tickUpper } = this.calculateRange(currentTick);

      const prevLower = this.position.tickLower;
      const prevUpper = this.position.tickUpper;

      this.position.tickLower = tickLower;
      this.position.tickUpper = tickUpper;
      this.position.lastCompoundBlock = ctx.blockNumber;

      return {
        type: 'REBALANCE',
        protocol: 'uniswap-v3',
        toProtocol: 'uniswap-v3',
        token: this.lpConfig.token0,
        amount: this.position.liquidity,
        metadata: {
          pool: this.lpConfig.pool,
          reason: 'out_of_range',
          prevRange: [prevLower, prevUpper],
          newRange: [tickLower, tickUpper],
          currentTick,
        },
      };
    }

    // Compound fees if interval has passed
    const blocksSinceCompound = ctx.blockNumber - this.position.lastCompoundBlock;
    if (blocksSinceCompound >= this.lpConfig.compoundIntervalBlocks) {
      this.position.lastCompoundBlock = ctx.blockNumber;

      return {
        type: 'REBALANCE',
        protocol: 'uniswap-v3',
        toProtocol: 'uniswap-v3',
        token: this.lpConfig.token0,
        amount: '0',
        metadata: {
          pool: this.lpConfig.pool,
          reason: 'compound_fees',
          blocksSinceLastCompound: blocksSinceCompound,
        },
      };
    }

    return null;
  }

  private calculateRange(currentTick: number): { tickLower: number; tickUpper: number } {
    const halfRangeTicks = Math.floor(
      (this.lpConfig.rangeWidthPercent / 100) * 10000
    );
    return {
      tickLower: currentTick - halfRangeTicks,
      tickUpper: currentTick + halfRangeTicks,
    };
  }

  private priceToTick(price: number): number {
    return Math.floor(Math.log(price) / Math.log(1.0001));
  }
}
