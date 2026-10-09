package com.tufixit.backend.config;

import com.tufixit.backend.entity.Location;
import com.tufixit.backend.entity.Location.LocationType;
import com.tufixit.backend.repository.LocationRepository;
import com.tufixit.backend.util.LocationNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Seeds the Kenya location taxonomy.
 *
 * Counties are complete (all 47). Towns are seeded only where the county
 * relationship is certain, and estates only for Nairobi and Mombasa. Anything
 * uncertain is left for admins to add rather than guessed at.
 *
 * Idempotent by slug, so admin edits survive restarts.
 */
@Component
@Order(4)
@RequiredArgsConstructor
@Slf4j
public class LocationSeeder implements CommandLineRunner {

    private final LocationRepository locationRepository;

    /** name, latitude, longitude — coordinates are the county headquarters. */
    private record CountySeed(String name, Double lat, Double lng) {
    }

    private static final List<CountySeed> COUNTIES = List.of(
            new CountySeed("Baringo", 0.4667, 35.9667),
            new CountySeed("Bomet", -0.7833, 35.3417),
            new CountySeed("Bungoma", 0.5635, 34.5606),
            new CountySeed("Busia", 0.4608, 34.1115),
            new CountySeed("Elgeyo-Marakwet", 0.6700, 35.5000),
            new CountySeed("Embu", -0.5310, 37.4575),
            new CountySeed("Garissa", -0.4536, 39.6461),
            new CountySeed("Homa Bay", -0.5273, 34.4571),
            new CountySeed("Isiolo", 0.3546, 37.5822),
            new CountySeed("Kajiado", -1.8522, 36.7767),
            new CountySeed("Kakamega", 0.2827, 34.7519),
            new CountySeed("Kericho", -0.3689, 35.2863),
            new CountySeed("Kiambu", -1.1711, 36.8355),
            new CountySeed("Kilifi", -3.5107, 39.9093),
            new CountySeed("Kirinyaga", -0.4989, 37.2803),
            new CountySeed("Kisii", -0.6817, 34.7667),
            new CountySeed("Kisumu", -0.0917, 34.7680),
            new CountySeed("Kitui", -1.3667, 38.0106),
            new CountySeed("Kwale", -4.1737, 39.4521),
            new CountySeed("Laikipia", 0.0167, 37.0667),
            new CountySeed("Lamu", -2.2717, 40.9020),
            new CountySeed("Machakos", -1.5184, 37.2665),
            new CountySeed("Makueni", -1.8038, 37.6244),
            new CountySeed("Mandera", 3.9373, 41.8569),
            new CountySeed("Marsabit", 2.3284, 37.9899),
            new CountySeed("Meru", 0.0470, 37.6498),
            new CountySeed("Migori", -1.0634, 34.4731),
            new CountySeed("Mombasa", -4.0435, 39.6682),
            new CountySeed("Murang'a", -0.7839, 37.1500),
            new CountySeed("Nairobi", -1.2864, 36.8172),
            new CountySeed("Nakuru", -0.3031, 36.0800),
            new CountySeed("Nandi", 0.1833, 35.1000),
            new CountySeed("Narok", -1.0833, 35.8667),
            new CountySeed("Nyamira", -0.5633, 34.9358),
            new CountySeed("Nyandarua", -0.1833, 36.3833),
            new CountySeed("Nyeri", -0.4201, 36.9476),
            new CountySeed("Samburu", 1.0972, 36.6969),
            new CountySeed("Siaya", 0.0607, 34.2881),
            new CountySeed("Taita-Taveta", -3.3961, 38.5561),
            new CountySeed("Tana River", -1.5000, 40.0500),
            new CountySeed("Tharaka-Nithi", -0.3333, 37.6500),
            new CountySeed("Trans Nzoia", 1.0157, 35.0062),
            new CountySeed("Turkana", 3.1190, 35.5966),
            new CountySeed("Uasin Gishu", 0.5143, 35.2698),
            new CountySeed("Vihiga", 0.0500, 34.7167),
            new CountySeed("Wajir", 1.7471, 40.0573),
            new CountySeed("West Pokot", 1.2389, 35.1119));

    /** county -> towns. Only relationships that are unambiguous. */
    private static final Map<String, List<String>> TOWNS = new HashMap<>();

    static {
        TOWNS.put("Nairobi", List.of("Nairobi"));
        TOWNS.put("Mombasa", List.of("Mombasa"));
        TOWNS.put("Kisumu", List.of("Kisumu", "Ahero"));
        TOWNS.put("Nakuru", List.of("Nakuru", "Naivasha", "Gilgil", "Molo", "Njoro"));
        TOWNS.put("Uasin Gishu", List.of("Eldoret"));
        TOWNS.put("Kiambu", List.of("Kiambu", "Thika", "Ruiru", "Juja", "Limuru", "Kikuyu", "Githunguri"));
        TOWNS.put("Machakos", List.of("Machakos", "Athi River", "Mlolongo", "Kangundo", "Matuu"));
        TOWNS.put("Kajiado", List.of("Kajiado", "Kitengela", "Ongata Rongai", "Ngong", "Kiserian", "Isinya"));
        TOWNS.put("Nyeri", List.of("Nyeri", "Karatina", "Othaya"));
        TOWNS.put("Meru", List.of("Meru", "Maua", "Nkubu"));
        TOWNS.put("Kilifi", List.of("Kilifi", "Malindi", "Mtwapa", "Watamu"));
        TOWNS.put("Kwale", List.of("Kwale", "Ukunda", "Msambweni"));
        TOWNS.put("Trans Nzoia", List.of("Kitale"));
        TOWNS.put("Kakamega", List.of("Kakamega", "Mumias"));
        TOWNS.put("Bungoma", List.of("Bungoma", "Webuye", "Kimilili"));
        TOWNS.put("Busia", List.of("Busia", "Malaba"));
        TOWNS.put("Siaya", List.of("Siaya", "Bondo", "Ugunja"));
        TOWNS.put("Homa Bay", List.of("Homa Bay", "Oyugis", "Mbita"));
        TOWNS.put("Migori", List.of("Migori", "Rongo", "Awendo"));
        TOWNS.put("Kisii", List.of("Kisii", "Ogembo"));
        TOWNS.put("Nyamira", List.of("Nyamira"));
        TOWNS.put("Kericho", List.of("Kericho", "Litein"));
        TOWNS.put("Bomet", List.of("Bomet", "Sotik"));
        TOWNS.put("Nandi", List.of("Kapsabet", "Nandi Hills"));
        TOWNS.put("Baringo", List.of("Kabarnet", "Eldama Ravine"));
        TOWNS.put("Elgeyo-Marakwet", List.of("Iten"));
        TOWNS.put("West Pokot", List.of("Kapenguria"));
        TOWNS.put("Turkana", List.of("Lodwar"));
        TOWNS.put("Samburu", List.of("Maralal"));
        TOWNS.put("Laikipia", List.of("Nanyuki", "Nyahururu", "Rumuruti"));
        TOWNS.put("Nyandarua", List.of("Ol Kalou"));
        TOWNS.put("Kirinyaga", List.of("Kerugoya", "Kutus", "Sagana"));
        TOWNS.put("Murang'a", List.of("Murang'a", "Kenol", "Maragua"));
        TOWNS.put("Embu", List.of("Embu", "Runyenjes"));
        TOWNS.put("Tharaka-Nithi", List.of("Chuka"));
        TOWNS.put("Kitui", List.of("Kitui", "Mwingi"));
        TOWNS.put("Makueni", List.of("Wote", "Emali", "Makindu"));
        TOWNS.put("Isiolo", List.of("Isiolo"));
        TOWNS.put("Marsabit", List.of("Marsabit", "Moyale"));
        TOWNS.put("Mandera", List.of("Mandera"));
        TOWNS.put("Wajir", List.of("Wajir"));
        TOWNS.put("Garissa", List.of("Garissa"));
        TOWNS.put("Tana River", List.of("Hola"));
        TOWNS.put("Lamu", List.of("Lamu"));
        TOWNS.put("Taita-Taveta", List.of("Voi", "Wundanyi", "Taveta"));
        TOWNS.put("Vihiga", List.of("Vihiga", "Mbale"));
        TOWNS.put("Narok", List.of("Narok", "Kilgoris"));
    }

    /** town -> estates/areas. Deliberately limited to the two cities we can state confidently. */
    private static final Map<String, List<String>> AREAS = Map.of(
            "Nairobi", List.of(
                    "Nairobi CBD", "Westlands", "Kilimani", "Karen", "Kileleshwa", "Lavington",
                    "Runda", "Muthaiga", "Gigiri", "Parklands", "Ngara", "Eastleigh",
                    "South B", "South C", "Madaraka", "Nairobi West", "Langata", "Kibra",
                    "Kasarani", "Roysambu", "Githurai", "Ruaraka", "Embakasi", "Utawala",
                    "Donholm", "Buruburu", "Umoja", "Kayole", "Pipeline", "Dagoretti",
                    "Kawangware", "Upper Hill"),
            "Mombasa", List.of(
                    "Mvita", "Nyali", "Bamburi", "Shanzu", "Kisauni", "Bombolulu",
                    "Tudor", "Likoni", "Mtongwe", "Changamwe", "Port Reitz"),
                "Kisumu", List.of("Milimani", "Mamboleo", "Nyalenda", "Manyatta", "Kondele"),
                "Nakuru", List.of("Milimani", "Lanet", "Section 58", "Shabab", "London"),
                "Eldoret", List.of("Elgon View", "Kapsoya", "Langas", "Pioneer", "Annex"),
                "Thika", List.of("Section 9", "Makongeni", "Landless", "Ngoigwa"),
                "Ruiru", List.of("Membley", "Kamakis", "Gwa Kairu", "Murera"),
                "Kitengela", List.of("Acacia", "Milimani", "New Valley", "Noonkopir"));

            private static final Map<String, double[]> TOWN_COORDINATES = Map.of(
                "Eldoret", new double[]{0.5143, 35.2698},
                "Thika", new double[]{-1.0332, 37.0693},
                "Ruiru", new double[]{-1.1466, 36.9607},
                "Kitengela", new double[]{-1.4694, 36.9614});

    @Override
    @Transactional
    public void run(String... args) {
        int created = 0;

        Map<String, Location> countyBySlug = new HashMap<>();
        for (CountySeed seed : COUNTIES) {
            String slug = LocationNormalizer.slugify(seed.name());
            Location county = locationRepository.findBySlugAndType(slug, LocationType.COUNTY).orElse(null);
            if (county == null) {
                county = Location.builder()
                        .name(seed.name())
                        .slug(slug)
                        .type(LocationType.COUNTY)
                        .latitude(seed.lat())
                        .longitude(seed.lng())
                        .isActive(true)
                        .indexable(true)
                        .build();
                county = locationRepository.save(county);
                // A county is its own county for rollup queries.
                county.setCounty(county);
                county = locationRepository.save(county);
                created++;
            }
            countyBySlug.put(seed.name(), county);
        }

        Map<String, Location> townByName = new HashMap<>();
        List<Location> newTowns = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : TOWNS.entrySet()) {
            Location county = countyBySlug.get(entry.getKey());
            if (county == null) continue;

            for (String townName : entry.getValue()) {
                String slug = LocationNormalizer.slugify(townName);
                Location town = locationRepository.findBySlugAndType(slug, LocationType.TOWN).orElse(null);
                if (town == null) {
                    // uk_location_slug_non_area keeps slugs unique across counties and towns,
                    // so a same-named county (Nairobi, Kiambu, Kisumu...) already owns the URL.
                    Location sameSlugCounty = locationRepository
                            .findBySlugAndType(slug, LocationType.COUNTY).orElse(null);
                    if (sameSlugCounty != null) {
                        townByName.put(townName, sameSlugCounty);
                        continue;
                    }
                    town = Location.builder()
                            .name(townName)
                            .slug(slug)
                            .type(LocationType.TOWN)
                            .parent(county)
                            .county(county)
                            .latitude(TOWN_COORDINATES.containsKey(townName)
                                ? TOWN_COORDINATES.get(townName)[0] : null)
                            .longitude(TOWN_COORDINATES.containsKey(townName)
                                ? TOWN_COORDINATES.get(townName)[1] : null)
                            .isActive(true)
                            .indexable(true)
                            .build();
                    newTowns.add(town);
                }
                townByName.put(townName, town);
            }
        }
        if (!newTowns.isEmpty()) {
            locationRepository.saveAll(newTowns);
            created += newTowns.size();
        }

        List<Location> newAreas = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : AREAS.entrySet()) {
            Location town = townByName.get(entry.getKey());
            if (town == null || town.getId() == null) continue;

            for (String areaName : entry.getValue()) {
                String slug = LocationNormalizer.slugify(areaName);
                if (locationRepository.findBySlugAndParentId(slug, town.getId()).isPresent()) continue;

                newAreas.add(Location.builder()
                        .name(areaName)
                        .slug(slug)
                        .type(LocationType.AREA)
                        .parent(town)
                        .county(town.getCounty())
                        .isActive(true)
                        .indexable(true)
                        .build());
            }
        }
        if (!newAreas.isEmpty()) {
            locationRepository.saveAll(newAreas);
            created += newAreas.size();
        }

        if (created > 0) log.info("Seeded {} locations", created);
    }
}
