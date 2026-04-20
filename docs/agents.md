# Agent Types

## Overview

NEXUS agents are autonomous programs that execute DeFi strategies on Ethereum. Each agent type is optimized for a specific use case.

```
┌───────────────────────────────────────────────────────┐
│               NEXUS AGENT TYPES                       │
│                                                       │
│  yield_optimizer    arb_trader                        │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ Aave         │  │ Uniswap      │                  │
│  │ Lido         │  │ Flashbots    │                  │
│  │ Uniswap v3   │  │ MEV bundles  │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                       │
│  lp_manager         sentinel                         │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │ Uniswap v3   │  │ Aave         │                  │
│  │ Range mgmt   │  │ Compound     │                  │
│  │ Fee compound │  │ Alerts       │                  │
│  └──────────────┘  └──────────────┘                  │
└───────────────────────────────────────────────────────┘
```

---

## yield_optimizer

Continuously scans lending and staking protocols to find the highest available yield and routes capital automatically.

**Protocols:** Aave v3, Lido, Uniswap v3, Compound v3

**Configuration:**

```typescript
{
  strategy: 'yield_optimizer',
  riskTolerance: 'conservative' | 'moderate' | 'aggressive',
  capital: { amount: string, token: 'USDC' | 'ETH' | 'WBTC' },
  protocols: ['aave', 'lido', 'uniswap'],
  rebalanceThreshold: 0.5,   // rebalance when APY delta exceeds 0.5%
  maxSlippage: 0.1,          // max 0.1% slippage per trade
}
```

**Example output:**

```
[14:32:03] Pool scan complete: 847 pools indexed
[14:32:04] Best APY: Lido stETH 8.4%
[14:32:05] Position opened: 10,000 USDC
[14:38:44] Rebalance trigger: APY delta 2.1%
[14:38:45] Rebalanced to Aave USDC: 9.1% APY
[14:38:46] PnL: +$184.20 (+1.84%)
```

---

## arb_trader

Identifies and executes arbitrage opportunities across DEXs using Flashbots bundles to avoid frontrunning and failed transactions.

**Protocols:** Uniswap v2/v3, Curve, Balancer via Flashbots relay

**Configuration:**

```typescript
{
  strategy: 'arb_trader',
  minProfitUsd: 10,           // minimum profit per trade after gas
  maxGasGwei: 50,             // skip trade if gas exceeds this
  pairs: ['ETH/USDC', 'WBTC/ETH', 'stETH/ETH'],
  useFlashbots: true,
}
```

**Execution flow:**

```
Detect price discrepancy
        │
        ▼
Calculate profit after gas
        │
        ▼
Simulate via eth_call
        │
        ▼
Bundle with Flashbots
        │
        ▼
Submit to block builder
        │
        ▼
Confirm + log PnL
```

---

## lp_manager

Manages concentrated liquidity positions on Uniswap v3. Automatically adjusts ranges as price moves and compounds earned fees.

**Protocols:** Uniswap v3

**Configuration:**

```typescript
{
  strategy: 'lp_manager',
  pool: 'USDC/ETH-0.05',
  rangeWidth: 10,             // +/- 10% range around current price
  compoundInterval: 86400,    // compound fees every 24 hours
  rebalanceOnOutOfRange: true,
}
```

---

## sentinel

Passive risk monitoring agent. Watches collateral ratios on lending positions and triggers protective actions before liquidation.

**Protocols:** Aave v3, Compound v3

**Configuration:**

```typescript
{
  strategy: 'sentinel',
  watchAddress: '0x...',
  healthFactorFloor: 1.3,    // trigger at health factor 1.3
  action: 'deleverage' | 'notify',
  notifyWebhook: 'https://...',
}
```

**Risk thresholds:**

| Health Factor | Status | Action |
|---|---|---|
| > 2.0 | Safe | None |
| 1.5 - 2.0 | Monitor | Log only |
| 1.3 - 1.5 | Warning | Notify webhook |
| < 1.3 | Critical | Auto-deleverage |

---

## Custom strategies

Agents can be extended with custom strategy logic using the `@nexus/core` package.

```typescript
import { BaseStrategy, MarketContext, Action } from '@nexus/core';

export class MyStrategy extends BaseStrategy {
  async evaluate(ctx: MarketContext): Promise<Action | null> {
    const pools = await ctx.getPools({ minTvl: 1_000_000 });
    const best = pools.sort((a, b) => b.apy - a.apy)[0];

    if (best.apy > this.config.minApy) {
      return {
        type: 'DEPOSIT',
        protocol: best.protocol,
        amount: this.config.capital,
        token: 'USDC',
      };
    }

    return null;
  }
}
```
