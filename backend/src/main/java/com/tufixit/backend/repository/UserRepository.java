package com.tufixit.backend.repository;

import com.tufixit.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    
    Optional<User> findByPhoneNumber(String phoneNumber);
    
    boolean existsByEmail(String email);
    
    boolean existsByPhoneNumber(String phoneNumber);
    
    @Query(value = "SELECT * FROM users u WHERE u.role = :#{#role.name()} AND u.is_active = true " +
           "ORDER BY CASE u.vetting_level WHEN 'PRO' THEN 0 WHEN 'VERIFIED' THEN 1 ELSE 2 END ASC, " +
           "u.trust_score DESC, u.total_jobs_completed DESC",
           nativeQuery = true)
    List<User> findByRole(@Param("role") User.UserRole role);
    
    @Query("SELECT u FROM User u WHERE u.role = 'WORKER' AND u.vettingLevel = :level AND u.isActive = true")
    List<User> findWorkersByVettingLevel(@Param("level") User.VettingLevel level);
    
    @Query(value = "SELECT * FROM users u WHERE u.role = 'WORKER' AND u.is_active = true " +
           "AND (6371 * acos(cos(radians(:latitude)) * cos(radians(u.latitude)) * " +
           "cos(radians(u.longitude) - radians(:longitude)) + sin(radians(:latitude)) * " +
           "sin(radians(u.latitude)))) < :radiusKm " +
           "ORDER BY CASE u.vetting_level WHEN 'PRO' THEN 0 WHEN 'VERIFIED' THEN 1 ELSE 2 END ASC, " +
           "u.trust_score DESC", nativeQuery = true)
    List<User> findNearbyWorkers(@Param("latitude") Double latitude, 
                                  @Param("longitude") Double longitude, 
                                  @Param("radiusKm") Double radiusKm);
}
