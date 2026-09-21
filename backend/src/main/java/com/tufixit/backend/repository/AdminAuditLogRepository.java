package com.tufixit.backend.repository;

import com.tufixit.backend.entity.AdminAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    Page<AdminAuditLog> findByOrderByCreatedAtDesc(Pageable pageable);

    Page<AdminAuditLog> findByAdminIdOrderByCreatedAtDesc(Long adminId, Pageable pageable);

    Page<AdminAuditLog> findByActionOrderByCreatedAtDesc(AdminAuditLog.AuditAction action, Pageable pageable);

    Page<AdminAuditLog> findByTargetTypeOrderByCreatedAtDesc(String targetType, Pageable pageable);

    List<AdminAuditLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId);

    List<AdminAuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime from, LocalDateTime to);
}
