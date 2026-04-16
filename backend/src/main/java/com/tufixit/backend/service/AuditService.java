package com.tufixit.backend.service;

import com.tufixit.backend.entity.AdminAuditLog;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.AdminAuditLogRepository;
import com.tufixit.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AdminAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /**
     * Log an admin action. Automatically resolves the current admin and IP.
     */
    public void logAction(AdminAuditLog.AuditAction action, String targetType, Long targetId, String description) {
        try {
            User admin = getCurrentAdmin();
            String ip = getClientIp();

            AdminAuditLog entry = AdminAuditLog.builder()
                    .adminId(admin.getId())
                    .adminName(admin.getFirstName() + " " + admin.getLastName())
                    .action(action)
                    .targetType(targetType)
                    .targetId(targetId)
                    .description(description)
                    .ipAddress(ip)
                    .build();

            auditLogRepository.save(entry);
            log.info("[AUDIT] {} by {} ({}): {} — target: {}:{}", action, admin.getEmail(), ip, description, targetType, targetId);
        } catch (Exception e) {
            // Audit logging should never break the main operation
            log.error("[AUDIT] Failed to log action: {}", e.getMessage());
        }
    }

    public Page<AdminAuditLog> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findByOrderByCreatedAtDesc(pageable);
    }

    public Page<AdminAuditLog> getAuditLogsByAdmin(Long adminId, Pageable pageable) {
        return auditLogRepository.findByAdminIdOrderByCreatedAtDesc(adminId, pageable);
    }

    public Page<AdminAuditLog> getAuditLogsByAction(AdminAuditLog.AuditAction action, Pageable pageable) {
        return auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
    }

    public List<AdminAuditLog> getAuditLogsForTarget(String targetType, Long targetId) {
        return auditLogRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(targetType, targetId);
    }

    private User getCurrentAdmin() {
        String emailOrPhone = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(emailOrPhone)
                .or(() -> userRepository.findByPhoneNumber(emailOrPhone))
                .orElseThrow(() -> new RuntimeException("Admin not found"));
    }

    private String getClientIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                String xff = request.getHeader("X-Forwarded-For");
                if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
                String realIp = request.getHeader("X-Real-IP");
                if (realIp != null && !realIp.isBlank()) return realIp;
                return request.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return "unknown";
    }
}
