export interface Pool {
  protocol: string;
  name: string;
  apy: number;
  tvlUsd: number;
  token: string;
  address: string;
}

export interface MarketContext {
  blockNumber: number;
  timestamp: number;
  getPools(filter?: { minTvl?: number; token?: string; protocol?: string }): Promise<Pool[]>;
  getPrice(token: string): Promise<number>;
  getGasPrice(): Promise<bigint>;
}

export interface Action {
  type: 'DEPOSIT' | 'WITHDRAW' | 'SWAP' | 'REBALANCE';
  protocol: string;
  token: string;
  amount: string;
  toProtocol?: string;
  toToken?: string;
  metadata?: Record<string, unknown>;
}

export interface StrategyConfig {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  capital: { amount: string; token: string };
  protocols: string[];
  rebalanceThreshold: number;
  maxSlippage: number;
  minApy?: number;
}
