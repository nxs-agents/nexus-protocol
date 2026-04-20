export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';

export type StrategyType = 'yield_optimizer' | 'arb_trader' | 'lp_manager' | 'sentinel';

export type Token = 'ETH' | 'USDC' | 'WBTC' | 'stETH' | 'WETH';

export type AgentStatusType = 'active' | 'paused' | 'stopped' | 'error';

export interface ClientConfig {
  network: 'mainnet' | 'testnet';
  rpcUrl: string;
  privateKey: string;
  apiKey?: string;
}

export interface AgentConfig {
  strategy: StrategyType;
  riskTolerance: RiskTolerance;
  capital: {
    amount: string;
    token: Token;
  };
  protocols?: string[];
  rebalanceThreshold?: number;
  maxSlippage?: number;
}

export interface AgentStatus {
  id: string;
  strategy: StrategyType;
  status: AgentStatusType;
  uptime: number;
  apyCurrent: number;
  pnlTotalUsd: number;
  pnlPct: number;
  lastBlock: number;
  executions: number;
  registrationBlock: number;
  createdAt: string;
}

export interface ExecutionEvent {
  id: string;
  type: 'REBALANCE' | 'SWAP' | 'DEPOSIT' | 'WITHDRAW' | 'ONCHAIN_VERIFY' | 'APY_UPDATE' | 'ERROR';
  description: string;
  fromProtocol?: string;
  toProtocol?: string;
  amountUsd?: number;
  pnl?: string;
  gasEth?: number;
  txHash?: string;
  block?: number;
  timestamp: string;
}
