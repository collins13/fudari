package com.tufixit.backend.repository;

import com.tufixit.backend.entity.WhatsAppSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface WhatsAppSessionRepository extends JpaRepository<WhatsAppSession, Long> {

    /**
     * Find the most recent ACTIVE session for a customer phone number.
     * Used on every incoming webhook to resume an in-progress booking flow.
     */
    Optional<WhatsAppSession> findTopByCustomerPhoneAndSessionStatusOrderByUpdatedAtDesc(
            String customerPhone, WhatsAppSession.SessionStatus sessionStatus);

    /**
     * Abandon sessions that have had no activity for more than {@code cutoff} minutes.
     * Scheduled to run every 10 minutes via {@link com.tufixit.backend.service.WhatsAppBotService}.
     */
    @Modifying
    @Query("""
        UPDATE WhatsAppSession s
        SET s.sessionStatus = 'ABANDONED', s.state = 'ABANDONED'
        WHERE s.sessionStatus = 'ACTIVE'
          AND s.updatedAt < :cutoff
    """)
    int abandonStaleSessions(LocalDateTime cutoff);
}
