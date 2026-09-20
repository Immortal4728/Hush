package com.hush.lifecycle;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Component
public class ExpirationScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ExpirationScheduler.class);

    private final RoomLifecycleService roomLifecycleService;

    public ExpirationScheduler(RoomLifecycleService roomLifecycleService) {
        this.roomLifecycleService = Objects.requireNonNull(roomLifecycleService, "roomLifecycleService must not be null");
    }

    @Scheduled(fixedRateString = "${hush.lifecycle.check-interval-ms:1000}")
    public void scheduleExpirationCheck() {
        try {
            roomLifecycleService.processExpirations();
        } catch (Exception e) {
            logger.error("Error occurred during scheduled room expiration check", e);
        }
    }
}
