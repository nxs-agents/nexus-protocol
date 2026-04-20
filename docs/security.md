# Security

## Self-custody model

NEXUS agents never hold user funds directly. All capital remains in the user-controlled `AgentVault` contract. Agents interact with vaults through signed approvals with explicit spending limits.

```
User Wallet
    │
    │ deposit + set spending limits
    ▼
AgentVault.sol
    │
    │ signed approvals only
    ▼
Agent (executes strategy)
    │
    │ calls vault with valid signature
    ▼
DeFi Protocol (Aave, Uniswap, etc.)
```

At no point does the NEXUS infrastructure have access to user funds or private keys.

---

## Agent key model

Each agent uses a dedicated signing key that is separate from the user's main wallet. This key can only:

- Interact with protocols explicitly whitelisted in the vault config
- Spend up to the configured per-transaction and daily limits
- Call `pause()` or `stop()` on itself

It cannot:

- Transfer funds to arbitrary addresses
- Modify vault spending limits
- Access any wallet outside the configured vault

---

## On-chain verification

Every agent action produces an on-chain record. The `OnchainVerifier` contract validates:

1. The action was signed by the registered agent key
2. The action is within the agent's configured strategy constraints
3. The vault had sufficient balance and approval

If any check fails, the transaction reverts and nothing executes.

---

## Flashbots protection

All arbitrage and rebalancing transactions are submitted via Flashbots Protect by default. This prevents:

- Frontrunning by MEV searchers
- Sandwich attacks on large rebalances
- Transaction reverts from slippage manipulation

---

## Audits

Smart contracts have not yet been audited. Audits will be completed before mainnet deployment. Reports will be published in this repository when available.

| Contract | Status |
|---|---|
| NexusRegistry.sol | Pending audit |
| AgentVault.sol | Pending audit |
| OnchainVerifier.sol | Pending audit |

---

## Bug reports

To report a security vulnerability, open a private GitHub issue or contact us via [Twitter](https://x.com/NXSAgents).

---

## Best practices

- Always use a dedicated agent wallet with only the funds your agent needs
- Set conservative spending limits when first deploying
- Monitor the execution log during the first 24 hours
- Start with `riskTolerance: 'conservative'` before increasing exposure
