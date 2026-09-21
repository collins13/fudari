package com.tufixit.backend.service;

import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.Subscription;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.JobRepository;
import com.tufixit.backend.repository.SubscriptionRepository;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.repository.WorkerSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DemandForecastService — AI-Powered Demand Forecasting for Artisans
 *
 * Analyses platform job data to provide artisans with market intelligence:
 *   - Weekly demand trends (this week vs last week)
 *   - Supply/demand ratio (artisans vs jobs)
 *   - Location-based demand hotspots
 *   - Seasonal patterns (rain→roofing, Dec→painting, etc.)
 *   - Optimal pricing advice based on market conditions
 *
 * Requires no external API — runs entirely on platform data + Kenyan seasonal knowledge.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DemandForecastService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final SubscriptionRepository subscriptionRepository;

    // Kenyan seasonal patterns: skill type → months of high demand
    private static final Map<String, List<Month>> SEASONAL_PEAKS = Map.ofEntries(
            Map.entry("PLUMBER",          List.of(Month.APRIL, Month.MAY, Month.NOVEMBER)),    // rainy seasons
            Map.entry("ROOFING",          List.of(Month.MARCH, Month.APRIL, Month.OCTOBER, Month.NOVEMBER)), // roof leaks peak
            Map.entry("PAINTER",          List.of(Month.NOVEMBER, Month.DECEMBER, Month.JANUARY)),  // pre-Christmas renovations
            Map.entry("ELECTRICIAN",      List.of(Month.NOVEMBER, Month.DECEMBER)),             // holiday preparations
            Map.entry("CLEANER",          List.of(Month.DECEMBER, Month.JANUARY, Month.AUGUST)), // holidays + school breaks
            Map.entry("FUMIGATION",       List.of(Month.MARCH, Month.APRIL, Month.OCTOBER)),    // warm + wet = pests
            Map.entry("GARDENER",         List.of(Month.MARCH, Month.APRIL, Month.MAY)),        // growing season
            Map.entry("SOLAR_TECHNICIAN", List.of(Month.JANUARY, Month.FEBRUARY, Month.JUNE, Month.JULY)), // dry/sunny months
            Map.entry("WATER_TANK_CLEANING", List.of(Month.JANUARY, Month.FEBRUARY, Month.SEPTEMBER)), // dry season
            Map.entry("INTERIOR_DESIGNER", List.of(Month.NOVEMBER, Month.DECEMBER)),            // holiday renos
            Map.entry("CCTV_INSTALLER",   List.of(Month.NOVEMBER, Month.DECEMBER, Month.JANUARY)) // security concerns
    );

    public AiDTO.DemandForecastResponse forecast(String skillTypeStr, String location) {
        // Gate: only PRO and BASIC subscribers may access market intelligence
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        User caller = userRepository.findByEmail(principal)
                .orElseGet(() -> userRepository.findByPhoneNumber(principal).orElse(null));
        if (caller == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        boolean hasPaidPlan = subscriptionRepository
                .findByArtisanIdAndStatus(caller.getId(), Subscription.SubscriptionStatus.ACTIVE)
                .map(s -> s.getPlanType() == Subscription.PlanType.PRO
                        || s.getPlanType() == Subscription.PlanType.BASIC)
                .orElse(false);
        // Also allow if in grace period (fair — they recently had a paid plan)
        if (!hasPaidPlan) {
            hasPaidPlan = subscriptionRepository
                    .findByArtisanIdAndStatus(caller.getId(), Subscription.SubscriptionStatus.GRACE_PERIOD)
                    .map(s -> s.getPlanType() == Subscription.PlanType.PRO
                            || s.getPlanType() == Subscription.PlanType.BASIC)
                    .orElse(false);
        }
        if (!hasPaidPlan) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Market Intelligence is available on BASIC and PRO plans. Upgrade to access demand forecasts.");
        }

        WorkerSkill.SkillType skillType;
        try {
            skillType = WorkerSkill.SkillType.valueOf(skillTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            skillType = WorkerSkill.SkillType.OTHER;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thisWeekStart = now.minusDays(7);
        LocalDateTime lastWeekStart = now.minusDays(14);

        // Count jobs this week vs last week
        List<Job> thisWeekJobs = jobRepository.findJobsInDateRange(skillType, thisWeekStart, now);
        List<Job> lastWeekJobs = jobRepository.findJobsInDateRange(skillType, lastWeekStart, thisWeekStart);

        int currentWeek = thisWeekJobs.size();
        int previousWeek = lastWeekJobs.size();
        double changePercent = previousWeek > 0 ? ((double)(currentWeek - previousWeek) / previousWeek) * 100 : 0;
        String direction = currentWeek > previousWeek ? "UP" : currentWeek < previousWeek ? "DOWN" : "STABLE";

        // Count active artisans for this skill
        List<WorkerSkill> artisanSkills = workerSkillRepository.findBySkillType(skillType);
        long activeArtisans = artisanSkills.stream()
                .filter(s -> s.getWorker() != null && Boolean.TRUE.equals(s.getWorker().getIsActive()))
                .count();

        double supplyDemandRatio = activeArtisans > 0 ? (double) currentWeek / activeArtisans : 0;

        AiDTO.DemandTrend trend = AiDTO.DemandTrend.builder()
                .currentWeekJobs(currentWeek)
                .previousWeekJobs(previousWeek)
                .changePercent(Math.round(changePercent * 10.0) / 10.0)
                .direction(direction)
                .activeArtisans((int) activeArtisans)
                .supplyDemandRatio(Math.round(supplyDemandRatio * 100.0) / 100.0)
                .build();

        // Generate insights
        List<AiDTO.DemandInsight> insights = generateInsights(skillType, skillTypeStr, location,
                currentWeek, previousWeek, activeArtisans, supplyDemandRatio, now);

        // Pricing advice
        AiDTO.PricingAdvice pricingAdvice = generatePricingAdvice(skillType, skillTypeStr,
                supplyDemandRatio, direction, now);

        String periodLabel = location != null && !location.isBlank() ?
                String.format("7-day forecast for %s in %s", skillTypeStr.toLowerCase().replace("_", " "), location) :
                String.format("7-day forecast for %s services", skillTypeStr.toLowerCase().replace("_", " "));

        return AiDTO.DemandForecastResponse.builder()
                .skillType(skillTypeStr)
                .location(location != null ? location : "Nairobi")
                .period(periodLabel)
                .trend(trend)
                .insights(insights)
                .pricingAdvice(pricingAdvice)
                .build();
    }

    // ── Insight generation ───────────────────────────────────────────────────

    private List<AiDTO.DemandInsight> generateInsights(
            WorkerSkill.SkillType skillType, String skillTypeStr, String location,
            int currentWeek, int previousWeek, long activeArtisans,
            double supplyDemandRatio, LocalDateTime now) {

        List<AiDTO.DemandInsight> insights = new ArrayList<>();
        String label = skillTypeStr.toLowerCase().replace("_", " ");

        // Trend insight
        if (currentWeek > previousWeek) {
            double pct = previousWeek > 0 ? ((double)(currentWeek - previousWeek) / previousWeek) * 100 : 100;
            insights.add(AiDTO.DemandInsight.builder()
                    .type("TREND")
                    .title("Demand is Rising")
                    .description(String.format("%s jobs are up %.0f%% this week (%d vs %d last week). " +
                            "Consider boosting your listing for more visibility.", label, pct, currentWeek, previousWeek))
                    .icon("trending_up")
                    .build());
        } else if (currentWeek < previousWeek) {
            insights.add(AiDTO.DemandInsight.builder()
                    .type("TREND")
                    .title("Demand is Cooling")
                    .description(String.format("%s demand has decreased this week (%d vs %d). " +
                            "Competitive pricing can help you stand out.", label, currentWeek, previousWeek))
                    .icon("trending_down")
                    .build());
        } else {
            insights.add(AiDTO.DemandInsight.builder()
                    .type("TREND")
                    .title("Steady Demand")
                    .description(String.format("%s demand is stable at %d jobs per week.", label, currentWeek))
                    .icon("trending_flat")
                    .build());
        }

        // Supply/demand insight
        if (supplyDemandRatio > 2.0) {
            insights.add(AiDTO.DemandInsight.builder()
                    .type("OPPORTUNITY")
                    .title("High Demand, Low Supply")
                    .description(String.format("There are %.1f jobs per %s artisan this week. " +
                            "This is a great opportunity — you can afford to charge premium rates.",
                            supplyDemandRatio, label))
                    .icon("star")
                    .build());
        } else if (supplyDemandRatio < 0.5 && activeArtisans > 3) {
            insights.add(AiDTO.DemandInsight.builder()
                    .type("COMPETITION")
                    .title("Competitive Market")
                    .description(String.format("With %d artisans and %d jobs, the market is competitive. " +
                            "Focus on fast response times and quality reviews to win jobs.",
                            activeArtisans, currentWeek))
                    .icon("people")
                    .build());
        }

        // Seasonal insight
        Month currentMonth = now.getMonth();
        List<Month> peaks = SEASONAL_PEAKS.getOrDefault(skillTypeStr.toUpperCase(), List.of());
        if (peaks.contains(currentMonth)) {
            insights.add(AiDTO.DemandInsight.builder()
                    .type("SEASONAL")
                    .title("Peak Season")
                    .description(String.format("%s is typically a high-demand month for %s services in Kenya. " +
                            "Make sure your availability is up-to-date!", currentMonth.name().substring(0, 1) +
                            currentMonth.name().substring(1).toLowerCase(), label))
                    .icon("calendar_month")
                    .build());
        } else {
            // Check next upcoming peak
            Optional<Month> nextPeak = peaks.stream()
                    .filter(m -> m.getValue() > currentMonth.getValue())
                    .findFirst();
            if (nextPeak.isEmpty() && !peaks.isEmpty()) nextPeak = Optional.of(peaks.get(0));
            if (nextPeak.isPresent()) {
                insights.add(AiDTO.DemandInsight.builder()
                        .type("SEASONAL")
                        .title("Upcoming Peak")
                        .description(String.format("Next peak season for %s is %s. " +
                                "Prepare by updating your listing and getting more reviews.",
                                label, nextPeak.get().name().substring(0, 1) +
                                nextPeak.get().name().substring(1).toLowerCase()))
                        .icon("event")
                        .build());
            }
        }

        // Location hotspot insight
        List<Object[]> locationStats = jobRepository.countJobsByLocationForSkill(
                skillType, now.minusDays(30));
        if (!locationStats.isEmpty()) {
            Object[] top = locationStats.get(0);
            String topLocation = top[0] != null ? top[0].toString() : "Nairobi";
            long topCount = ((Number) top[1]).longValue();
            insights.add(AiDTO.DemandInsight.builder()
                    .type("LOCATION")
                    .title("Demand Hotspot")
                    .description(String.format("%s has the highest demand for %s with %d jobs in the last 30 days.",
                            topLocation, label, topCount))
                    .icon("location_on")
                    .build());
        }

        return insights;
    }

    // ── Pricing advice ───────────────────────────────────────────────────────

    private AiDTO.PricingAdvice generatePricingAdvice(WorkerSkill.SkillType skillType,
                                                       String skillTypeStr,
                                                       double supplyDemandRatio,
                                                       String direction,
                                                       LocalDateTime now) {
        // Get actual average price from completed jobs
        Double avgPrice = jobRepository.getAverageAgreedPrice(skillType, now.minusDays(90));

        int suggestedMin, suggestedMax;
        String rationale;
        String marketPosition;

        if (avgPrice != null && avgPrice > 0) {
            int base = avgPrice.intValue();

            if ("UP".equals(direction) && supplyDemandRatio > 1.5) {
                // High demand — can charge more
                suggestedMin = (int) (base * 1.05);
                suggestedMax = (int) (base * 1.30);
                rationale = "Demand is strong — price above market average for quality positioning";
                marketPosition = "PREMIUM";
            } else if ("DOWN".equals(direction) || supplyDemandRatio < 0.5) {
                // Low demand — be competitive
                suggestedMin = (int) (base * 0.85);
                suggestedMax = (int) (base * 1.05);
                rationale = "Market is competitive — price competitively to win more jobs";
                marketPosition = "COMPETITIVE";
            } else {
                suggestedMin = (int) (base * 0.95);
                suggestedMax = (int) (base * 1.15);
                rationale = "Steady market — price at or slightly above market average";
                marketPosition = "MARKET_RATE";
            }
        } else {
            // No data — use market rates
            Map<String, int[]> marketRates = Map.of(
                    "ELECTRICIAN", new int[]{1500, 5000},
                    "PLUMBER", new int[]{1200, 4000},
                    "MECHANIC", new int[]{2000, 8000},
                    "PAINTER", new int[]{800, 3000},
                    "CLEANER", new int[]{500, 2500}
            );
            int[] rates = marketRates.getOrDefault(skillTypeStr.toUpperCase(), new int[]{1000, 4000});
            suggestedMin = rates[0];
            suggestedMax = rates[1];
            rationale = "Based on Kenya market rates for " + skillTypeStr.toLowerCase().replace("_", " ");
            marketPosition = "MARKET_RATE";
        }

        return AiDTO.PricingAdvice.builder()
                .suggestedMinRate(suggestedMin)
                .suggestedMaxRate(suggestedMax)
                .rationale(rationale)
                .marketPosition(marketPosition)
                .build();
    }
}
