package com.hush.metrics;

import com.hush.config.HushRateLimitProperties;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.ThreadMXBean;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.atomic.LongAdder;

@Service
public class MetricsService {

    private final Instant startTime = Instant.now();
    private final HushRateLimitProperties rateLimitProperties;

    // Connections
    private final LongAdder connectionAttempts = new LongAdder();
    private final LongAdder rejectedConnections = new LongAdder();
    private final LongAdder connectionFailures = new LongAdder();
    private final LongAdder disconnects = new LongAdder();

    // Rooms
    private final LongAdder roomsCreated = new LongAdder();
    private final LongAdder roomsDestroyed = new LongAdder();
    private final LongAdder roomsExpired = new LongAdder();
    private final LongAdder emptyRoomsDestroyed = new LongAdder();

    // Participants
    private final LongAdder joinAttempts = new LongAdder();
    private final LongAdder successfulJoins = new LongAdder();
    private final LongAdder rejectedJoins = new LongAdder();
    private final LongAdder leaveEvents = new LongAdder();

    // Messaging
    private final LongAdder messagesReceived = new LongAdder();
    private final LongAdder messagesBroadcast = new LongAdder();
    private final LongAdder rateLimitedMessages = new LongAdder();
    private final LongAdder invalidMessages = new LongAdder();

    // Latency trackers (nanoseconds)
    private final LongAdder totalMsgProcessingNano = new LongAdder();
    private final LongAdder msgProcessingCount = new LongAdder();
    private final LongAdder totalBroadcastNano = new LongAdder();
    private final LongAdder broadcastCount = new LongAdder();

    public MetricsService(HushRateLimitProperties rateLimitProperties) {
        this.rateLimitProperties = Objects.requireNonNull(rateLimitProperties);
    }

    // Connection events
    public void recordConnectionAttempt() { connectionAttempts.increment(); }
    public void recordConnectionRejected() { rejectedConnections.increment(); }
    public void recordConnectionFailure() { connectionFailures.increment(); }
    public void recordDisconnect() { disconnects.increment(); }

    // Room events
    public void recordRoomCreated() { roomsCreated.increment(); }
    public void recordRoomDestroyed() { roomsDestroyed.increment(); }
    public void recordRoomExpired() { roomsExpired.increment(); }
    public void recordEmptyRoomDestroyed() { emptyRoomsDestroyed.increment(); }

    // Participant events
    public void recordJoinAttempt() { joinAttempts.increment(); }
    public void recordSuccessfulJoin() { successfulJoins.increment(); }
    public void recordRejectedJoin() { rejectedJoins.increment(); }
    public void recordLeaveEvent() { leaveEvents.increment(); }

    // Messaging events
    public void recordMessageReceived() { messagesReceived.increment(); }
    public void recordMessageBroadcast(int recipientCount) { messagesBroadcast.add(recipientCount); }
    public void recordRateLimitedMessage() { rateLimitedMessages.increment(); }
    public void recordInvalidMessage() { invalidMessages.increment(); }

    public void recordMessageProcessingLatency(long durationNano) {
        totalMsgProcessingNano.add(durationNano);
        msgProcessingCount.increment();
    }

    public void recordBroadcastLatency(long durationNano) {
        totalBroadcastNano.add(durationNano);
        broadcastCount.increment();
    }

    public OperationalMetricsSnapshot getSnapshot(int activeConn, int activeRoomsCount, int directRoomsCount, int groupRoomsCount, int activeParticipantsCount) {
        Runtime runtime = Runtime.getRuntime();
        MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
        ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();

        long heapUsedMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
        long heapCommittedMb = runtime.totalMemory() / (1024 * 1024);
        long heapMaxMb = runtime.maxMemory() / (1024 * 1024);
        long nonHeapUsedMb = memoryBean.getNonHeapMemoryUsage().getUsed() / (1024 * 1024);

        int threadCount = threadBean.getThreadCount();
        int availableProcessors = runtime.availableProcessors();
        long uptimeSec = Duration.between(startTime, Instant.now()).getSeconds();

        double avgMsgProcessingMs = msgProcessingCount.sum() == 0 ? 0.0 :
                (totalMsgProcessingNano.sum() / (double) msgProcessingCount.sum()) / 1_000_000.0;
        double avgBroadcastMs = broadcastCount.sum() == 0 ? 0.0 :
                (totalBroadcastNano.sum() / (double) broadcastCount.sum()) / 1_000_000.0;

        return new OperationalMetricsSnapshot(
                activeConn,
                rateLimitProperties.getWebsocket().getMaxConnections(),
                connectionAttempts.sum(),
                rejectedConnections.sum(),
                connectionFailures.sum(),
                disconnects.sum(),
                activeRoomsCount,
                directRoomsCount,
                groupRoomsCount,
                roomsCreated.sum(),
                roomsDestroyed.sum(),
                roomsExpired.sum(),
                emptyRoomsDestroyed.sum(),
                activeParticipantsCount,
                joinAttempts.sum(),
                successfulJoins.sum(),
                rejectedJoins.sum(),
                leaveEvents.sum(),
                messagesReceived.sum(),
                messagesBroadcast.sum(),
                rateLimitedMessages.sum(),
                invalidMessages.sum(),
                avgMsgProcessingMs,
                avgBroadcastMs,
                heapUsedMb,
                heapCommittedMb,
                heapMaxMb,
                nonHeapUsedMb,
                threadCount,
                availableProcessors,
                uptimeSec
        );
    }

    public record OperationalMetricsSnapshot(
            int activeWebsocketConnections,
            int maxConfiguredWebsocketConnections,
            long connectionAttempts,
            long rejectedConnections,
            long connectionFailures,
            long disconnects,
            int activeRooms,
            int directRooms,
            int groupRooms,
            long roomsCreated,
            long roomsDestroyed,
            long roomsExpired,
            long emptyRoomsDestroyed,
            int activeParticipants,
            long joinAttempts,
            long successfulJoins,
            long rejectedJoins,
            long leaveEvents,
            long messagesReceived,
            long messagesBroadcast,
            long rateLimitedMessages,
            long invalidMessages,
            double avgMessageProcessingLatencyMs,
            double avgBroadcastLatencyMs,
            long jvmHeapUsedMb,
            long jvmHeapCommittedMb,
            long jvmHeapMaxMb,
            long jvmNonHeapUsedMb,
            int threadCount,
            int availableProcessors,
            long uptimeSeconds
    ) {}
}
