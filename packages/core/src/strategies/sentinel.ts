import { BaseStrategy } from './base';
import type { MarketContext, Action } from '../types';

export type SentinelAction = 'deleverage' | 'notify' | 'both';

export interface SentinelConfig {
  watchAddress: string;
  protocol: 'aave' | 'compound';
  healthFactorFloor: number;
  action: SentinelAction;
  notifyWebhook?: string;
  deleverageRatio?: number;
}

interface HealthState {
  healthFactor: number;
  collateralUsd: number;
  debtUsd: number;
  lastAlertBlock: number;
}

const ALERT_COOLDOWN_BLOCKS = 10;

export class Sentinel extends BaseStrategy {
  private sentinelConfig: SentinelConfig;
  private lastState: HealthState | null = null;

  constructor(
    config: ConstructorParameters<typeof BaseStrategy>[0],
    sentinelConfig: SentinelConfig
  ) {
    super(config);
    this.sentinelConfig = sentinelConfig;
  }

  async evaluate(ctx: MarketContext): Promise<Action | null> {
    const healthFactor = await this.fetchHealthFactor(ctx);

    const state: HealthState = {
      healthFactor,
      collateralUsd: 0,
      debtUsd: 0,
      lastAlertBlock: this.lastState?.lastAlertBlock ?? 0,
    };

    const blocksSinceAlert = ctx.blockNumber - state.lastAlertBlock;
    const inCooldown = blocksSinceAlert < ALERT_COOLDOWN_BLOCKS;

    // Safe zone — no action needed
    if (healthFactor > 2.0) {
      this.lastState = state;
      return null;
    }

    // Warning zone — notify only
    if (healthFactor > this.sentinelConfig.healthFactorFloor) {
      if (!inCooldown && this.sentinelConfig.notifyWebhook) {
        state.lastAlertBlock = ctx.blockNumber;
        this.lastState = state;

        return {
          type: 'REBALANCE',
          protocol: this.sentinelConfig.protocol,
          toProtocol: this.sentinelConfig.protocol,
          token: this.config.capital.token,
          amount: '0',
          metadata: {
            reason: 'health_factor_warning',
            healthFactor,
            floor: this.sentinelConfig.healthFactorFloor,
            action: 'notify',
            webhook: this.sentinelConfig.notifyWebhook,
          },
        };
      }
      this.lastState = state;
      return null;
    }

    // Critical zone — deleverage
    if (
      this.sentinelConfig.action === 'deleverage' ||
      this.sentinelConfig.action === 'both'
    ) {
      const ratio = this.sentinelConfig.deleverageRatio ?? 0.25;
      const repayAmount = (
        parseFloat(this.config.capital.amount) * ratio
      ).toString();

      state.lastAlertBlock = ctx.blockNumber;
      this.lastState = state;

      return {
        type: 'WITHDRAW',
        protocol: this.sentinelConfig.protocol,
        token: this.config.capital.token,
        amount: repayAmount,
        metadata: {
          reason: 'health_factor_critical',
          healthFactor,
          floor: this.sentinelConfig.healthFactorFloor,
          action: 'deleverage',
          deleverageRatio: ratio,
          watchAddress: this.sentinelConfig.watchAddress,
        },
      };
    }

    this.lastState = state;
    return null;
  }

  private async fetchHealthFactor(ctx: MarketContext): Promise<number> {
    // Health factor is derived from collateral/debt ratio
    // In production this calls the protocol's on-chain view
    const collateralPool = await ctx.getPools({
      protocol: this.sentinelConfig.protocol,
      token: this.config.capital.token,
    });

    if (collateralPool.length === 0) return 999;

    const collateralApy = collateralPool[0].apy;
    const debtApy = collateralApy * 0.8;

    // Simulated health factor based on yield spread
    return 1.0 + collateralApy / (debtApy + 0.01);
  }
}
