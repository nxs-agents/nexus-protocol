import type { Action } from './types';

export interface VerificationResult {
  valid: boolean;
  onChain: boolean;
  verifyTimeMs: number;
  txHash?: string;
  block?: number;
  error?: string;
}

export class OnchainVerifier {
  private rpcUrl: string;
  private verifierContract: string;

  constructor(rpcUrl: string, verifierContract: string) {
    this.rpcUrl = rpcUrl;
    this.verifierContract = verifierContract;
  }

  async verify(agentId: string, action: Action, signature: string): Promise<VerificationResult> {
    const start = Date.now();

    try {
      const payload = this.encodeAction(agentId, action);
      const valid = await this.callVerifierContract(payload, signature);

      return {
        valid,
        onChain: true,
        verifyTimeMs: Date.now() - start,
      };
    } catch (err) {
      return {
        valid: false,
        onChain: false,
        verifyTimeMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private encodeAction(agentId: string, action: Action): string {
    const data = JSON.stringify({ agentId, ...action, ts: Date.now() });
    return Buffer.from(data).toString('hex');
  }

  private async callVerifierContract(payload: string, signature: string): Promise<boolean> {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: this.verifierContract,
          data: `0x${payload}`,
        },
        'latest',
      ],
    };

    const res = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    return json.result !== '0x' && !json.error;
  }
}
