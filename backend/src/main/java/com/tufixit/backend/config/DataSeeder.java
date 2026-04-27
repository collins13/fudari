package com.tufixit.backend.config;

import com.tufixit.backend.entity.*;
import com.tufixit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ListingRepository listingRepository;
    private final JobRepository jobRepository;
    private final ReviewRepository reviewRepository;
    private final LeadTrackingRepository leadTrackingRepository;
    private final EstateRepository estateRepository;
    private final EstateArtisanApprovalRepository estateArtisanApprovalRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("DataSeeder: database already has data — skipping seed");
            return;
        }
        log.info("DataSeeder: seeding database...");

        String encodedPassword = passwordEncoder.encode("Password123!");

        // ═══════════════════════════════════════════════════════════════════
        //  1. CATEGORIES (idempotent — only inserts missing ones by name)
        // ═══════════════════════════════════════════════════════════════════
        List<Category> seedCategories = List.of(
            Category.builder().name("Electrical").icon("fa-bolt").description("Electrical wiring, repairs, and installations").isActive(true).sortOrder(1).build(),
            Category.builder().name("Plumbing").icon("fa-faucet").description("Pipe fitting, drainage and water systems").isActive(true).sortOrder(2).build(),
            Category.builder().name("Mechanics").icon("fa-car").description("Vehicle repair and maintenance").isActive(true).sortOrder(3).build(),
            Category.builder().name("Carpentry").icon("fa-hammer").description("Wood furniture, cabinets, and fittings").isActive(true).sortOrder(4).build(),
            Category.builder().name("Painting").icon("fa-paint-roller").description("Interior and exterior painting").isActive(true).sortOrder(5).build(),
            Category.builder().name("Welding").icon("fa-fire").description("Metal fabrication and welding").isActive(true).sortOrder(6).build(),
            Category.builder().name("HVAC").icon("fa-wind").description("Heating, ventilation and air conditioning").isActive(true).sortOrder(7).build(),
            Category.builder().name("Masonry").icon("fa-building").description("Bricklaying, plastering, and concrete work").isActive(true).sortOrder(8).build(),
            Category.builder().name("Roofing").icon("fa-house-chimney").description("Roof repair and installation").isActive(true).sortOrder(9).build(),
            Category.builder().name("Tiling").icon("fa-border-all").description("Floor and wall tiling").isActive(true).sortOrder(10).build(),
            Category.builder().name("Cleaning").icon("fa-broom").description("Professional cleaning services").isActive(true).sortOrder(11).build(),
            Category.builder().name("Gardening").icon("fa-leaf").description("Landscaping and garden maintenance").isActive(true).sortOrder(12).build(),
            Category.builder().name("Security").icon("fa-shield-halved").description("CCTV, alarms, and access control").isActive(true).sortOrder(13).build(),
            Category.builder().name("Appliance Repair").icon("fa-blender").description("Fridge, washer, microwave repair").isActive(true).sortOrder(14).build()
        );
        Set<String> existingNames = new HashSet<>();
        categoryRepository.findAll().forEach(c -> existingNames.add(c.getName()));
        List<Category> toInsert = seedCategories.stream()
                .filter(c -> !existingNames.contains(c.getName()))
                .toList();
        if (!toInsert.isEmpty()) {
            categoryRepository.saveAll(toInsert);
        }
        List<Category> categories = categoryRepository.findAll();
        Map<String, Category> catMap = new HashMap<>();
        categories.forEach(c -> catMap.put(c.getName(), c));
        log.info("  → {} categories present ({} newly seeded)", categories.size(), toInsert.size());

        // ═══════════════════════════════════════════════════════════════════
        //  2. ADMIN USER
        // ═══════════════════════════════════════════════════════════════════
        User admin = userRepository.save(User.builder()
                .email("admin@tufixit.co.ke")
                .phoneNumber("+254700000001")
                .password(encodedPassword)
                .firstName("Admin")
                .lastName("TuFixIt")
                .role(User.UserRole.ADMIN)
                .vettingLevel(User.VettingLevel.PRO)
                .accountStatus(User.AccountStatus.ACTIVE)
                .isVerified(true)
                .isActive(true)
                .isApproved(true)
                .trustScore(5.0)
                .totalJobsCompleted(0)
                .totalReviews(0)
                .locationName("Nairobi CBD")
                .latitude(-1.2921)
                .longitude(36.8219)
                .build());
        log.info("  → Admin user seeded: {}", admin.getEmail());

        // ═══════════════════════════════════════════════════════════════════
        //  3. CLIENT USERS (10)
        // ═══════════════════════════════════════════════════════════════════
        String[][] clientData = {
            {"Grace",    "Muthoni",  "+254711000001", "grace.muthoni@gmail.com",    "Westlands, Nairobi",    "-1.2674", "36.8115"},
            {"Brian",    "Kipchoge", "+254711000002", "brian.kipchoge@gmail.com",    "Kilimani, Nairobi",     "-1.2889", "36.7885"},
            {"Wanjiku",  "Kamau",    "+254711000003", "wanjiku.kamau@gmail.com",     "Karen, Nairobi",        "-1.3187", "36.7118"},
            {"Dennis",   "Odhiambo", "+254711000004", "dennis.odhiambo@gmail.com",   "Kisumu CBD",            "-0.0917", "34.7680"},
            {"Amina",    "Hassan",   "+254711000005", "amina.hassan@gmail.com",      "Nyali, Mombasa",        "-4.0231", "39.7148"},
            {"Peter",    "Njoroge",  "+254711000006", "peter.njoroge@gmail.com",     "Lavington, Nairobi",    "-1.2838", "36.7628"},
            {"Faith",    "Chebet",   "+254711000007", "faith.chebet@gmail.com",      "Eldoret Town",          "0.5143",  "35.2698"},
            {"Kevin",    "Otieno",   "+254711000008", "kevin.otieno@gmail.com",      "South B, Nairobi",      "-1.3137", "36.8361"},
            {"Lucy",     "Wambui",   "+254711000009", "lucy.wambui@gmail.com",       "Thika Town",            "-1.0396", "37.0900"},
            {"James",    "Maina",    "+254711000010", "james.maina@gmail.com",       "Ruaka, Kiambu",         "-1.2070", "36.7810"},
        };

        List<User> clients = new ArrayList<>();
        for (String[] d : clientData) {
            clients.add(userRepository.save(User.builder()
                    .firstName(d[0]).lastName(d[1]).phoneNumber(d[2]).email(d[3])
                    .password(encodedPassword)
                    .role(User.UserRole.CLIENT)
                    .vettingLevel(User.VettingLevel.STANDARD)
                    .accountStatus(User.AccountStatus.ACTIVE)
                    .isVerified(true).isActive(true).isApproved(true)
                    .trustScore(0.0).totalJobsCompleted(0).totalReviews(0)
                    .locationName(d[4]).latitude(Double.parseDouble(d[5])).longitude(Double.parseDouble(d[6]))
                    .build()));
        }
        log.info("  → {} client users seeded", clients.size());

        // ═══════════════════════════════════════════════════════════════════
        //  4. WORKER/ARTISAN USERS (15) — mix of PRO, BASIC, FREE
        // ═══════════════════════════════════════════════════════════════════
        // {first, last, phone, email, location, lat, lon, vettingLevel, trustScore, jobsCompleted, totalReviews}
        String[][] workerData = {
            // PRO artisans (5)
            {"Samuel",  "Mwangi",    "+254722000001", "samuel.mwangi@tufixit.co.ke",   "Westlands, Nairobi",     "-1.2674", "36.8115", "PRO",      "4.8", "87", "42"},
            {"Joseph",  "Ochieng",   "+254722000002", "joseph.ochieng@tufixit.co.ke",  "Industrial Area, Nairobi","-1.3107", "36.8569", "PRO",      "4.9", "124","68"},
            {"Mary",    "Akinyi",    "+254722000003", "mary.akinyi@tufixit.co.ke",     "Kilimani, Nairobi",      "-1.2889", "36.7885", "PRO",      "4.7", "95", "51"},
            {"David",   "Kimani",    "+254722000004", "david.kimani@tufixit.co.ke",    "Nyali, Mombasa",         "-4.0231", "39.7148", "PRO",      "4.6", "63", "35"},
            {"Esther",  "Wanjiru",   "+254722000005", "esther.wanjiru@tufixit.co.ke",  "Ngong Road, Nairobi",    "-1.3010", "36.7700", "PRO",      "4.8", "78", "44"},
            // VERIFIED/BASIC artisans (5)
            {"Patrick",  "Mutua",    "+254722000006", "patrick.mutua@tufixit.co.ke",   "Eastleigh, Nairobi",     "-1.2729", "36.8459", "VERIFIED", "4.3", "32", "18"},
            {"Hannah",   "Njeri",    "+254722000007", "hannah.njeri@tufixit.co.ke",    "Kisumu CBD",             "-0.0917", "34.7680", "VERIFIED", "4.5", "41", "23"},
            {"Daniel",   "Kiptoo",   "+254722000008", "daniel.kiptoo@tufixit.co.ke",   "Eldoret Town",           "0.5143",  "35.2698", "VERIFIED", "4.1", "19", "11"},
            {"Catherine","Nyambura", "+254722000009", "catherine.nyambura@tufixit.co.ke","South C, Nairobi",      "-1.3100", "36.8270", "VERIFIED", "4.4", "27", "15"},
            {"Michael",  "Wafula",   "+254722000010", "michael.wafula@tufixit.co.ke",  "Ruiru, Kiambu",          "-1.1485", "36.9609", "VERIFIED", "4.2", "22", "12"},
            // STANDARD/FREE artisans (5)
            {"John",    "Kariuki",   "+254722000011", "john.kariuki@tufixit.co.ke",    "Thika Town",             "-1.0396", "37.0900", "STANDARD", "3.8", "8",  "5"},
            {"Agnes",   "Jepkoech",  "+254722000012", "agnes.jepkoech@tufixit.co.ke",  "Nakuru Town",            "-0.3031", "36.0800", "STANDARD", "4.0", "11", "7"},
            {"Robert",  "Omondi",    "+254722000013", "robert.omondi@tufixit.co.ke",   "Mombasa CBD",            "-4.0435", "39.6682", "STANDARD", "3.5", "5",  "3"},
            {"Sharon",  "Cherop",    "+254722000014", "sharon.cherop@tufixit.co.ke",   "Ruaka, Kiambu",          "-1.2070", "36.7810", "STANDARD", "0.0", "0",  "0"},
            {"Vincent", "Ndirangu",  "+254722000015", "vincent.ndirangu@tufixit.co.ke","Rongai, Kajiado",        "-1.3962", "36.7588", "STANDARD", "3.2", "3",  "2"},
        };

        List<User> workers = new ArrayList<>();
        for (String[] d : workerData) {
            User.VettingLevel vl = User.VettingLevel.valueOf(d[7]);
            workers.add(userRepository.save(User.builder()
                    .firstName(d[0]).lastName(d[1]).phoneNumber(d[2]).email(d[3])
                    .password(encodedPassword)
                    .role(User.UserRole.WORKER)
                    .vettingLevel(vl)
                    .accountStatus(User.AccountStatus.ACTIVE)
                    .isVerified(vl != User.VettingLevel.STANDARD)
                    .isActive(true)
                    .isApproved(true)
                    .trustScore(Double.parseDouble(d[8]))
                    .totalJobsCompleted(Integer.parseInt(d[9]))
                    .totalReviews(Integer.parseInt(d[10]))
                    .locationName(d[4])
                    .latitude(Double.parseDouble(d[5]))
                    .longitude(Double.parseDouble(d[6]))
                    .nationalId(vl == User.VettingLevel.PRO ? "3" + d[2].substring(4) + "1" : null)
                    .certificateOfGoodConduct(vl != User.VettingLevel.STANDARD ? "CGC-" + d[2].substring(7) : null)
                    .build()));
        }
        log.info("  → {} worker users seeded", workers.size());

        // ═══════════════════════════════════════════════════════════════════
        //  5. WORKER SKILLS (each artisan gets 1-3 skills)
        // ═══════════════════════════════════════════════════════════════════
        Object[][] skillData = {
            // PRO artisans — multiple skills
            {workers.get(0),  WorkerSkill.SkillType.ELECTRICIAN,     "Full house rewiring, panel upgrades, solar installations",          12, "2500"},
            {workers.get(0),  WorkerSkill.SkillType.SOLAR_TECHNICIAN,"Solar panel installation and maintenance",                          5,  "3000"},
            {workers.get(1),  WorkerSkill.SkillType.PLUMBER,         "Pipe fitting, water heater install, drainage systems",             15, "2000"},
            {workers.get(1),  WorkerSkill.SkillType.WATER_TANK_CLEANING,"Tank cleaning and disinfection for residential and commercial",  8,  "3500"},
            {workers.get(2),  WorkerSkill.SkillType.PAINTER,         "Interior/exterior painting, texture finishes, waterproofing",      10, "1800"},
            {workers.get(2),  WorkerSkill.SkillType.INTERIOR_DESIGNER,"Space planning, colour consultation, decor sourcing",              6,  "5000"},
            {workers.get(3),  WorkerSkill.SkillType.MECHANIC,        "Engine overhaul, brake systems, suspension, diagnostics",          14, "3000"},
            {workers.get(4),  WorkerSkill.SkillType.CARPENTER,       "Custom wardrobes, kitchen cabinets, door/window frames",           11, "2200"},
            {workers.get(4),  WorkerSkill.SkillType.CEILING_BOARD,   "Gypsum board installation and PVC ceiling fitting",                7,  "1500"},
            // VERIFIED artisans
            {workers.get(5),  WorkerSkill.SkillType.WELDER,          "Gate fabrication, window grills, structural welding",               9,  "2000"},
            {workers.get(6),  WorkerSkill.SkillType.HVAC_TECHNICIAN, "AC installation, servicing, and duct cleaning",                     7,  "2500"},
            {workers.get(7),  WorkerSkill.SkillType.MASON,           "Brick laying, plastering, concrete flooring",                       8,  "1800"},
            {workers.get(8),  WorkerSkill.SkillType.TILING,          "Floor and wall tiling — ceramic, porcelain, natural stone",         6,  "1600"},
            {workers.get(9),  WorkerSkill.SkillType.ROOFING,         "Mabati roofing, gutter installation, waterproofing",                5,  "2000"},
            // STANDARD artisans
            {workers.get(10), WorkerSkill.SkillType.ELECTRICIAN,     "Basic wiring, socket installation, lighting fixtures",              3,  "1200"},
            {workers.get(11), WorkerSkill.SkillType.GARDENER,        "Landscaping, lawn care, hedge trimming, tree planting",             4,  "800"},
            {workers.get(12), WorkerSkill.SkillType.APPLIANCE_REPAIR,"Fridge, washing machine, and microwave repair",                     6,  "1500"},
            {workers.get(13), WorkerSkill.SkillType.CLEANER,         "Deep cleaning, move-in/move-out cleaning, office cleaning",         2,  "700"},
            {workers.get(14), WorkerSkill.SkillType.CCTV_INSTALLER,  "CCTV camera setup, DVR configuration, remote access",              3,  "2000"},
        };

        List<WorkerSkill> skills = new ArrayList<>();
        for (Object[] sd : skillData) {
            skills.add(workerSkillRepository.save(WorkerSkill.builder()
                    .worker((User) sd[0])
                    .skillType((WorkerSkill.SkillType) sd[1])
                    .description((String) sd[2])
                    .experienceYears((Integer) sd[3])
                    .hourlyRate((String) sd[4])
                    .isVerified(((User) sd[0]).getVettingLevel() != User.VettingLevel.STANDARD)
                    .build()));
        }
        log.info("  → {} worker skills seeded", skills.size());

        // ═══════════════════════════════════════════════════════════════════
        //  6. SUBSCRIPTIONS — PRO + BASIC artisans get active subscriptions
        // ═══════════════════════════════════════════════════════════════════
        LocalDateTime now = LocalDateTime.now();
        // PRO subscriptions (workers 0-4)
        for (int i = 0; i < 5; i++) {
            subscriptionRepository.save(Subscription.builder()
                    .artisan(workers.get(i))
                    .planType(Subscription.PlanType.PRO)
                    .status(Subscription.SubscriptionStatus.ACTIVE)
                    .startDate(now.minusDays(60))
                    .endDate(now.plusDays(305))
                    .autoRenew(true)
                    .mpesaTransactionId("QKA" + (10000 + i) + "SEED")
                    .build());
        }
        // BASIC subscriptions (workers 5-9)
        for (int i = 5; i < 10; i++) {
            subscriptionRepository.save(Subscription.builder()
                    .artisan(workers.get(i))
                    .planType(Subscription.PlanType.BASIC)
                    .status(Subscription.SubscriptionStatus.ACTIVE)
                    .startDate(now.minusDays(30))
                    .endDate(now.plusDays(335))
                    .autoRenew(false)
                    .mpesaTransactionId("QKB" + (20000 + i) + "SEED")
                    .build());
        }
        // FREE subscriptions (workers 10-14)
        for (int i = 10; i < 15; i++) {
            subscriptionRepository.save(Subscription.builder()
                    .artisan(workers.get(i))
                    .planType(Subscription.PlanType.FREE)
                    .status(Subscription.SubscriptionStatus.ACTIVE)
                    .startDate(now.minusDays(15))
                    .endDate(now.plusDays(350))
                    .autoRenew(false)
                    .build());
        }
        log.info("  → 15 subscriptions seeded (5 PRO, 5 BASIC, 5 FREE)");

        // ═══════════════════════════════════════════════════════════════════
        //  7. LISTINGS — each artisan gets listings (respecting plan limits)
        // ═══════════════════════════════════════════════════════════════════
        Object[][] listingData = {
            // PRO artisans — up to 3 listings each for variety
            {workers.get(0),  "Full House Electrical Rewiring",           catMap.get("Electrical"),        WorkerSkill.SkillType.ELECTRICIAN,     "Complete rewiring for old houses, panel upgrades with modern breakers. Licensed and insured.",                              "2500", "Westlands, Nairobi",    -1.2674, 36.8115, 145},
            {workers.get(0),  "Solar Panel Installation & Maintenance",   catMap.get("Electrical"),        WorkerSkill.SkillType.SOLAR_TECHNICIAN,"Residential and commercial solar setups. 5kW–20kW systems with battery backup.",                                          "15000","Westlands, Nairobi",    -1.2674, 36.8115, 89},
            {workers.get(1),  "Emergency Plumbing Services 24/7",         catMap.get("Plumbing"),          WorkerSkill.SkillType.PLUMBER,         "Burst pipes, blocked drains, water heater installation. Available 24/7 in Nairobi.",                                       "1500", "Industrial Area, Nairobi",-1.3107,36.8569, 234},
            {workers.get(1),  "Water Tank Cleaning & Sanitization",       catMap.get("Plumbing"),          WorkerSkill.SkillType.WATER_TANK_CLEANING,"Professional tank cleaning for homes and offices. FDA-approved chemicals.",                                             "3500", "Industrial Area, Nairobi",-1.3107,36.8569, 67},
            {workers.get(2),  "Premium Interior & Exterior Painting",     catMap.get("Painting"),          WorkerSkill.SkillType.PAINTER,         "High-quality painting with Dulux and Crown paints. Texture finishes, colour consultation included.",                       "1800", "Kilimani, Nairobi",     -1.2889, 36.7885, 178},
            {workers.get(2),  "Interior Design Consultation",             catMap.get("Painting"),          WorkerSkill.SkillType.INTERIOR_DESIGNER,"Full space planning, mood boards, and furniture sourcing for apartments and offices.",                                   "5000", "Kilimani, Nairobi",     -1.2889, 36.7885, 52},
            {workers.get(3),  "Complete Vehicle Service & Repair",        catMap.get("Mechanics"),         WorkerSkill.SkillType.MECHANIC,        "Engine overhaul, brake service, suspension, AC repair. All Japanese and German vehicles.",                                  "3000", "Nyali, Mombasa",        -4.0231, 39.7148, 112},
            {workers.get(4),  "Custom Wardrobes & Kitchen Cabinets",      catMap.get("Carpentry"),         WorkerSkill.SkillType.CARPENTER,       "Bespoke wardrobes, kitchen cabinets, shoe racks. MDF and solid wood options.",                                             "8000", "Ngong Road, Nairobi",   -1.3010, 36.7700, 96},
            {workers.get(4),  "Gypsum Ceiling Board Installation",        catMap.get("Carpentry"),         WorkerSkill.SkillType.CEILING_BOARD,   "Modern gypsum board ceiling with LED lighting channels. Per sq ft pricing.",                                               "350",  "Ngong Road, Nairobi",   -1.3010, 36.7700, 43},
            // VERIFIED artisans — up to 3 listings
            {workers.get(5),  "Steel Gate & Window Grills Fabrication",   catMap.get("Welding"),           WorkerSkill.SkillType.WELDER,          "Custom designed gates, window grills, and balcony railings. Powder-coated finish.",                                        "15000","Eastleigh, Nairobi",    -1.2729, 36.8459, 78},
            {workers.get(6),  "AC Installation & Servicing",              catMap.get("HVAC"),              WorkerSkill.SkillType.HVAC_TECHNICIAN, "Split AC installation, gas refill, duct cleaning. Samsung, LG, Daikin certified.",                                         "4500", "Kisumu CBD",            -0.0917, 34.7680, 45},
            {workers.get(7),  "Building & Plastering Works",              catMap.get("Masonry"),           WorkerSkill.SkillType.MASON,           "Foundation to finish. Brick laying, plastering, concrete flooring for new builds.",                                        "2500", "Eldoret Town",          0.5143,  35.2698, 33},
            {workers.get(8),  "Professional Floor & Wall Tiling",         catMap.get("Tiling"),            WorkerSkill.SkillType.TILING,          "Ceramic, porcelain, and natural stone tiling. Kitchen backsplash, bathroom, living room.",                                 "800",  "South C, Nairobi",      -1.3100, 36.8270, 56},
            {workers.get(9),  "Mabati Roofing & Gutter Installation",     catMap.get("Roofing"),           WorkerSkill.SkillType.ROOFING,         "New roofs, repairs, gutter systems. Gauge 28-30 mabati in various profiles.",                                              "2000", "Ruiru, Kiambu",         -1.1485, 36.9609, 28},
            // FREE artisans — 1 listing each
            {workers.get(10), "Electrical Wiring & Socket Installation",  catMap.get("Electrical"),        WorkerSkill.SkillType.ELECTRICIAN,     "Basic wiring, switch/socket installation, lighting setup for homes.",                                                      "1200", "Thika Town",            -1.0396, 37.0900, 12},
            {workers.get(11), "Garden Landscaping & Lawn Care",           catMap.get("Gardening"),         WorkerSkill.SkillType.GARDENER,        "Lawn mowing, hedge trimming, flower bed setup, tree planting.",                                                            "800",  "Nakuru Town",           -0.3031, 36.0800, 18},
            {workers.get(12), "Fridge & Washing Machine Repair",          catMap.get("Appliance Repair"),  WorkerSkill.SkillType.APPLIANCE_REPAIR,"Fridge gas refill, compressor replacement, washing machine motor repair.",                                                 "1500", "Mombasa CBD",           -4.0435, 39.6682, 9},
            {workers.get(13), "Professional Deep Cleaning Services",      catMap.get("Cleaning"),          WorkerSkill.SkillType.CLEANER,         "Move-in/move-out cleaning, office cleaning, post-construction cleanup.",                                                   "700",  "Ruaka, Kiambu",         -1.2070, 36.7810, 4},
            {workers.get(14), "CCTV Camera Installation & Setup",         catMap.get("Security"),          WorkerSkill.SkillType.CCTV_INSTALLER,  "4-8 camera CCTV setup, DVR config, remote phone viewing. Hikvision & Dahua.",                                             "12000","Rongai, Kajiado",       -1.3962, 36.7588, 7},
        };

        List<Listing> listings = new ArrayList<>();
        for (Object[] ld : listingData) {
            listings.add(listingRepository.save(Listing.builder()
                    .artisan((User) ld[0])
                    .title((String) ld[1])
                    .category((Category) ld[2])
                    .skillType((WorkerSkill.SkillType) ld[3])
                    .description((String) ld[4])
                    .priceStart((String) ld[5])
                    .location((String) ld[6])
                    .latitude((Double) ld[7])
                    .longitude((Double) ld[8])
                    .viewCount((Integer) ld[9])
                    .status(Listing.ListingStatus.APPROVED)
                    .isActive(true)
                    .build()));
        }
        log.info("  → {} listings seeded", listings.size());

        // ═══════════════════════════════════════════════════════════════════
        //  8. JOBS — 20 jobs in various states across the lifecycle
        // ═══════════════════════════════════════════════════════════════════
        List<Job> jobs = new ArrayList<>();

        // Completed jobs (12) — spread across workers for ranking data
        Object[][] completedJobs = {
            {clients.get(0), workers.get(0), "Rewire kitchen and living room",         WorkerSkill.SkillType.ELECTRICIAN,      "12000", "Westlands, Nairobi",    -1.2674, 36.8115},
            {clients.get(1), workers.get(0), "Install solar panels on rooftop",         WorkerSkill.SkillType.SOLAR_TECHNICIAN, "85000", "Kilimani, Nairobi",     -1.2889, 36.7885},
            {clients.get(2), workers.get(1), "Fix burst pipe in bathroom",              WorkerSkill.SkillType.PLUMBER,          "3500",  "Karen, Nairobi",        -1.3187, 36.7118},
            {clients.get(3), workers.get(1), "Install water heater",                    WorkerSkill.SkillType.PLUMBER,          "8000",  "Kisumu CBD",            -0.0917, 34.7680},
            {clients.get(0), workers.get(2), "Paint 3-bedroom apartment",               WorkerSkill.SkillType.PAINTER,          "25000", "Westlands, Nairobi",    -1.2674, 36.8115},
            {clients.get(4), workers.get(3), "Full car service — Toyota Land Cruiser",  WorkerSkill.SkillType.MECHANIC,         "15000", "Nyali, Mombasa",        -4.0231, 39.7148},
            {clients.get(5), workers.get(4), "Custom wardrobe for master bedroom",      WorkerSkill.SkillType.CARPENTER,        "45000", "Lavington, Nairobi",    -1.2838, 36.7628},
            {clients.get(6), workers.get(5), "Fabricate main gate and side gate",       WorkerSkill.SkillType.WELDER,           "55000", "Eldoret Town",          0.5143,  35.2698},
            {clients.get(7), workers.get(6), "Install split AC unit in office",         WorkerSkill.SkillType.HVAC_TECHNICIAN,  "18000", "Kisumu CBD",            -0.0917, 34.7680},
            {clients.get(8), workers.get(8), "Tile bathroom floor and walls",           WorkerSkill.SkillType.TILING,           "12000", "Thika Town",            -1.0396, 37.0900},
            {clients.get(9), workers.get(9), "Replace mabati roof sheets",              WorkerSkill.SkillType.ROOFING,          "35000", "Ruaka, Kiambu",         -1.2070, 36.7810},
            {clients.get(1), workers.get(7), "Plaster and skim coat 2 rooms",           WorkerSkill.SkillType.MASON,            "8000",  "Kilimani, Nairobi",     -1.2889, 36.7885},
        };

        for (int i = 0; i < completedJobs.length; i++) {
            Object[] jd = completedJobs[i];
            User client = (User) jd[0];
            User worker = (User) jd[1];
            LocalDateTime created = now.minusDays(60 - i * 4);

            Job job = jobRepository.save(Job.builder()
                    .client(client)
                    .assignedWorker(worker)
                    .title((String) jd[2])
                    .description("Job description for: " + jd[2])
                    .skillType((WorkerSkill.SkillType) jd[3])
                    .status(Job.JobStatus.COMPLETED)
                    .agreedPrice((String) jd[4])
                    .locationName((String) jd[5])
                    .latitude((Double) jd[6])
                    .longitude((Double) jd[7])
                    .address((String) jd[5])
                    .allowBidding(false)
                    .isUrgent(i % 3 == 0)
                    .bookingCode("TUF-" + String.format("%06d", 100 + i))
                    .startTime(created.plusHours(2))
                    .completionTime(created.plusHours(6))
                    .arrivedAt(created.plusHours(1))
                    .acceptedAt(created.plusMinutes(30))
                    .paymentRecorded(true)
                    .paymentMethod(i % 2 == 0 ? Job.PaymentMethod.MPESA : Job.PaymentMethod.CASH)
                    .paymentAmount(Integer.parseInt((String) jd[4]))
                    .build());
            jobs.add(job);
        }

        // In-progress jobs (3)
        jobs.add(jobRepository.save(Job.builder()
                .client(clients.get(0)).assignedWorker(workers.get(2))
                .title("Repaint living room ceiling")
                .description("Ceiling has water stains, need to scrape and repaint with white emulsion")
                .skillType(WorkerSkill.SkillType.PAINTER).status(Job.JobStatus.IN_PROGRESS)
                .agreedPrice("6000").locationName("Westlands, Nairobi").latitude(-1.2674).longitude(36.8115)
                .address("Westlands, Nairobi").allowBidding(false).isUrgent(false)
                .bookingCode("TUF-000200").startTime(now.minusHours(2)).arrivedAt(now.minusHours(3)).acceptedAt(now.minusHours(5))
                .paymentRecorded(false).build()));

        jobs.add(jobRepository.save(Job.builder()
                .client(clients.get(3)).assignedWorker(workers.get(1))
                .title("Replace kitchen sink and tap")
                .description("Old sink is cracked, need new stainless steel sink with mixer tap")
                .skillType(WorkerSkill.SkillType.PLUMBER).status(Job.JobStatus.IN_PROGRESS)
                .agreedPrice("9000").locationName("Kisumu CBD").latitude(-0.0917).longitude(34.7680)
                .address("Kisumu CBD").allowBidding(false).isUrgent(true)
                .bookingCode("TUF-000201").startTime(now.minusHours(1)).arrivedAt(now.minusHours(2)).acceptedAt(now.minusHours(4))
                .paymentRecorded(false).build()));

        jobs.add(jobRepository.save(Job.builder()
                .client(clients.get(5)).assignedWorker(workers.get(4))
                .title("Build shoe rack and bookshelf")
                .description("Custom MDF shoe rack (8 tiers) and bookshelf for the study")
                .skillType(WorkerSkill.SkillType.CARPENTER).status(Job.JobStatus.ARRIVED)
                .agreedPrice("22000").locationName("Lavington, Nairobi").latitude(-1.2838).longitude(36.7628)
                .address("Lavington, Nairobi").allowBidding(false).isUrgent(false)
                .bookingCode("TUF-000202").arrivedAt(now.minusMinutes(30)).acceptedAt(now.minusHours(3))
                .paymentRecorded(false).build()));

        // Pending/bidding jobs (3)
        jobs.add(jobRepository.save(Job.builder()
                .client(clients.get(7)).title("Fix leaking shower head")
                .description("Shower head is dripping, might need new washer or full replacement")
                .skillType(WorkerSkill.SkillType.PLUMBER).status(Job.JobStatus.PENDING)
                .locationName("South B, Nairobi").latitude(-1.3137).longitude(36.8361)
                .address("South B, Nairobi").allowBidding(true).isUrgent(false)
                .budgetMin("2000").budgetMax("5000")
                .bookingCode("TUF-000203")
                .paymentRecorded(false).build()));

        jobs.add(jobRepository.save(Job.builder()
                .client(clients.get(8)).title("Install 4 CCTV cameras")
                .description("Need 4 outdoor cameras with night vision and phone app access for my compound")
                .skillType(WorkerSkill.SkillType.CCTV_INSTALLER).status(Job.JobStatus.BIDDING)
                .locationName("Thika Town").latitude(-1.0396).longitude(37.0900)
                .address("Thika Town").allowBidding(true).isUrgent(false)
                .budgetMin("25000").budgetMax("45000")
                .bookingCode("TUF-000204")
                .paymentRecorded(false).build()));

        jobs.add(jobRepository.save(Job.builder()
                .client(clients.get(9)).title("Deep clean 4-bedroom house")
                .description("Full deep clean after renovation — all rooms, kitchen, bathrooms, windows")
                .skillType(WorkerSkill.SkillType.CLEANER).status(Job.JobStatus.PENDING)
                .locationName("Ruaka, Kiambu").latitude(-1.2070).longitude(36.7810)
                .address("Ruaka, Kiambu").allowBidding(true).isUrgent(true)
                .urgency(Job.UrgencyLevel.TODAY)
                .budgetMin("5000").budgetMax("10000")
                .bookingCode("TUF-000205")
                .paymentRecorded(false).build()));

        // Cancelled/disputed (2)
        jobs.add(jobRepository.save(Job.builder()
                .client(clients.get(4)).assignedWorker(workers.get(3))
                .title("Car AC repair").description("AC blowing warm air, needs gas refill or compressor check")
                .skillType(WorkerSkill.SkillType.MECHANIC).status(Job.JobStatus.CANCELLED)
                .agreedPrice("8000").locationName("Nyali, Mombasa").latitude(-4.0231).longitude(39.7148)
                .address("Nyali, Mombasa").allowBidding(false).isUrgent(false)
                .bookingCode("TUF-000206").declineReason("Customer found cheaper alternative")
                .paymentRecorded(false).build()));

        jobs.add(jobRepository.save(Job.builder()
                .client(clients.get(6)).assignedWorker(workers.get(7))
                .title("Build perimeter wall").description("100m perimeter wall with pillars every 3m")
                .skillType(WorkerSkill.SkillType.MASON).status(Job.JobStatus.DISPUTED)
                .agreedPrice("150000").locationName("Eldoret Town").latitude(0.5143).longitude(35.2698)
                .address("Eldoret Town").allowBidding(false).isUrgent(false)
                .bookingCode("TUF-000207").startTime(now.minusDays(10)).acceptedAt(now.minusDays(12))
                .paymentRecorded(false).build()));

        log.info("  → {} jobs seeded (12 completed, 3 in-progress, 3 pending, 2 cancelled/disputed)", jobs.size());

        // ═══════════════════════════════════════════════════════════════════
        //  9. REVIEWS — for completed jobs (client → worker)
        // ═══════════════════════════════════════════════════════════════════
        int[][] reviewRatings = {{5, 4}, {5, 5}, {4, 4}, {5, 3}, {5, 5}, {4, 4}, {5, 5}, {4, 3}, {5, 4}, {4, 4}, {5, 5}, {3, 4}};
        String[] reviewComments = {
            "Samuel did an excellent job rewiring my kitchen. Very tidy work!",
            "Fantastic solar installation. System is working perfectly.",
            "Joseph fixed the pipe quickly. Reasonable price.",
            "Good work on the water heater, but took a bit long.",
            "Mary transformed our apartment! Beautiful finish.",
            "David knows his stuff — engine runs like new.",
            "Esther built the most beautiful wardrobe. Highly recommended!",
            "Patrick's welding is solid. Gate looks great.",
            "Hannah installed the AC perfectly. Very professional.",
            "Catherine's tiling work is flawless. Neat edges.",
            "Michael replaced the roof sheets in one day. Impressive!",
            "Daniel's plastering was okay but needs better finishing.",
        };
        String[] workerComments = {
            "Great client, clear instructions and prompt payment.",
            "Professional homeowner, prepared everything in advance.",
            "Easy to work with, but parking in Karen is tricky.",
            "Good communication throughout the project.",
            "Lovely apartment, client was very accommodating.",
            "Easy car to work on, client was patient.",
            "Client had clear vision for the wardrobe design.",
            "Good project, client provided all the measurements.",
            "Nice office space, client provided tea and snacks.",
            "Client was organised and had tiles ready on site.",
            "Straightforward job, client helped with materials.",
            "Difficult access to the rooms but we managed.",
        };

        for (int i = 0; i < 12; i++) {
            Job completedJob = jobs.get(i);
            // Client reviews worker
            reviewRepository.save(Review.builder()
                    .job(completedJob)
                    .reviewer(completedJob.getClient())
                    .reviewedUser(completedJob.getAssignedWorker())
                    .rating(reviewRatings[i][0])
                    .comment(reviewComments[i])
                    .isClientReview(true)
                    .build());
            // Worker reviews client
            reviewRepository.save(Review.builder()
                    .job(completedJob)
                    .reviewer(completedJob.getAssignedWorker())
                    .reviewedUser(completedJob.getClient())
                    .rating(reviewRatings[i][1])
                    .comment(workerComments[i])
                    .isClientReview(false)
                    .build());
        }
        log.info("  → 24 reviews seeded (12 client→worker + 12 worker→client)");

        // ═══════════════════════════════════════════════════════════════════
        //  10. LEAD TRACKING — engagement data for ranking
        // ═══════════════════════════════════════════════════════════════════
        Random rng = new Random(42);
        int leadCount = 0;
        for (User worker : workers) {
            int profileViews = switch (worker.getVettingLevel()) {
                case PRO -> 30 + rng.nextInt(40);
                case VERIFIED -> 10 + rng.nextInt(20);
                case STANDARD -> rng.nextInt(10);
            };
            for (int v = 0; v < profileViews; v++) {
                leadTrackingRepository.save(LeadTracking.builder()
                        .artisan(worker)
                        .leadType(LeadTracking.LeadType.PROFILE_VIEW)
                        .visitorIp("192.168.1." + rng.nextInt(256))
                        .userAgent("Mozilla/5.0 (seed)")
                        .build());
                leadCount++;
            }
            int callClicks = profileViews / 5;
            for (int c = 0; c < callClicks; c++) {
                leadTrackingRepository.save(LeadTracking.builder()
                        .artisan(worker)
                        .leadType(LeadTracking.LeadType.CALL_CLICK)
                        .visitorIp("192.168.1." + rng.nextInt(256))
                        .userAgent("Mozilla/5.0 (seed)")
                        .build());
                leadCount++;
            }
            int waClicks = profileViews / 4;
            for (int w = 0; w < waClicks; w++) {
                leadTrackingRepository.save(LeadTracking.builder()
                        .artisan(worker)
                        .leadType(LeadTracking.LeadType.WHATSAPP_CLICK)
                        .visitorIp("192.168.1." + rng.nextInt(256))
                        .userAgent("Mozilla/5.0 (seed)")
                        .build());
                leadCount++;
            }
        }
        log.info("  → {} lead tracking records seeded", leadCount);

        // ═══════════════════════════════════════════════════════════════════
        //  11. ESTATES — B2B partner estates with approved artisans
        // ═══════════════════════════════════════════════════════════════════
        Estate fedha = estateRepository.save(Estate.builder()
                .name("Fedha Estate")
                .slug("fedha-estate")
                .area("Embakasi, Nairobi")
                .latitude(-1.3226).longitude(36.8946)
                .unitCount(320)
                .managerName("Alice Wanjiku")
                .managerPhone("+254700100001")
                .managerEmail("alice@fedha-estate.co.ke")
                .monthlyFee(15000)
                .contractStart(now.minusDays(90))
                .contractEnd(now.plusDays(275))
                .shortCode("FDH1")
                .brandPrimaryColor("#1B5E20")
                .brandLogoUrl(null)
                .brandWelcomeMessage("Welcome to Fedha Estate maintenance services!")
                .commissionRate(0.05)
                .build());

        Estate greenpark = estateRepository.save(Estate.builder()
                .name("Greenpark Estate")
                .slug("greenpark-estate")
                .area("Athi River, Machakos")
                .latitude(-1.4580).longitude(36.9820)
                .unitCount(540)
                .managerName("James Oloo")
                .managerPhone("+254700100002")
                .managerEmail("james@greenpark.co.ke")
                .monthlyFee(20000)
                .contractStart(now.minusDays(60))
                .contractEnd(now.plusDays(305))
                .shortCode("GPK1")
                .brandPrimaryColor("#0D47A1")
                .brandLogoUrl(null)
                .brandWelcomeMessage("Greenpark Estate — Quality home maintenance at your doorstep")
                .commissionRate(0.08)
                .build());

        Estate safari = estateRepository.save(Estate.builder()
                .name("Safari Park Estate")
                .slug("safari-park-estate")
                .area("Kasarani, Nairobi")
                .latitude(-1.2200).longitude(36.8900)
                .unitCount(180)
                .managerName("Martha Njeri")
                .managerPhone("+254700100003")
                .managerEmail("martha@safaripark.co.ke")
                .monthlyFee(12000)
                .contractStart(now.minusDays(30))
                .contractEnd(now.plusDays(335))
                .shortCode("SPK1")
                .brandPrimaryColor("#E65100")
                .brandLogoUrl(null)
                .brandWelcomeMessage(null)
                .commissionRate(0.06)
                .build());

        log.info("  → 3 estates seeded (Fedha, Greenpark, Safari Park)");

        // ── Estate Artisan Approvals ─────────────────────────────────────────
        // Fedha: 4 approved artisans (electrician, plumber, painter, carpenter)
        for (int i : new int[]{0, 1, 2, 4}) {
            estateArtisanApprovalRepository.save(EstateArtisanApproval.builder()
                    .estate(fedha).artisan(workers.get(i))
                    .approvedBy("Alice Wanjiku").note("Approved for Fedha Estate")
                    .approvalStatus(EstateArtisanApproval.ApprovalStatus.APPROVED)
                    .build());
        }
        // Fedha: 1 pending
        estateArtisanApprovalRepository.save(EstateArtisanApproval.builder()
                .estate(fedha).artisan(workers.get(5))
                .approvedBy("Alice Wanjiku").note("Applied via referral")
                .approvalStatus(EstateArtisanApproval.ApprovalStatus.PENDING)
                .build());

        // Greenpark: 5 approved artisans
        for (int i : new int[]{0, 1, 3, 5, 6}) {
            estateArtisanApprovalRepository.save(EstateArtisanApproval.builder()
                    .estate(greenpark).artisan(workers.get(i))
                    .approvedBy("James Oloo").note("Approved for Greenpark")
                    .approvalStatus(EstateArtisanApproval.ApprovalStatus.APPROVED)
                    .build());
        }
        // Greenpark: 2 pending
        for (int i : new int[]{8, 9}) {
            estateArtisanApprovalRepository.save(EstateArtisanApproval.builder()
                    .estate(greenpark).artisan(workers.get(i))
                    .approvedBy("James Oloo").note("Pending verification")
                    .approvalStatus(EstateArtisanApproval.ApprovalStatus.PENDING)
                    .build());
        }

        // Safari Park: 3 approved
        for (int i : new int[]{2, 4, 7}) {
            estateArtisanApprovalRepository.save(EstateArtisanApproval.builder()
                    .estate(safari).artisan(workers.get(i))
                    .approvedBy("Martha Njeri").note("Approved for Safari Park")
                    .approvalStatus(EstateArtisanApproval.ApprovalStatus.APPROVED)
                    .build());
        }

        log.info("  → Estate artisan approvals seeded (Fedha: 4+1, Greenpark: 5+2, Safari: 3)");

        // ── Estate-tagged jobs (3 completed jobs for Fedha) ──────────────────
        for (int i = 0; i < 3; i++) {
            Object[] jd = completedJobs[i];
            Job estateJob = jobRepository.save(Job.builder()
                    .client((User) jd[0]).assignedWorker(workers.get(i))
                    .title("Estate: " + jd[2])
                    .description("Estate maintenance: " + jd[2])
                    .skillType((WorkerSkill.SkillType) jd[3])
                    .status(Job.JobStatus.COMPLETED)
                    .agreedPrice((String) jd[4])
                    .locationName("Fedha Estate, Embakasi")
                    .latitude(-1.3226).longitude(36.8946)
                    .address("Fedha Estate, Embakasi")
                    .estateId(fedha.getId())
                    .referralSource("estate:fedha-estate")
                    .allowBidding(false).isUrgent(false)
                    .bookingCode("TUF-E" + String.format("%05d", i))
                    .startTime(now.minusDays(20 - i * 5))
                    .completionTime(now.minusDays(19 - i * 5))
                    .paymentRecorded(true)
                    .paymentMethod(Job.PaymentMethod.MPESA)
                    .paymentAmount(Integer.parseInt((String) jd[4]))
                    .build());
        }
        log.info("  → 3 estate-tagged jobs seeded for Fedha");

        log.info("DataSeeder: ✅ seeding complete!");
        log.info("  Login credentials — all users: Password123!");
        log.info("  Admin: admin@tufixit.co.ke");
        log.info("  Sample client: grace.muthoni@gmail.com");
        log.info("  Sample PRO worker: samuel.mwangi@tufixit.co.ke");
        log.info("  Sample BASIC worker: patrick.mutua@tufixit.co.ke");
        log.info("  Sample FREE worker: john.kariuki@tufixit.co.ke");
        log.info("  Estates: /estate/fedha-estate, /estate/greenpark-estate, /estate/safari-park-estate");
        log.info("  WhatsApp short codes: FDH1, GPK1, SPK1");
    }
}