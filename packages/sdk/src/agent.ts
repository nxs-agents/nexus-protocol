import type { ClientConfig, AgentConfig, AgentStatus, ExecutionEvent } from './types';

type EventHandler<T> = (data: T) => void;

export class Agent {
  readonly id: string;
  private config: AgentConfig;
  private clientConfig: ClientConfig;
  private ws: WebSocket | null = null;
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  constructor(id: string, config: AgentConfig, clientConfig: ClientConfig) {
    this.id = id;
    this.config = config;
    this.clientConfig = clientConfig;
  }

  on(event: 'execution', handler: EventHandler<ExecutionEvent>): this;
  on(event: 'rebalance', handler: EventHandler<ExecutionEvent>): this;
  on(event: 'error', handler: EventHandler<Error>): this;
  on(event: string, handler: EventHandler<any>): this {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);

    if (!this.ws) {
      this.connectWebSocket();
    }

    return this;
  }

  async getStatus(): Promise<AgentStatus> {
    const res = await fetch(`https://api.nxsagents.io/v1/agents/${this.id}`, {
      headers: this.clientConfig.apiKey
        ? { Authorization: `Bearer ${this.clientConfig.apiKey}` }
        : {},
    });

    if (!res.ok) throw new Error(`Failed to get agent status: ${res.statusText}`);
    return res.json();
  }

  async pause(): Promise<void> {
    await this.postAction('pause');
  }

  async resume(): Promise<void> {
    await this.postAction('resume');
  }

  async stop(): Promise<void> {
    await this.postAction('stop');
    this.ws?.close();
    this.ws = null;
  }

  private async postAction(action: string): Promise<void> {
    const method = action === 'stop' ? 'DELETE' : 'POST';
    const path = action === 'stop'
      ? `/agents/${this.id}`
      : `/agents/${this.id}/${action}`;

    const res = await fetch(`https://api.nxsagents.io/v1${path}`, {
      method,
      headers: this.clientConfig.apiKey
        ? { Authorization: `Bearer ${this.clientConfig.apiKey}` }
        : {},
    });

    if (!res.ok) throw new Error(`Failed to ${action} agent: ${res.statusText}`);
  }

  private connectWebSocket(): void {
    const url = `wss://stream.nxsagents.io/agents/${this.id}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (this.clientConfig.apiKey) {
        this.ws!.send(JSON.stringify({ type: 'AUTH', token: this.clientConfig.apiKey }));
      }
    };

    this.ws.onmessage = (msg) => {
      try {
        const event: ExecutionEvent = JSON.parse(msg.data);
        const type = event.type.toLowerCase();
        this.emit('execution', event);
        if (type === 'rebalance') this.emit('rebalance', event);
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onerror = () => {
      this.emit('error', new Error('WebSocket connection error'));
    };
  }

  private emit(event: string, data: unknown): void {
    this.handlers.get(event)?.forEach((h) => h(data));
  }
}
