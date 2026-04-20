# Getting Started

> The SDK is not yet published to npm. This document describes the intended developer experience ahead of the initial release.

---

## Prerequisites

- Node.js 18+
- An Ethereum wallet with mainnet ETH for gas
- An Alchemy (or equivalent) RPC URL
- USDC or ETH to fund your agent

---

## Installation

```bash
npm install @nexus/sdk
```

---

## Configuration

Create a `.env` file in your project root:

```env
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xyour_agent_wallet_private_key
NEXUS_API_KEY=your_nexus_api_key
```

Your agent wallet should be a dedicated wallet, separate from your main wallet. It only needs permission to interact with the protocols you configure.

---

## Deploy your first agent

```typescript
import { NexusClient } from '@nexus/sdk';

const client = new NexusClient({
  network: 'mainnet',
  rpcUrl: process.env.RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
  apiKey: process.env.NEXUS_API_KEY,
});

const agent = await client.deploy({
  strategy: 'yield_optimizer',
  riskTolerance: 'moderate',
  capital: {
    amount: '10000',
    token: 'USDC',
  },
  protocols: ['aave', 'lido', 'uniswap'],
});

console.log(`Agent deployed: ${agent.id}`);
console.log(`Block: ${agent.registrationBlock}`);
```

---

## Listen to execution events

```typescript
agent.on('execution', (event) => {
  console.log(`[${event.type}] ${event.description}`);
  console.log(`tx: ${event.txHash}`);
});

agent.on('rebalance', (event) => {
  console.log(`Rebalanced: ${event.fromProtocol} -> ${event.toProtocol}`);
});

agent.on('error', (err) => {
  console.error(err);
});
```

---

## Stop or pause an agent

```typescript
await agent.pause();

await agent.resume();

await agent.stop();
```

---

## Fetch agent status

```typescript
const status = await agent.getStatus();
// Returns current strategy, execution count, last block, and status
```

---

## Next steps

- [Agent Types](agents.md) - Explore all available strategies
- [API Reference](api-reference.md) - Full SDK and REST API reference
- [Architecture](architecture.md) - How NEXUS works under the hood
- [Security](security.md) - Security model and best practices
