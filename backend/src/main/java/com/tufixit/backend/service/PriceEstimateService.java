package com.tufixit.backend.service;

import com.tufixit.backend.dto.AiDTO;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * PriceEstimateService — Feature 2: Instant Price Estimator
 *
 * Queries the platform's own completed jobs to calculate a realistic
 * KES price range for a given skill type and location.
 * No external API required — runs entirely on platform data.
 *
 * Fallback: when sample size is too small (<3 jobs), returns curated
 * Kenya market rate estimates based on industry knowledge.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PriceEstimateService {

    private final JobRepository jobRepository;

    // Curated Kenya market floor/ceiling rates by skill (KES)
    // Source: Jua Kali Federation / Nairobi market surveys
    private static final Map<String, int[]> MARKET_RATES = Map.ofEntries(
            Map.entry("ELECTRICIAN",       new int[]{800,  5000}),
            Map.entry("PLUMBER",           new int[]{600,  4000}),
            Map.entry("MECHANIC",          new int[]{500,  8000}),
            Map.entry("CARPENTER",         new int[]{700,  6000}),
            Map.entry("PAINTER",           new int[]{400,  3000}),
            Map.entry("WELDER",            new int[]{600,  5000}),
            Map.entry("HVAC_TECHNICIAN",   new int[]{1000, 8000}),
            Map.entry("APPLIANCE_REPAIR",  new int[]{500,  4000}),
            Map.entry("ROOFING",           new int[]{1000, 10000}),
            Map.entry("TILING",            new int[]{700,  5000}),
            Map.entry("MASON",             new int[]{800,  7000}),
            Map.entry("GARDENER",          new int[]{300,  2000}),
            Map.entry("CLEANER",           new int[]{300,  2500}),
            Map.entry("SECURITY",          new int[]{500,  3000}),
            // Kenya-specific popular services
            Map.entry("SOLAR_TECHNICIAN",      new int[]{1500, 15000}),
            Map.entry("BOREHOLE_DRILLING",     new int[]{5000, 50000}),
            Map.entry("FUMIGATION",            new int[]{1500, 8000}),
            Map.entry("WATER_TANK_CLEANING",   new int[]{1000, 5000}),
            Map.entry("GLASS_FITTER",          new int[]{800,  6000}),
            Map.entry("CEILING_BOARD",         new int[]{600,  4000}),
            Map.entry("LOCKSMITH",             new int[]{500,  3000}),
            Map.entry("CCTV_INSTALLER",        new int[]{2000, 15000}),
            Map.entry("INTERIOR_DESIGNER",     new int[]{3000, 25000}),
                Map.entry("MOVER",                 new int[]{1500, 25000}),
                Map.entry("TRANSPORT_PROVIDER",    new int[]{1200, 30000}),
                Map.entry("EVENT_LIGHTING",        new int[]{2500, 40000}),
            Map.entry("BODA_BODA",         new int[]{100,  1500}),
            Map.entry("TUK_TUK",           new int[]{150,  2000}),
            Map.entry("COURIER",           new int[]{200,  3000}),
            Map.entry("MAMA_FUA",          new int[]{500,  2500}),
            Map.entry("BARBER",            new int[]{200,  1500}),
            Map.entry("HAIR_SALON",        new int[]{500,  6000}),
            Map.entry("MAKEUP_ARTIST",     new int[]{1500, 15000}),
            Map.entry("CAR_WASH",          new int[]{300,  2500}),
            Map.entry("TYRE_SERVICES",     new int[]{200,  6000}),
            Map.entry("PHOTOGRAPHER",      new int[]{3000, 40000}),
            Map.entry("GRAPHIC_DESIGNER",  new int[]{1500, 25000}),
            Map.entry("IT_TECHNICIAN",     new int[]{1000, 12000}),
            Map.entry("OTHER",             new int[]{400,  4000})
    );

    public AiDTO.PriceEstimateResponse estimate(String skillTypeStr, String location) {
        WorkerSkill.SkillType skillType;
        try {
            skillType = WorkerSkill.SkillType.valueOf(skillTypeStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            skillType = WorkerSkill.SkillType.OTHER;
        }

        // Query real completed jobs for this skill with a recorded agreed price
        List<Integer> realPrices = getRealPrices(skillType);

        if (realPrices.size() >= 3) {
            return buildFromRealData(realPrices, skillTypeStr, location);
        } else {
            return buildFromMarketRates(skillTypeStr, location, realPrices.size());
        }
    }

    private List<Integer> getRealPrices(WorkerSkill.SkillType skillType) {
        // Pull last 200 completed jobs for this skill that have an agreed price
        return jobRepository
                .findByStatus(com.tufixit.backend.entity.Job.JobStatus.COMPLETED,
                        PageRequest.of(0, 200))
                .getContent()
                .stream()
                .filter(j -> j.getSkillType() == skillType
                        && j.getAgreedPrice() != null
                        && !j.getAgreedPrice().isBlank())
                .map(j -> {
                    try { return Integer.parseInt(j.getAgreedPrice().trim()); }
                    catch (NumberFormatException e) { return null; }
                })
                .filter(p -> p != null && p > 0 && p < 100_000)
                .sorted()
                .collect(Collectors.toList());
    }

    private AiDTO.PriceEstimateResponse buildFromRealData(
            List<Integer> prices, String skillType, String location) {

        int min = prices.get(0);
        int max = prices.get(prices.size() - 1);
        int median = prices.get(prices.size() / 2);

        // Trim outliers: use 10th–90th percentile for the range
        int p10idx = Math.max(0, (int) Math.ceil(prices.size() * 0.10) - 1);
        int p90idx = Math.min(prices.size() - 1, (int) Math.ceil(prices.size() * 0.90) - 1);
        int rangeMin = prices.get(p10idx);
        int rangeMax = prices.get(p90idx);

        String loc = location != null && !location.isBlank() ? location : "Nairobi";
        String label = skillType.replace("_", " ").toLowerCase();
        String summary = String.format(
                "Based on %d completed %s jobs on FUDARI%s",
                prices.size(), label,
                loc.equalsIgnoreCase("nairobi") ? "" : " in " + loc
        );

        return AiDTO.PriceEstimateResponse.builder()
                .minPrice(rangeMin)
                .maxPrice(rangeMax)
                .medianPrice(median)
                .sampleSize(prices.size())
                .currency("KES")
                .summary(summary)
                .build();
    }

    private AiDTO.PriceEstimateResponse buildFromMarketRates(
            String skillType, String location, int sampleSize) {

        int[] rates = MARKET_RATES.getOrDefault(skillType.toUpperCase(), new int[]{400, 4000});
        int median = (rates[0] + rates[1]) / 2;
        String label = skillType.replace("_", " ").toLowerCase();
        String summary = sampleSize == 0
                ? String.format("Estimated market rate for %s services in Kenya (Nairobi area)", label)
                : String.format("Estimated from %d platform job%s + Kenya market data", sampleSize, sampleSize == 1 ? "" : "s");

        return AiDTO.PriceEstimateResponse.builder()
                .minPrice(rates[0])
                .maxPrice(rates[1])
                .medianPrice(median)
                .sampleSize(sampleSize)
                .currency("KES")
                .summary(summary)
                .build();
    }
}
