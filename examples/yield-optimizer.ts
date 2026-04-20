import { NexusClient } from '@nexus/sdk';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const client = new NexusClient({
    network: 'mainnet',
    rpcUrl: process.env.RPC_URL!,
    privateKey: process.env.PRIVATE_KEY!,
    apiKey: process.env.NEXUS_API_KEY,
  });

  console.log('Deploying yield optimizer agent...');

  const agent = await client.deploy({
    strategy: 'yield_optimizer',
    riskTolerance: 'moderate',
    capital: {
      amount: '10000',
      token: 'USDC',
    },
    protocols: ['aave', 'lido', 'uniswap'],
    rebalanceThreshold: 0.5,
    maxSlippage: 0.1,
  });

  console.log(`Agent deployed: ${agent.id}`);

  agent.on('execution', (event) => {
    console.log(`[${event.type}] ${event.description}`);
    if (event.txHash) console.log(`  tx: ${event.txHash}`);
    if (event.pnl) console.log(`  pnl: ${event.pnl}`);
  });

  agent.on('rebalance', (event) => {
    console.log(`Rebalanced: ${event.fromProtocol} -> ${event.toProtocol}`);
    console.log(`  amount: $${event.amountUsd?.toLocaleString()}`);
  });

  agent.on('error', (err) => {
    console.error('Agent error:', err.message);
  });

  console.log('Agent running. Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    console.log('\nStopping agent...');
    await agent.stop();
    process.exit(0);
  });
}

main().catch(console.error);
