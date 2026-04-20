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

  console.log('Deploying arb trader agent...');

  const agent = await client.deploy({
    strategy: 'arb_trader',
    riskTolerance: 'aggressive',
    capital: {
      amount: '5',
      token: 'ETH',
    },
    protocols: ['uniswap', 'curve', 'balancer'],
    maxSlippage: 0.05,
  });

  console.log(`Agent deployed: ${agent.id}`);

  let totalPnl = 0;
  let trades = 0;

  agent.on('execution', (event) => {
    if (event.type === 'SWAP') {
      trades++;
      const pnlNum = parseFloat(event.pnl?.replace(/[^0-9.-]/g, '') ?? '0');
      totalPnl += pnlNum;
      console.log(`Trade #${trades}: ${event.description}`);
      console.log(`  pnl: ${event.pnl} | total: $${totalPnl.toFixed(2)}`);
    }
  });

  agent.on('error', (err) => {
    console.error('Agent error:', err.message);
  });

  console.log('Arb agent running. Press Ctrl+C to stop.');

  process.on('SIGINT', async () => {
    console.log(`\nStopping. Final PnL: $${totalPnl.toFixed(2)} over ${trades} trades.`);
    await agent.stop();
    process.exit(0);
  });
}

main().catch(console.error);
