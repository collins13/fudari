package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    
    /** Returns the single active subscription (at most one should exist per artisan) */
    Optional<Subscription> findByArtisanIdAndStatus(Long artisanId, Subscription.SubscriptionStatus status);

    /** Returns all subscriptions with a given status for an artisan — used in BookingService */
    List<Subscription> findAllByArtisanIdAndStatus(Long artisanId, Subscription.SubscriptionStatus status);

    List<Subscription> findByArtisanIdOrderByCreatedAtDesc(Long artisanId);
    
    List<Subscription> findByStatusAndEndDateBefore(Subscription.SubscriptionStatus status, LocalDateTime date);
    
    long countByArtisanIdAndStatus(Long artisanId, Subscription.SubscriptionStatus status);
}
