const { AdminClient, createRoom, SimulatedUser, calculatePercentiles } = require('./hush_load_harness');

const adminClient = new AdminClient();

/**
 * 1. Tiered Scalability Test (100, 250, 500, 750, 1000 users)
 * Creates realistic room distribution:
 * - Direct rooms (2 participants)
 * - Small group rooms (5-10 participants)
 * - Large group rooms (20 participants)
 */
async function runTieredLoadTest(targetUsers, durationSec = 15) {
  console.log(`\n==================================================`);
  console.log(`>>> STARTING TIER TEST: ${targetUsers} CONCURRENT USERS`);
  console.log(`==================================================`);

  const baselineMetrics = await adminClient.getMetrics();
  console.log(`[BASELINE METRICS] Conns: ${baselineMetrics?.activeWebsocketConnections}, Rooms: ${baselineMetrics?.activeRooms}, Heap: ${baselineMetrics?.jvmHeapUsedMb} MB, Threads: ${baselineMetrics?.threadCount}`);

  // Create room distribution
  // ~40% in direct rooms, ~30% in small group (6 users/room), ~30% in large group (20 users/room)
  const directUserCount = Math.floor(targetUsers * 0.4);
  const smallGroupUserCount = Math.floor(targetUsers * 0.3);
  const largeGroupUserCount = targetUsers - directUserCount - smallGroupUserCount;

  const directRoomCount = Math.ceil(directUserCount / 2);
  const smallGroupRoomCount = Math.ceil(smallGroupUserCount / 6);
  const largeGroupRoomCount = Math.ceil(largeGroupUserCount / 20);

  console.log(`[ROOM PLAN] Creating ${directRoomCount} Direct rooms, ${smallGroupRoomCount} Small Group rooms, ${largeGroupRoomCount} Large Group rooms`);

  const rooms = [];
  // Create direct rooms
  for (let i = 0; i < directRoomCount; i++) {
    const room = await createRoom('DIRECT', 60);
    rooms.push({ code: room.roomCode, type: 'DIRECT', capacity: 2, users: [] });
  }
  // Create small group rooms
  for (let i = 0; i < smallGroupRoomCount; i++) {
    const room = await createRoom('GROUP', 60);
    rooms.push({ code: room.roomCode, type: 'SMALL_GROUP', capacity: 6, users: [] });
  }
  // Create large group rooms
  for (let i = 0; i < largeGroupRoomCount; i++) {
    const room = await createRoom('GROUP', 60);
    rooms.push({ code: room.roomCode, type: 'LARGE_GROUP', capacity: 20, users: [] });
  }

  // Assign users to rooms
  const clients = [];
  let userIndex = 0;
  for (const r of rooms) {
    for (let c = 0; c < r.capacity && userIndex < targetUsers; c++) {
      userIndex++;
      const client = new SimulatedUser(userIndex, r.code, `User_${userIndex}`);
      r.users.push(client);
      clients.push(client);
    }
  }

  console.log(`[CONNECTING] Ramp-up ${clients.length} WebSocket connections...`);
  const connectStartTime = performance.now();
  let connectFailures = 0;
  let successfulConnections = 0;

  // Batch connect clients (50 at a time to avoid socket exhaustion)
  const batchSize = 50;
  for (let b = 0; b < clients.length; b += batchSize) {
    const batch = clients.slice(b, b + batchSize);
    const results = await Promise.allSettled(batch.map(c => c.connect()));
    results.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        successfulConnections++;
      } else {
        connectFailures++;
        console.warn(`[CONN FAIL] Client ${batch[idx].id}:`, res.reason?.message);
      }
    });
    // Small delay between connection batches
    await new Promise(r => setTimeout(r, 50));
  }

  const connectDurationMs = performance.now() - connectStartTime;
  console.log(`[CONNECTED] ${successfulConnections}/${clients.length} connected in ${connectDurationMs.toFixed(0)} ms (Failures: ${connectFailures})`);

  const activeMetrics = await adminClient.getMetrics();
  console.log(`[ACTIVE METRICS] Conns: ${activeMetrics?.activeWebsocketConnections}, Rooms: ${activeMetrics?.activeRooms}, Heap: ${activeMetrics?.jvmHeapUsedMb} MB, Threads: ${activeMetrics?.threadCount}`);

  // Message Sending Phase
  console.log(`[MESSAGING] Simulating steady messaging for ${durationSec} seconds...`);
  const msgStartTime = performance.now();
  let totalSent = 0;

  const activeClients = clients.filter(c => c.joined);
  
  // Every active client sends 1 message every 3 seconds
  const messageInterval = setInterval(() => {
    for (const client of activeClients) {
      if (Math.random() < 0.33) {
        if (client.sendMessage(`Hello from user ${client.id} [ts:${Date.now()}]`)) {
          totalSent++;
        }
      }
    }
  }, 1000);

  await new Promise(r => setTimeout(r, durationSec * 1000));
  clearInterval(messageInterval);

  // Wait 1.5s for remaining inflight broadcasts to arrive
  await new Promise(r => setTimeout(r, 1500));

  // Collect latencies
  const allLatencies = clients.flatMap(c => c.latencies);
  const latencyStats = calculatePercentiles(allLatencies);

  const postTestMetrics = await adminClient.getMetrics();
  
  // Teardown connections
  console.log(`[TEARDOWN] Disconnecting ${clients.length} clients...`);
  clients.forEach(c => {
    c.leave();
    c.close();
  });

  await new Promise(r => setTimeout(r, 2000));

  const finalMetrics = await adminClient.getMetrics();

  const report = {
    targetUsers,
    roomsCreated: rooms.length,
    establishedConnections: successfulConnections,
    failedConnections: connectFailures,
    connectDurationMs: Number(connectDurationMs.toFixed(2)),
    totalSentMessages: totalSent,
    latencies: latencyStats,
    baselineHeapMb: baselineMetrics?.jvmHeapUsedMb,
    peakHeapMb: activeMetrics?.jvmHeapUsedMb,
    finalHeapMb: finalMetrics?.jvmHeapUsedMb,
    threadCount: activeMetrics?.threadCount,
    messagesBroadcast: postTestMetrics?.messagesBroadcast,
    rateLimitedMessages: postTestMetrics?.rateLimitedMessages || 0,
    invalidMessages: postTestMetrics?.invalidMessages || 0
  };

  console.log(`[RESULT SUMMARY] Tier ${targetUsers} Users:`);
  console.log(`  Established: ${successfulConnections}/${targetUsers}`);
  console.log(`  Avg Latency: ${latencyStats.avg} ms | P95: ${latencyStats.p95} ms | P99: ${latencyStats.p99} ms`);
  console.log(`  Heap Peak: ${activeMetrics?.jvmHeapUsedMb} MB | Final: ${finalMetrics?.jvmHeapUsedMb} MB | Threads: ${activeMetrics?.threadCount}`);

  return report;
}

/**
 * 2. Single Large Room Broadcast Stress Test
 * Tests sequential synchronized(session) broadcast path under N-user fanout
 */
async function runSingleRoomStressTest(usersInSingleRoom, durationSec = 10) {
  console.log(`\n==================================================`);
  console.log(`>>> SINGLE LARGE ROOM STRESS TEST: ${usersInSingleRoom} USERS IN 1 ROOM`);
  console.log(`==================================================`);

  const room = await createRoom('GROUP', 60);
  console.log(`[SINGLE ROOM CREATED] Code: ${room.roomCode}`);

  const clients = [];
  for (let i = 1; i <= usersInSingleRoom; i++) {
    clients.push(new SimulatedUser(i, room.roomCode, `SingleRoom_User_${i}`));
  }

  // Connect all clients to this room
  console.log(`[CONNECTING] Connecting ${usersInSingleRoom} users to single room...`);
  const batchSize = 50;
  let connectedCount = 0;
  for (let b = 0; b < clients.length; b += batchSize) {
    const batch = clients.slice(b, b + batchSize);
    const results = await Promise.allSettled(batch.map(c => c.connect()));
    results.forEach(r => { if (r.status === 'fulfilled') connectedCount++; });
    await new Promise(r => setTimeout(r, 40));
  }

  console.log(`[SINGLE ROOM READY] ${connectedCount}/${usersInSingleRoom} clients joined single room ${room.roomCode}`);

  const baselineMetrics = await adminClient.getMetrics();

  // Send broadcast messages from user 1 every second
  const sender = clients[0];
  let messagesSent = 0;
  console.log(`[BROADCAST TEST] Sending high-fanout broadcast messages from User 1 to ${connectedCount - 1} recipients...`);

  const broadcastStart = performance.now();
  for (let m = 1; m <= 10; m++) {
    if (sender.sendMessage(`High fanout message ${m} to ${usersInSingleRoom} recipients`)) {
      messagesSent++;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  await new Promise(r => setTimeout(r, 1500)); // allow delivery

  const allLatencies = clients.flatMap(c => c.latencies);
  const latencyStats = calculatePercentiles(allLatencies);

  const activeMetrics = await adminClient.getMetrics();

  // Teardown
  clients.forEach(c => c.close());
  await new Promise(r => setTimeout(r, 1000));

  console.log(`[SINGLE ROOM RESULT] ${usersInSingleRoom} Users in 1 Room:`);
  console.log(`  Sent: ${messagesSent} broadcasts -> ${messagesSent * connectedCount} deliveries`);
  console.log(`  Avg Latency: ${latencyStats.avg} ms | P95: ${latencyStats.p95} ms | P99: ${latencyStats.p99} ms | Max: ${latencyStats.max} ms`);

  return {
    singleRoomSize: usersInSingleRoom,
    connectedCount,
    messagesSent,
    latencies: latencyStats,
    heapMb: activeMetrics?.jvmHeapUsedMb,
    threadCount: activeMetrics?.threadCount
  };
}

/**
 * 3. Reconnection Test
 * Connect 250 users -> disconnect 20% (50 users) -> reconnect -> verify restore
 */
async function runReconnectionTest(totalUsers = 250) {
  console.log(`\n==================================================`);
  console.log(`>>> RECONNECTION TEST: ${totalUsers} USERS, DISCONNECT & RECONNECT 20%`);
  console.log(`==================================================`);

  const roomCount = 25;
  const rooms = [];
  for (let i = 0; i < roomCount; i++) {
    const room = await createRoom('GROUP', 60);
    rooms.push(room.roomCode);
  }

  const clients = [];
  for (let i = 1; i <= totalUsers; i++) {
    const rCode = rooms[i % roomCount];
    clients.push(new SimulatedUser(i, rCode, `Reconn_User_${i}`));
  }

  // Connect all
  for (let b = 0; b < clients.length; b += 50) {
    await Promise.allSettled(clients.slice(b, b + 50).map(c => c.connect()));
  }

  const initialMetrics = await adminClient.getMetrics();
  console.log(`[INITIAL RECONN STATE] Active Conns: ${initialMetrics?.activeWebsocketConnections}, Participants: ${initialMetrics?.activeParticipants}`);

  // Pick 20% to disconnect
  const disconnectCount = Math.floor(totalUsers * 0.2);
  const disconnectClients = clients.slice(0, disconnectCount);
  console.log(`[DISCONNECTING] Intentionally closing ${disconnectCount} client sockets...`);
  disconnectClients.forEach(c => c.close());

  await new Promise(r => setTimeout(r, 1000));

  const afterDisconnectMetrics = await adminClient.getMetrics();
  console.log(`[AFTER DISCONNECT] Active Conns: ${afterDisconnectMetrics?.activeWebsocketConnections}, Participants: ${afterDisconnectMetrics?.activeParticipants}`);

  // Reconnect them
  console.log(`[RECONNECTING] Reconnecting ${disconnectCount} clients...`);
  const reconnectedClients = [];
  let reconnSuccess = 0;

  for (let i = 0; i < disconnectClients.length; i++) {
    const oldC = disconnectClients[i];
    const newC = new SimulatedUser(oldC.id, oldC.roomCode, oldC.username);
    reconnectedClients.push(newC);
  }

  const reconnResults = await Promise.allSettled(reconnectedClients.map(c => c.connect()));
  reconnResults.forEach(r => { if (r.status === 'fulfilled') reconnSuccess++; });

  const finalReconnMetrics = await adminClient.getMetrics();
  console.log(`[FINAL RECONN METRICS] Active Conns: ${finalReconnMetrics?.activeWebsocketConnections}, Participants: ${finalReconnMetrics?.activeParticipants}`);

  // Cleanup
  clients.concat(reconnectedClients).forEach(c => c.close());
  await new Promise(r => setTimeout(r, 1000));

  return {
    totalUsers,
    disconnected: disconnectCount,
    reconnected: reconnSuccess,
    initialConns: initialMetrics?.activeWebsocketConnections,
    afterDisconnectConns: afterDisconnectMetrics?.activeWebsocketConnections,
    finalConns: finalReconnMetrics?.activeWebsocketConnections
  };
}

/**
 * 4. Room Expiration Under Load Test
 * Verify active room destruction and socket closure when room TTL expires
 */
async function runRoomExpirationTest() {
  console.log(`\n==================================================`);
  console.log(`>>> ROOM EXPIRATION UNDER LOAD TEST`);
  console.log(`==================================================`);

  // Note: room creation allows minimum 30 min in API, but empty room grace period is 5 sec or expired rooms.
  // We can create a room, add users, then have users LEAVE to trigger empty room grace period destruction!
  const room = await createRoom('GROUP', 30);
  console.log(`[EXPIRATION TEST ROOM] Created room ${room.roomCode}`);

  const clients = [];
  for (let i = 1; i <= 10; i++) {
    clients.push(new SimulatedUser(i, room.roomCode, `ExpUser_${i}`));
  }

  await Promise.allSettled(clients.map(c => c.connect()));
  const beforeMetrics = await adminClient.getMetrics();
  console.log(`[EXP TEST BEFORE LEAVE] Active Rooms: ${beforeMetrics?.activeRooms}, Destroyed Rooms: ${beforeMetrics?.roomsDestroyed}`);

  // Send 5 messages
  clients[0].sendMessage('Message before expiration trigger');
  await new Promise(r => setTimeout(r, 500));

  // All clients leave
  console.log(`[EXP TEST] All clients leaving room ${room.roomCode}...`);
  clients.forEach(c => c.leave());
  clients.forEach(c => c.close());

  console.log(`[EXP TEST] Waiting 7 seconds for Empty Room Grace Period (5s) to trigger room destruction...`);
  await new Promise(r => setTimeout(r, 7000));

  const afterMetrics = await adminClient.getMetrics();
  console.log(`[EXP TEST AFTER GRACE PERIOD] Active Rooms: ${afterMetrics?.activeRooms}, Destroyed Rooms: ${afterMetrics?.roomsDestroyed}, Empty Rooms Destroyed: ${afterMetrics?.emptyRoomsDestroyed}`);

  return {
    initialActiveRooms: beforeMetrics?.activeRooms,
    finalActiveRooms: afterMetrics?.activeRooms,
    emptyRoomsDestroyed: afterMetrics?.emptyRoomsDestroyed
  };
}

module.exports = {
  runTieredLoadTest,
  runSingleRoomStressTest,
  runReconnectionTest,
  runRoomExpirationTest
};
