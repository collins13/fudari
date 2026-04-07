package com.tufixit.backend.config;

import com.tufixit.backend.entity.*;
import com.tufixit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ListingRepository listingRepository;
    private final WorkerSkillRepository workerSkillRepository;
    private final LeadTrackingRepository leadTrackingRepository;
    private final ReportRepository reportRepository;
    private final PublicReviewRepository publicReviewRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedCategories();
        seedAdmin();
        // Only seed sample artisans when the database is brand new (no real users yet).
        // This prevents wiping real artisan accounts on every restart.
        if (userRepository.count() <= 1) { // 1 = only the admin just created
            seedSampleArtisans();
        } else {
            log.info("Skipping sample artisan seed — database already has users.");
        }
    }

    private void seedCategories() {
        if (categoryRepository.count() > 0) return;

        String[][] cats = {
            {"Electrical", "fa-bolt", "Electricians and wiring services"},
            {"Plumbing", "fa-faucet", "Plumbers and pipe fitting"},
            {"Mechanics", "fa-car", "Vehicle and machinery repair"},
            {"Painting", "fa-paint-roller", "Interior and exterior painting"},
            {"Carpentry", "fa-hammer", "Furniture and wood work"},
            {"HVAC", "fa-wind", "Air conditioning and ventilation"},
            {"Welding", "fa-fire", "Metal fabrication and welding"},
            {"Masonry", "fa-building", "Construction and masonry work"},
            {"Cleaning", "fa-broom", "Cleaning and sanitation services"},
            {"Gardening", "fa-leaf", "Landscaping and gardening"},
        };

        for (int i = 0; i < cats.length; i++) {
            Category cat = Category.builder()
                    .name(cats[i][0])
                    .icon(cats[i][1])
                    .description(cats[i][2])
                    .isActive(true)
                    .sortOrder(i)
                    .build();
            categoryRepository.save(cat);
        }
        log.info("Seeded {} categories", cats.length);
    }

    private void seedAdmin() {
        if (userRepository.findByEmail("admin@tufixit.com").isPresent()) return;

        User admin = User.builder()
                .email("admin@tufixit.com")
                .phoneNumber("+254700000000")
                .password(passwordEncoder.encode("admin123"))
                .firstName("TUFIXIT")
                .lastName("Admin")
                .role(User.UserRole.ADMIN)
                .vettingLevel(User.VettingLevel.PRO)
                .trustScore(5.0)
                .isVerified(true)
                .isActive(true)
                .totalJobsCompleted(0)
                .totalReviews(0)
                .build();
        userRepository.save(admin);
        log.info("Seeded admin user: admin@tufixit.com / admin123");
    }

    private void seedSampleArtisans() {
        // No destructive cleanup — we only reach this method when the DB is empty.
        // Use findOrCreate (upsert by email) so re-runs during development are idempotent
        // without ever deleting real data.

        String[][] artisans = {
            {"James", "Kamau", "+254700000001", "james@tufixit.com", "ELECTRICIAN", "15", "800", "Westlands, Nairobi", "Professional electrician with 15 years experience in residential and commercial wiring. KEBS certified.", "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=400&fit=crop"},
            {"Mary", "Wanjiku", "+254700000002", "mary@tufixit.com", "PLUMBER", "10", "600", "Kasarani, Nairobi", "Expert plumber specializing in pipe fitting, drainage systems, and water heater installation.", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop"},
            {"Peter", "Ochieng", "+254700000003", "peter@tufixit.com", "MECHANIC", "12", "500", "Industrial Area, Nairobi", "Certified auto mechanic. Engine repair, diagnostics, and general vehicle maintenance.", "https://images.unsplash.com/photo-1614107151491-6876eecbff89?w=400&h=400&fit=crop"},
            {"Grace", "Njeri", "+254700000004", "grace@tufixit.com", "PAINTER", "8", "400", "Karen, Nairobi", "Professional painter for residential and commercial properties. Quality finishes guaranteed.", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop"},
            {"John", "Mwangi", "+254700000005", "john@tufixit.com", "CARPENTER", "20", "700", "Ruiru, Kiambu", "Master carpenter. Custom furniture, kitchen cabinets, doors, and all woodwork.", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop"},
            {"David", "Mutua", "+254700000006", "david@tufixit.com", "WELDER", "7", "550", "Mombasa Road, Nairobi", "Skilled welder for gates, grills, structural steel, and custom metal work.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"},
            {"Alice", "Akinyi", "+254700000007", "alice@tufixit.com", "CLEANER", "5", "300", "Kilimani, Nairobi", "Professional cleaning services. Deep cleaning, office cleaning, and post-construction cleanup.", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop"},
            {"Samuel", "Kipchoge", "+254700000008", "samuel@tufixit.com", "HVAC_TECHNICIAN", "9", "900", "Upper Hill, Nairobi", "HVAC specialist. AC installation, repair, and maintenance for residential and commercial.", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop"},
        };

        String[][] listingImages = {
            {"https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop"},
            {"https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop"},
            {"https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&h=400&fit=crop"},
            {"https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=400&fit=crop"},
            {"https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop"},
            {"https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop"},
            {"https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&h=400&fit=crop"},
            {"https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=400&fit=crop", "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop"},
        };

        for (int i = 0; i < artisans.length; i++) {
            String[] a = artisans[i];

            // Upsert: update existing or create new
            User user = userRepository.findByEmail(a[3]).orElse(null);
            boolean isNew = (user == null);
            if (isNew) {
                user = User.builder()
                        .email(a[3])
                        .phoneNumber(a[2])
                        .password(passwordEncoder.encode("password123"))
                        .firstName(a[0])
                        .lastName(a[1])
                        .role(User.UserRole.WORKER)
                        .build();
            }

            // Always update profile image and other fields
            user.setProfileImage(a[9]);
            // First 3 artisans get PRO (Gold), next 3 get VERIFIED (Basic), rest get STANDARD (Free)
            user.setVettingLevel(i < 3 ? User.VettingLevel.PRO : i < 6 ? User.VettingLevel.VERIFIED : User.VettingLevel.STANDARD);
            user.setTrustScore(Math.round((4.0 + Math.random()) * 10.0) / 10.0);
            user.setIsVerified(true);
            user.setIsActive(true);
            user.setLocationName(a[7]);
            user.setLatitude(-1.2921 + (Math.random() - 0.5) * 0.1);
            user.setLongitude(36.8219 + (Math.random() - 0.5) * 0.1);
            user.setTotalJobsCompleted((int)(Math.random() * 50) + 5);
            user.setTotalReviews((int)(Math.random() * 20) + 1);
            user = userRepository.save(user);

            // Upsert skill
            WorkerSkill.SkillType skillType = WorkerSkill.SkillType.valueOf(a[4]);
            List<WorkerSkill> existingSkills = workerSkillRepository.findByWorkerId(user.getId());
            WorkerSkill skill = existingSkills.isEmpty() ? null : existingSkills.get(0);
            if (skill == null) {
                skill = WorkerSkill.builder().worker(user).skillType(skillType).build();
            }
            skill.setDescription(a[8]);
            skill.setExperienceYears(Integer.parseInt(a[5]));
            skill.setHourlyRate(a[6]);
            skill.setIsVerified(true);
            workerSkillRepository.save(skill);

            // Only create listing if none exists — don't overwrite user edits
            List<Listing> existingListings = listingRepository.findByArtisanIdOrderByCreatedAtDesc(user.getId());
            if (existingListings.isEmpty()) {
                String imagesJson = "[\"" + listingImages[i][0] + "\",\"" + listingImages[i][1] + "\"]";
                Listing listing = Listing.builder()
                        .artisan(user)
                        .skillType(skillType)
                        .title("Professional " + skillType.name().replace("_", " ") + " Services")
                        .description(a[8])
                        .priceStart(a[6])
                        .location(a[7])
                        .latitude(user.getLatitude())
                        .longitude(user.getLongitude())
                        .images(imagesJson)
                        .status(Listing.ListingStatus.APPROVED)
                        .isActive(true)
                        .build();
                listingRepository.save(listing);
            }
        }

        log.info("Seeded/updated {} artisans with skills and listings", artisans.length);
    }
}
