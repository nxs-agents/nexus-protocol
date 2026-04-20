import { Agent } from './agent';
import type { ClientConfig, AgentConfig, AgentStatus } from './types';

const API_BASE = 'https://api.nxsagents.io/v1';

export class NexusClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  async deploy(agentConfig: AgentConfig): Promise<Agent> {
    const response = await this.request('POST', '/agents', {
      strategy: agentConfig.strategy,
      risk_tolerance: agentConfig.riskTolerance,
      capital_amount: agentConfig.capital.amount,
      capital_token: agentConfig.capital.token,
      chain: 'ethereum',
      protocols: agentConfig.protocols ?? [],
      rebalance_threshold: agentConfig.rebalanceThreshold ?? 0.5,
      max_slippage: agentConfig.maxSlippage ?? 0.1,
    });

    return new Agent(response.id, agentConfig, this.config);
  }

  async getAgent(id: string): Promise<Agent> {
    const status: AgentStatus = await this.request('GET', `/agents/${id}`);
    return new Agent(id, { strategy: status.strategy } as AgentConfig, this.config);
  }

  async listAgents(): Promise<Agent[]> {
    const response = await this.request('GET', '/agents');
    return response.data.map(
      (item: AgentStatus) =>
        new Agent(item.id, { strategy: item.strategy } as AgentConfig, this.config)
    );
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`NEXUS API error ${res.status}: ${error.message}`);
    }

    return res.json();
  }
}
