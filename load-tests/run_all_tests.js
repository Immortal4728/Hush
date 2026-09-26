/**
 * Master HUSH Load Test Orchestrator
 * Runs all Tiered Load Tests (100 -> 1000+), Single Room Broadcast Tests,
 * Reconnection Tests, and Expiration Tests, and formats a complete report.
 */

const fs = require('fs');
const path = require('path');
const {
  runTieredLoadTest,
  runSingleRoomStressTest,
  runReconnectionTest,
  runRoomExpirationTest
} = require('./scenarios');

async function main() {
  console.log(`================================================================`);
  console.log(`            HUSH WEBSOCKET LOAD TESTING SUITE                 `);
  console.log(`================================================================`);
  console.log(`Start Time: ${new Date().toISOString()}`);

  const results = {
    tieredResults: [],
    singleRoomResults: [],
    reconnectionResults: null,
    expirationResults: null,
    summaryTable: []
  };

  try {
    // 1. TIERED LOAD TESTS
    const tiers = [100, 250, 500, 750, 1000];
    for (const tier of tiers) {
      const res = await runTieredLoadTest(tier, 12);
      results.tieredResults.push(res);
      
      // Pause between tiers for GC & connection stabilization
      console.log(`[PAUSE] Waiting 4 seconds before next tier...`);
      await new Promise(r => setTimeout(r, 4000));
    }

    // Extended Tier if 1,000 passes cleanly (e.g. 1250)
    const tier1000 = results.tieredResults.find(r => r.targetUsers === 1000);
    if (tier1000 && tier1000.failedConnections === 0 && tier1000.latencies.avg < 100) {
      console.log(`\n[EXTENDED TIER] 1,000 users passed cleanly. Testing 1,250 users...`);
      const extRes = await runTieredLoadTest(1250, 10);
      results.tieredResults.push(extRes);
      await new Promise(r => setTimeout(r, 4000));
    }

    // 2. SINGLE LARGE ROOM STRESS TESTS
    const singleRoomSizes = [100, 250, 500];
    for (const size of singleRoomSizes) {
      const res = await runSingleRoomStressTest(size, 10);
      results.singleRoomResults.push(res);
      await new Promise(r => setTimeout(r, 3000));
    }

    // 3. RECONNECTION TEST
    results.reconnectionResults = await runReconnectionTest(250);
    await new Promise(r => setTimeout(r, 3000));

    // 4. ROOM EXPIRATION TEST
    results.expirationResults = await runRoomExpirationTest();

    // Generate JSON report artifact
    const reportPath = path.join(__dirname, 'load_test_results.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n[COMPLETE] Benchmark results saved to ${reportPath}`);

  } catch (e) {
    console.error(`[FATAL LOAD TEST ERROR]:`, e);
    process.exit(1);
  }
}

main();
