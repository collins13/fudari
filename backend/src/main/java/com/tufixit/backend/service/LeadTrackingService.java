package com.tufixit.backend.service;

import com.tufixit.backend.entity.LeadTracking;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.LeadTrackingRepository;
import com.tufixit.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadTrackingService {

    private final LeadTrackingRepository leadTrackingRepository;
    private final UserRepository userRepository;

    @Transactional
    public void trackProfileView(Long artisanId, HttpServletRequest request) {
        trackLead(artisanId, LeadTracking.LeadType.PROFILE_VIEW, request);
    }

    @Transactional
    public void trackCallClick(Long artisanId, HttpServletRequest request) {
        trackLead(artisanId, LeadTracking.LeadType.CALL_CLICK, request);
    }

    @Transactional
    public void trackWhatsAppClick(Long artisanId, HttpServletRequest request) {
        trackLead(artisanId, LeadTracking.LeadType.WHATSAPP_CLICK, request);
    }

    private void trackLead(Long artisanId, LeadTracking.LeadType leadType, HttpServletRequest request) {
        User artisan = userRepository.findById(artisanId)
                .orElseThrow(() -> new RuntimeException("Artisan not found"));

        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null) ip = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");

        LeadTracking lead = LeadTracking.builder()
                .artisan(artisan)
                .leadType(leadType)
                .visitorIp(ip)
                .userAgent(userAgent)
                .build();

        leadTrackingRepository.save(lead);
        log.debug("Tracked {} for artisan {}", leadType, artisanId);
    }

    public Map<String, Long> getLeadStats() {
        User user = getCurrentUser();
        Long artisanId = user.getId();

        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        long profileViews = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisanId, LeadTracking.LeadType.PROFILE_VIEW, thirtyDaysAgo);
        long callClicks = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisanId, LeadTracking.LeadType.CALL_CLICK, thirtyDaysAgo);
        long whatsappClicks = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisanId, LeadTracking.LeadType.WHATSAPP_CLICK, thirtyDaysAgo);

        Map<String, Long> stats = new HashMap<>();
        stats.put("profileViews", profileViews);
        stats.put("callClicks", callClicks);
        stats.put("whatsappClicks", whatsappClicks);
        stats.put("totalLeads", profileViews + callClicks + whatsappClicks);

        // All-time totals
        long totalViews = leadTrackingRepository.countByArtisanIdAndLeadType(artisanId, LeadTracking.LeadType.PROFILE_VIEW);
        long totalCalls = leadTrackingRepository.countByArtisanIdAndLeadType(artisanId, LeadTracking.LeadType.CALL_CLICK);
        long totalWhatsapp = leadTrackingRepository.countByArtisanIdAndLeadType(artisanId, LeadTracking.LeadType.WHATSAPP_CLICK);

        stats.put("totalProfileViewsAllTime", totalViews);
        stats.put("totalCallClicksAllTime", totalCalls);
        stats.put("totalWhatsAppClicksAllTime", totalWhatsapp);

        return stats;
    }

    public Map<String, Long> getLeadStatsForArtisan(Long artisanId) {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);

        long profileViews = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisanId, LeadTracking.LeadType.PROFILE_VIEW, thirtyDaysAgo);
        long callClicks = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisanId, LeadTracking.LeadType.CALL_CLICK, thirtyDaysAgo);
        long whatsappClicks = leadTrackingRepository.countByArtisanIdAndLeadTypeSince(
                artisanId, LeadTracking.LeadType.WHATSAPP_CLICK, thirtyDaysAgo);

        Map<String, Long> stats = new HashMap<>();
        stats.put("profileViews", profileViews);
        stats.put("callClicks", callClicks);
        stats.put("whatsappClicks", whatsappClicks);
        stats.put("totalLeads", profileViews + callClicks + whatsappClicks);
        return stats;
    }

    private User getCurrentUser() {
        String emailOrPhone = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(emailOrPhone)
                .or(() -> userRepository.findByPhoneNumber(emailOrPhone))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
