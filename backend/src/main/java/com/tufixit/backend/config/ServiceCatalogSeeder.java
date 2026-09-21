package com.tufixit.backend.config;

import com.tufixit.backend.entity.ServiceOffering;
import com.tufixit.backend.entity.WorkerSkill.SkillType;
import com.tufixit.backend.repository.ServiceOfferingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Seeds the sub-service catalogue.
 *
 * Idempotent by slug, so it only ever adds rows that do not exist. Admin edits to
 * an existing service are never overwritten.
 */
@Component
@Order(3)
@RequiredArgsConstructor
@Slf4j
public class ServiceCatalogSeeder implements CommandLineRunner {

    private final ServiceOfferingRepository serviceOfferingRepository;

    private record Seed(SkillType skill, String name, boolean emergency, Integer from, Integer to, String... synonyms) {
    }

    private static final List<Seed> CATALOG = List.of(
            // Plumbing
            new Seed(SkillType.PLUMBER, "Emergency Plumber", true, 2000, 8000, "burst pipe", "flooding", "urgent plumber"),
            new Seed(SkillType.PLUMBER, "Drain Unblocking", false, 1500, 6000, "blocked drain", "choked sink", "blocked toilet"),
            new Seed(SkillType.PLUMBER, "Pipe Repair", false, 1500, 7000, "leaking pipe", "burst pipe repair"),
            new Seed(SkillType.PLUMBER, "Water Heater Installation", false, 3000, 15000, "shower heater", "instant shower", "geyser"),
            new Seed(SkillType.PLUMBER, "Toilet Repair", false, 1200, 5000, "cistern not filling", "running toilet"),
            new Seed(SkillType.PLUMBER, "Water Tank Installation", false, 4000, 20000, "tank plumbing", "roof tank"),
            new Seed(SkillType.PLUMBER, "Bathroom Fitting", false, 5000, 40000, "bathroom renovation", "shower installation"),

            // Electrical
            new Seed(SkillType.ELECTRICIAN, "Emergency Electrician", true, 2000, 9000, "power outage", "sparking socket", "urgent electrician"),
            new Seed(SkillType.ELECTRICIAN, "House Wiring", false, 15000, 120000, "rewiring", "new wiring", "kuweka stima"),
            new Seed(SkillType.ELECTRICIAN, "Electrical Repair", false, 1500, 8000, "no power", "tripping breaker", "short circuit"),
            new Seed(SkillType.ELECTRICIAN, "Socket Installation", false, 800, 3000, "add socket", "power point"),
            new Seed(SkillType.ELECTRICIAN, "Lighting Installation", false, 1000, 12000, "light fitting", "chandelier", "spotlights"),
            new Seed(SkillType.ELECTRICIAN, "Consumer Unit Upgrade", false, 6000, 25000, "distribution board", "fuse box"),
            new Seed(SkillType.ELECTRICIAN, "Backup Power Installation", false, 10000, 90000, "inverter", "generator changeover"),

            // Security / CCTV
            new Seed(SkillType.CCTV_INSTALLER, "CCTV Installation", false, 12000, 90000, "security camera", "camera installation"),
            new Seed(SkillType.CCTV_INSTALLER, "CCTV Repair", false, 2000, 12000, "camera not recording", "dvr fault"),
            new Seed(SkillType.SECURITY, "Electric Fence Installation", false, 25000, 200000, "electric fence", "perimeter security"),
            new Seed(SkillType.SECURITY, "Alarm System Installation", false, 10000, 70000, "burglar alarm", "panic button"),
            new Seed(SkillType.SECURITY, "Access Control Installation", false, 15000, 120000, "gate access", "biometric door"),

            // Carpentry & interiors
            new Seed(SkillType.CARPENTER, "Furniture Making", false, 8000, 90000, "custom furniture", "sofa making"),
            new Seed(SkillType.CARPENTER, "Kitchen Cabinets", false, 25000, 250000, "fitted kitchen", "cabinet installation"),
            new Seed(SkillType.CARPENTER, "Door Installation", false, 3000, 25000, "door fitting", "door repair"),
            new Seed(SkillType.CARPENTER, "Wardrobe Fitting", false, 15000, 120000, "built in wardrobe", "closet"),
            new Seed(SkillType.CEILING_BOARD, "Gypsum Ceiling Installation", false, 8000, 60000, "gypsum ceiling", "false ceiling"),
            new Seed(SkillType.INTERIOR_DESIGNER, "Interior Design Consultation", false, 5000, 50000, "interior decor", "space planning"),

            // Building trades
            new Seed(SkillType.MASON, "Wall Construction", false, 10000, 200000, "block work", "perimeter wall"),
            new Seed(SkillType.MASON, "Plastering", false, 5000, 60000, "wall plaster", "skimming"),
            new Seed(SkillType.TILING, "Floor Tiling", false, 6000, 80000, "floor tiles", "tile fixing"),
            new Seed(SkillType.TILING, "Bathroom Tiling", false, 6000, 50000, "wall tiles", "shower tiling"),
            new Seed(SkillType.ROOFING, "Roof Repair", false, 4000, 40000, "leaking roof", "roof leak"),
            new Seed(SkillType.ROOFING, "Roof Installation", false, 30000, 400000, "new roof", "mabati roofing"),
            new Seed(SkillType.PAINTER, "Interior Painting", false, 6000, 80000, "house painting", "wall painting"),
            new Seed(SkillType.PAINTER, "Exterior Painting", false, 10000, 150000, "outside painting", "weatherproof paint"),
            new Seed(SkillType.WELDER, "Gate Fabrication", false, 15000, 150000, "steel gate", "metal gate"),
            new Seed(SkillType.WELDER, "Window Grills", false, 6000, 60000, "burglar proofing", "grill fitting"),
            new Seed(SkillType.GLASS_FITTER, "Window Glass Replacement", false, 2500, 25000, "broken window", "glass repair"),

            // Appliances & climate
            new Seed(SkillType.APPLIANCE_REPAIR, "Fridge Repair", false, 2000, 15000, "fridge not cooling", "freezer repair"),
            new Seed(SkillType.APPLIANCE_REPAIR, "Washing Machine Repair", false, 2000, 15000, "washer not spinning", "washing machine fault"),
            new Seed(SkillType.APPLIANCE_REPAIR, "Cooker & Oven Repair", false, 1800, 12000, "oven not heating", "cooker repair"),
            new Seed(SkillType.HVAC_TECHNICIAN, "Air Conditioner Installation", false, 8000, 60000, "ac installation", "split unit"),
            new Seed(SkillType.HVAC_TECHNICIAN, "Air Conditioner Servicing", false, 2500, 12000, "ac service", "ac not cooling"),

            // Water infrastructure
            new Seed(SkillType.BOREHOLE_DRILLING, "Borehole Drilling", false, 600000, 1800000, "drill borehole", "water well"),
            new Seed(SkillType.BOREHOLE_DRILLING, "Borehole Pump Repair", false, 8000, 90000, "submersible pump", "pump not working"),
            new Seed(SkillType.WATER_TANK_CLEANING, "Water Tank Cleaning", false, 2500, 12000, "tank cleaning", "dirty water tank"),

            // Solar
            new Seed(SkillType.SOLAR_TECHNICIAN, "Solar Panel Installation", false, 40000, 500000, "solar system", "off grid solar"),
            new Seed(SkillType.SOLAR_TECHNICIAN, "Solar Water Heater Installation", false, 45000, 180000, "solar geyser", "solar heating"),
            new Seed(SkillType.SOLAR_TECHNICIAN, "Solar System Repair", false, 3000, 30000, "solar not charging", "inverter fault"),

            // Home services
            new Seed(SkillType.CLEANER, "Deep House Cleaning", false, 3000, 20000, "deep clean", "move out cleaning"),
            new Seed(SkillType.CLEANER, "Sofa & Carpet Cleaning", false, 2500, 15000, "sofa cleaning", "carpet shampoo"),
            new Seed(SkillType.CLEANER, "Post-Construction Cleaning", false, 8000, 60000, "after construction cleaning"),
            new Seed(SkillType.MAMA_FUA, "Laundry & Ironing", false, 800, 3000, "mama fua", "kufua nguo", "washing clothes"),
            new Seed(SkillType.MAMA_FUA, "House Cleaning (Daily)", false, 800, 2500, "day bug", "house help daily"),
            new Seed(SkillType.FUMIGATION, "Pest Control & Fumigation", false, 3000, 25000, "cockroaches", "bedbugs", "termites"),
            new Seed(SkillType.GARDENER, "Garden Maintenance", false, 1500, 12000, "lawn mowing", "hedge trimming"),
            new Seed(SkillType.GARDENER, "Landscaping", false, 15000, 200000, "garden design", "paving"),
            new Seed(SkillType.LOCKSMITH, "Lock Repair & Replacement", false, 1500, 12000, "locked out", "change locks", "broken lock"),

            // Automotive
            new Seed(SkillType.MECHANIC, "Emergency Roadside Assistance", true, 2000, 15000, "car broke down", "towing", "jump start"),
            new Seed(SkillType.MECHANIC, "Car Service & Maintenance", false, 3000, 25000, "oil change", "full service"),
            new Seed(SkillType.MECHANIC, "Engine Diagnostics & Repair", false, 3000, 80000, "engine light", "engine knocking"),
            new Seed(SkillType.MECHANIC, "Auto Electrical Repair", false, 2000, 20000, "car not starting", "alternator", "car battery"),
            new Seed(SkillType.TYRE_SERVICES, "Puncture Repair", false, 300, 1500, "puncture", "flat tyre"),
            new Seed(SkillType.TYRE_SERVICES, "Wheel Alignment & Balancing", false, 1500, 6000, "alignment", "balancing"),
            new Seed(SkillType.CAR_WASH, "Car Wash", false, 300, 1500, "car cleaning", "kuosha gari"),
            new Seed(SkillType.CAR_WASH, "Car Detailing & Interior Cleaning", false, 2500, 15000, "detailing", "interior valet"),

            // Transport & delivery
            new Seed(SkillType.MOVER, "House Moving", false, 8000, 60000, "house shifting", "relocation"),
            new Seed(SkillType.MOVER, "Office Relocation", false, 20000, 200000, "office move"),
            new Seed(SkillType.COURIER, "Same-Day Delivery", false, 300, 2500, "send parcel", "same day"),
            new Seed(SkillType.BODA_BODA, "Boda Boda Ride", false, 100, 800, "boda", "motorbike ride"),
            new Seed(SkillType.TUK_TUK, "Tuk Tuk Ride", false, 150, 1000, "tuk tuk", "three wheeler"),
            new Seed(SkillType.TRANSPORT_PROVIDER, "Pickup & Light Haulage", false, 3000, 25000, "pickup hire", "truck for hire", "lorry"),

            // Personal care
            new Seed(SkillType.BARBER, "Home Barber Visit", false, 300, 2000, "mobile barber", "kinyozi nyumbani"),
            new Seed(SkillType.HAIR_SALON, "Braiding & Weaving", false, 800, 6000, "braids", "weave", "cornrows"),
            new Seed(SkillType.HAIR_SALON, "Wash, Blow-Dry & Styling", false, 500, 3500, "blow dry", "hair styling"),
            new Seed(SkillType.MAKEUP_ARTIST, "Bridal Makeup", false, 5000, 40000, "wedding makeup", "bridal"),
            new Seed(SkillType.MAKEUP_ARTIST, "Event Makeup", false, 2000, 12000, "party makeup", "photoshoot makeup"),

            // Events & digital
            new Seed(SkillType.EVENT_LIGHTING, "Event Lighting Setup", false, 10000, 120000, "stage lighting", "party lights"),
            new Seed(SkillType.PHOTOGRAPHER, "Event Photography", false, 8000, 80000, "wedding photographer", "event photos"),
            new Seed(SkillType.PHOTOGRAPHER, "Portrait & Product Photography", false, 3000, 30000, "studio shoot", "product photos"),
            new Seed(SkillType.GRAPHIC_DESIGNER, "Logo & Brand Design", false, 5000, 60000, "logo design", "branding"),
            new Seed(SkillType.GRAPHIC_DESIGNER, "Marketing Material Design", false, 2000, 25000, "flyer design", "poster design"),
            new Seed(SkillType.IT_TECHNICIAN, "Laptop & Computer Repair", false, 1500, 20000, "laptop repair", "computer not booting"),
            new Seed(SkillType.IT_TECHNICIAN, "Network & WiFi Setup", false, 3000, 40000, "wifi setup", "router configuration", "networking"),
            new Seed(SkillType.IT_TECHNICIAN, "Data Recovery", false, 3000, 40000, "recover files", "hard disk crash"));

    @Override
    @Transactional
    public void run(String... args) {
        List<ServiceOffering> toCreate = new ArrayList<>();

        for (Seed seed : CATALOG) {
            String slug = slugify(seed.name());
            if (serviceOfferingRepository.existsBySlug(slug)) continue;

            toCreate.add(ServiceOffering.builder()
                    .name(seed.name())
                    .slug(slug)
                    .skillType(seed.skill())
                    .synonyms(new LinkedHashSet<>(Set.of(seed.synonyms())))
                    .priceFromKes(seed.from())
                    .priceToKes(seed.to())
                    .isEmergency(seed.emergency())
                    .isActive(true)
                    .indexable(true)
                    .sortOrder(seed.emergency() ? 0 : 10)
                    .build());
        }

        if (!toCreate.isEmpty()) {
            serviceOfferingRepository.saveAll(toCreate);
            log.info("Seeded {} service offerings", toCreate.size());
        }
    }

    private static String slugify(String name) {
        return name.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}
