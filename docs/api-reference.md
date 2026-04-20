# API Reference

## REST API

Base URL: `https://api.nxsagents.io/v1`

All requests require an `Authorization: Bearer <API_KEY>` header.

---

### Agents

#### Deploy agent

```
POST /agents
```

**Body:**

```json
{
  "strategy": "yield_optimizer",
  "risk_tolerance": "moderate",
  "capital_usdc": 10000,
  "chain": "ethereum",
  "protocols": ["aave", "lido", "uniswap"]
}
```

**Response:**

```json
{
  "id": "7gXK...Fd9A",
  "status": "active",
  "strategy": "yield_optimizer",
  "registration_block": 19842211,
  "apy_current": 8.4,
  "created_at": "2025-04-08T14:32:01Z"
}
```

---

#### Get agent

```
GET /agents/:id
```

**Response:**

```json
{
  "id": "7gXK...Fd9A",
  "status": "active",
  "strategy": "yield_optimizer",
  "uptime": 99.97,
  "apy_current": 8.4,
  "pnl_total_usd": 2841.20,
  "pnl_pct": 2.84,
  "last_block": 19842211,
  "executions": 1420
}
```

---

#### List agents

```
GET /agents
```

**Query params:**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by `active`, `paused`, `stopped` |
| `strategy` | string | Filter by strategy type |
| `limit` | number | Results per page (default 20, max 100) |
| `cursor` | string | Pagination cursor |

---

#### Pause agent

```
POST /agents/:id/pause
```

#### Resume agent

```
POST /agents/:id/resume
```

#### Stop agent

```
DELETE /agents/:id
```

---

### Executions

#### List executions

```
GET /agents/:id/executions
```

**Response:**

```json
{
  "data": [
    {
      "id": "exec_1a2b3c",
      "type": "REBALANCE",
      "from_protocol": "lido",
      "to_protocol": "aave",
      "amount_usd": 10000,
      "pnl_usd": 184.20,
      "gas_eth": 0.0018,
      "tx_hash": "0xabc...",
      "block": 19842211,
      "timestamp": "2025-04-08T14:38:45Z"
    }
  ],
  "next_cursor": "..."
}
```

---

### Market

#### Get pool data

```
GET /market/pools
```

**Query params:**

| Param | Type | Description |
|---|---|---|
| `protocol` | string | Filter by protocol |
| `token` | string | Filter by token (e.g. `USDC`) |
| `min_apy` | number | Minimum APY filter |
| `min_tvl` | number | Minimum TVL in USD |

**Response:**

```json
{
  "data": [
    {
      "protocol": "lido",
      "pool": "stETH",
      "apy": 8.4,
      "tvl_usd": 34000000000,
      "token": "ETH",
      "updated_at": "2025-04-08T14:32:04Z"
    }
  ]
}
```

---

## WebSocket API

Connect to: `wss://stream.nxsagents.io/agents/:id`

**Authentication:**

Send on connect:

```json
{ "type": "AUTH", "token": "your_api_key" }
```

**Event types:**

| Type | Description |
|---|---|
| `EXECUTION` | Agent executed a trade or rebalance |
| `REBALANCE` | Capital moved between protocols |
| `SWAP` | Token swap executed |
| `APY_UPDATE` | APY change detected |
| `ONCHAIN_VERIFY` | On-chain proof confirmed |
| `ERROR` | Execution failed |

**Example stream:**

```json
{ "type": "APY_UPDATE", "protocol": "aave", "apy": 9.1, "delta": "+0.7%" }
{ "type": "REBALANCE", "from": "lido", "to": "aave", "amount_usd": 10000 }
{ "type": "EXECUTION", "tx_hash": "0x...", "block": 19842212, "pnl": "+$41.20" }
{ "type": "ONCHAIN_VERIFY", "verified": true, "ms": 142 }
```

---

## SDK Reference

### NexusClient

```typescript
new NexusClient(config: ClientConfig)
```

| Option | Type | Required | Description |
|---|---|---|---|
| `network` | string | Yes | `mainnet` or `testnet` |
| `rpcUrl` | string | Yes | Ethereum RPC endpoint |
| `privateKey` | string | Yes | Agent wallet private key |
| `apiKey` | string | No | NEXUS API key |

### client.deploy(config)

Deploys a new agent onchain and returns an `Agent` instance.

### client.getAgent(id)

Fetches an existing agent by ID.

### client.listAgents()

Returns all agents associated with the connected wallet.

### agent.on(event, handler)

Subscribe to real-time agent events over WebSocket.

### agent.getStatus()

Returns current agent status, PnL, and execution count.

### agent.pause() / agent.resume() / agent.stop()

Control agent execution state.
