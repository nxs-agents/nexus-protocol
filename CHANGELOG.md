# Changelog

All notable changes to this project are documented here.

---

## [0.1.0] - 2025-04-08

### Added

- Initial SDK implementation (`@nexus/sdk`)
  - `NexusClient` with `deploy`, `getAgent`, `listAgents`
  - `Agent` class with WebSocket event streaming
  - Full TypeScript types
- Core agent engine (`@nexus/core`)
  - `AgentEngine` block-polling loop
  - `BaseStrategy` abstract class
  - `YieldOptimizer` strategy with gas-aware rebalancing
  - `ArbTrader` strategy with Flashbots bundle support
  - `OnchainVerifier` for signature validation
- Smart contracts
  - `NexusRegistry.sol` for agent registration
  - `AgentVault.sol` with self-custodial spending limits
  - `INexusAgent.sol` interface
- Documentation
  - Architecture diagrams and sequence flows
  - Agent type reference
  - REST API and WebSocket reference
  - Security model
  - Getting started guide
- Examples
  - `yield-optimizer.ts`
  - `arb-trader.ts`
