package com.tufixit.backend.config;

import com.tufixit.backend.entity.SkillMetadata;
import com.tufixit.backend.entity.WorkerSkill.SkillType;
import com.tufixit.backend.repository.SkillMetadataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Seeds SEO metadata for every SkillType.
 *
 * Swahili terms are taken from the labels already used in the product, not
 * invented. Synonyms exist so alternate phrasings can canonicalise to the main
 * skill page — they never get pages of their own.
 *
 * Idempotent by skill type; admin edits are never overwritten.
 */
@Component
@Order(5)
@RequiredArgsConstructor
@Slf4j
public class SkillMetadataSeeder implements CommandLineRunner {

    private final SkillMetadataRepository skillMetadataRepository;

    private record Seed(SkillType type, String name, String plural, String slug,
                        List<String> synonyms, List<String> swahili) {
    }

    private static final List<Seed> SEEDS = List.of(
            new Seed(SkillType.PLUMBER, "Plumber", "Plumbers", "plumbers",
                    List.of("plumbing", "plumbing services", "plumbing contractor", "pipe fitter"),
                    List.of("fundi wa mabomba", "fundi mabomba", "fundi wa plumbing")),
            new Seed(SkillType.ELECTRICIAN, "Electrician", "Electricians", "electricians",
                    List.of("electrical services", "electrical contractor", "electrical repair"),
                    List.of("fundi wa umeme", "fundi umeme", "fundi stima", "fundi wa stima")),
            new Seed(SkillType.MECHANIC, "Mechanic", "Mechanics", "mechanics",
                    List.of("car mechanic", "auto repair", "garage", "motor vehicle repair"),
                    List.of("fundi wa magari", "fundi magari")),
            new Seed(SkillType.CARPENTER, "Carpenter", "Carpenters", "carpenters",
                    List.of("carpentry", "joinery", "furniture maker", "woodwork"),
                    List.of("fundi wa seremala", "fundi seremala", "fundi wa mbao")),
            new Seed(SkillType.PAINTER, "Painter", "Painters", "painters",
                    List.of("painting services", "house painter", "painting contractor"),
                    List.of("fundi wa rangi", "fundi rangi")),
            new Seed(SkillType.WELDER, "Welder", "Welders", "welders",
                    List.of("welding", "fabrication", "metal works", "steel fabrication"),
                    List.of("fundi wa chuma", "fundi chuma", "fundi wa welding")),
            new Seed(SkillType.HVAC_TECHNICIAN, "HVAC Technician", "HVAC Technicians", "hvac-technicians",
                    List.of("air conditioning", "ac technician", "ac repair", "ventilation"),
                    List.of("fundi wa ac", "fundi ac")),
            new Seed(SkillType.APPLIANCE_REPAIR, "Appliance Repair", "Appliance Repair Technicians",
                    "appliance-repair-technicians",
                    List.of("fridge repair", "washing machine repair", "cooker repair", "home appliance repair"),
                    List.of("fundi wa vifaa", "fundi wa friji", "fundi friji")),
            new Seed(SkillType.ROOFING, "Roofing", "Roofing Contractors", "roofing-contractors",
                    List.of("roofer", "roof repair", "roofing services", "mabati roofing"),
                    List.of("fundi wa paa", "fundi paa", "fundi wa mabati")),
            new Seed(SkillType.TILING, "Tiling", "Tilers", "tilers",
                    List.of("tile fitting", "floor tiling", "tiling services"),
                    List.of("fundi wa tiles", "fundi tiles", "fundi wa vigae")),
            new Seed(SkillType.MASON, "Mason", "Masons", "masons",
                    List.of("masonry", "bricklayer", "building contractor", "plastering"),
                    List.of("fundi wa ujenzi", "fundi ujenzi", "fundi wa mawe")),
            new Seed(SkillType.GARDENER, "Gardener", "Gardeners", "gardeners",
                    List.of("landscaping", "lawn care", "garden maintenance"),
                    List.of("fundi wa bustani", "fundi bustani")),
            new Seed(SkillType.CLEANER, "Cleaner", "Cleaners", "cleaners",
                    List.of("cleaning services", "house cleaning", "office cleaning", "deep cleaning"),
                    List.of("fundi wa usafi", "usafi")),
            new Seed(SkillType.SECURITY, "Security Systems", "Security System Installers",
                    "security-system-installers",
                    List.of("alarm installation", "access control", "electric fence"),
                    List.of("fundi wa usalama")),
            new Seed(SkillType.SOLAR_TECHNICIAN, "Solar Technician", "Solar Technicians", "solar-technicians",
                    List.of("solar installation", "solar panel installer", "solar water heater"),
                    List.of("fundi wa solar", "fundi solar")),
            new Seed(SkillType.BOREHOLE_DRILLING, "Borehole Drilling", "Borehole Drilling Contractors",
                    "borehole-drilling-contractors",
                    List.of("water well drilling", "borehole services", "borehole repair"),
                    List.of("fundi wa kisima", "fundi kisima")),
            new Seed(SkillType.FUMIGATION, "Fumigation", "Fumigation Services", "fumigation-services",
                    List.of("pest control", "cockroach control", "bedbug treatment", "termite control"),
                    List.of("fundi wa dawa", "kupiga dawa")),
            new Seed(SkillType.WATER_TANK_CLEANING, "Water Tank Cleaning", "Water Tank Cleaners",
                    "water-tank-cleaners",
                    List.of("tank cleaning", "water storage cleaning"),
                    List.of("fundi wa tanki", "kusafisha tanki")),
            new Seed(SkillType.GLASS_FITTER, "Glass Fitter", "Glass Fitters", "glass-fitters",
                    List.of("glazier", "window glass", "glass replacement", "aluminium work"),
                    List.of("fundi wa kioo", "fundi kioo")),
            new Seed(SkillType.CEILING_BOARD, "Ceiling Board", "Ceiling Board Fitters", "ceiling-board-fitters",
                    List.of("gypsum ceiling", "false ceiling", "ceiling installation"),
                    List.of("fundi wa dari", "fundi dari")),
            new Seed(SkillType.LOCKSMITH, "Locksmith", "Locksmiths", "locksmiths",
                    List.of("lock repair", "key cutting", "lock replacement"),
                    List.of("fundi wa kufuli", "fundi kufuli")),
            new Seed(SkillType.CCTV_INSTALLER, "CCTV Installer", "CCTV Installers", "cctv-installers",
                    List.of("security camera installation", "cctv repair", "surveillance"),
                    List.of("fundi wa camera", "fundi camera")),
            new Seed(SkillType.INTERIOR_DESIGNER, "Interior Designer", "Interior Designers", "interior-designers",
                    List.of("interior decoration", "home styling", "space planning"),
                    List.of("fundi wa mapambo")),
            new Seed(SkillType.MOVER, "Mover", "Movers", "movers",
                    List.of("moving services", "house movers", "office relocation", "removals"),
                    List.of("wahamishaji", "kuhama")),
            new Seed(SkillType.TRANSPORT_PROVIDER, "Transport Provider", "Transport Providers",
                    "transport-providers",
                    List.of("pickup hire", "truck for hire", "lorry hire", "haulage"),
                    List.of("usafiri wa mizigo", "gari ya mizigo")),
            new Seed(SkillType.EVENT_LIGHTING, "Event Lighting", "Event Lighting Providers",
                    "event-lighting-providers",
                    List.of("stage lighting", "party lighting", "sound and light"),
                    List.of("taa za hafla")),
            new Seed(SkillType.BODA_BODA, "Boda Boda", "Boda Boda Riders", "boda-boda-riders",
                    List.of("motorbike rider", "motorcycle taxi"),
                    List.of("boda boda", "pikipiki")),
            new Seed(SkillType.TUK_TUK, "Tuk Tuk", "Tuk Tuk Operators", "tuk-tuk-operators",
                    List.of("three wheeler", "auto rickshaw"),
                    List.of("tuk tuk")),
            new Seed(SkillType.COURIER, "Courier & Delivery", "Couriers", "couriers",
                    List.of("delivery services", "same day delivery", "parcel delivery", "errand runner"),
                    List.of("mtumaji", "kupeleka mzigo")),
            new Seed(SkillType.MAMA_FUA, "Mama Fua", "Mama Fua", "mama-fua",
                    List.of("laundry services", "house help", "washing and ironing", "day bug"),
                    List.of("mama fua", "kufua nguo")),
            new Seed(SkillType.BARBER, "Barber", "Barbers", "barbers",
                    List.of("mobile barber", "haircut", "barber shop"),
                    List.of("kinyozi")),
            new Seed(SkillType.HAIR_SALON, "Hair Salon", "Hair Salons", "hair-salons",
                    List.of("hairdresser", "braiding", "weaving", "hair styling"),
                    List.of("saluni", "kusuka nywele")),
            new Seed(SkillType.MAKEUP_ARTIST, "Makeup Artist", "Makeup Artists", "makeup-artists",
                    List.of("bridal makeup", "beauty services", "mua"),
                    List.of("msanii wa urembo")),
            new Seed(SkillType.CAR_WASH, "Car Wash", "Car Wash Services", "car-wash-services",
                    List.of("car cleaning", "car detailing", "valet"),
                    List.of("kuosha gari")),
            new Seed(SkillType.TYRE_SERVICES, "Tyre Services", "Tyre Specialists", "tyre-specialists",
                    List.of("puncture repair", "wheel alignment", "wheel balancing", "tyre fitting"),
                    List.of("fundi wa matairi", "fundi matairi")),
            new Seed(SkillType.PHOTOGRAPHER, "Photographer", "Photographers", "photographers",
                    List.of("event photography", "wedding photographer", "videographer"),
                    List.of("mpiga picha")),
            new Seed(SkillType.GRAPHIC_DESIGNER, "Graphic Designer", "Graphic Designers", "graphic-designers",
                    List.of("logo design", "branding", "flyer design"),
                    List.of("mbunifu wa michoro")),
            new Seed(SkillType.IT_TECHNICIAN, "IT Technician", "IT Technicians", "it-technicians",
                    List.of("computer repair", "laptop repair", "it support", "networking", "wifi setup"),
                    List.of("fundi wa kompyuta", "fundi kompyuta")),
            new Seed(SkillType.OTHER, "Other Services", "Service Providers", "service-providers",
                    List.of("general services", "handyman"),
                    List.of("fundi")));

    @Override
    @Transactional
    public void run(String... args) {
        List<SkillMetadata> toCreate = new ArrayList<>();
        int order = 0;

        for (Seed seed : SEEDS) {
            order += 10;
            if (skillMetadataRepository.existsBySkillType(seed.type())) continue;

            Set<String> keywords = new LinkedHashSet<>();
            keywords.add(seed.plural().toLowerCase());
            keywords.addAll(seed.synonyms());
            keywords.addAll(seed.swahili());

            toCreate.add(SkillMetadata.builder()
                    .skillType(seed.type())
                    .name(seed.name())
                    .pluralName(seed.plural())
                    .slug(seed.slug())
                    .seoTitleTemplate("{plural} in {location} | Fudari")
                    .seoDescriptionTemplate(
                            "Find {plural_lower} in {location} on Fudari. Compare verified providers by rating, "
                                    + "services offered, availability and price. Book directly, pay on completion.")
                    .keywords(keywords)
                    .synonyms(new LinkedHashSet<>(seed.synonyms()))
                    .swahiliKeywords(new LinkedHashSet<>(seed.swahili()))
                    .isActive(true)
                    .indexable(seed.type() != SkillType.OTHER)
                    .sortOrder(order)
                    .build());
        }

        if (!toCreate.isEmpty()) {
            skillMetadataRepository.saveAll(toCreate);
            log.info("Seeded {} skill metadata rows", toCreate.size());
        }
    }
}
