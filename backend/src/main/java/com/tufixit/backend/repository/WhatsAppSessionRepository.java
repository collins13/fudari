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

    /**
     * Soft-expire ACTIVE sessions idle longer than {@code softCutoff} (30 min)
     * but not yet past the hard cutoff. These become EXPIRED and eligible for resume.
     */
    @Modifying
    @Query("""
        UPDATE WhatsAppSession s
        SET s.sessionStatus = 'EXPIRED', s.previousState = s.state
        WHERE s.sessionStatus = 'ACTIVE'
          AND s.updatedAt < :softCutoff
    """)
    int expireStaleSessions(LocalDateTime softCutoff);

    /**
     * Hard-abandon sessions that have been EXPIRED longer than {@code hardCutoff} (2 hrs).
     */
    @Modifying
    @Query("""
        UPDATE WhatsAppSession s
        SET s.sessionStatus = 'ABANDONED', s.state = 'ABANDONED'
        WHERE s.sessionStatus = 'EXPIRED'
          AND s.updatedAt < :hardCutoff
    """)
    int abandonExpiredSessions(LocalDateTime hardCutoff);
}
