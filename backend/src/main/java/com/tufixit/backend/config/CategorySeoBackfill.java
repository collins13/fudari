package com.tufixit.backend.config;

import com.tufixit.backend.entity.Category;
import com.tufixit.backend.entity.WorkerSkill;
import com.tufixit.backend.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class CategorySeoBackfill implements CommandLineRunner {

    private static final Map<String, WorkerSkill.SkillType> LEGACY_SKILL_TYPES = Map.ofEntries(
            Map.entry("Electrical", WorkerSkill.SkillType.ELECTRICIAN),
            Map.entry("Plumbing", WorkerSkill.SkillType.PLUMBER),
            Map.entry("Mechanics", WorkerSkill.SkillType.MECHANIC),
            Map.entry("Painting", WorkerSkill.SkillType.PAINTER),
            Map.entry("Carpentry", WorkerSkill.SkillType.CARPENTER),
            Map.entry("HVAC", WorkerSkill.SkillType.HVAC_TECHNICIAN),
            Map.entry("Welding", WorkerSkill.SkillType.WELDER),
            Map.entry("Masonry", WorkerSkill.SkillType.MASON),
            Map.entry("Cleaning", WorkerSkill.SkillType.CLEANER),
            Map.entry("Gardening", WorkerSkill.SkillType.GARDENER),
            Map.entry("Roofing", WorkerSkill.SkillType.ROOFING),
            Map.entry("Tiling", WorkerSkill.SkillType.TILING),
            Map.entry("Security", WorkerSkill.SkillType.SECURITY),
            Map.entry("Appliance Repair", WorkerSkill.SkillType.APPLIANCE_REPAIR),
            Map.entry("Moving", WorkerSkill.SkillType.MOVER),
            Map.entry("Transport", WorkerSkill.SkillType.TRANSPORT_PROVIDER),
            Map.entry("Event Lighting", WorkerSkill.SkillType.EVENT_LIGHTING),
            Map.entry("Mama Fua", WorkerSkill.SkillType.MAMA_FUA),
            Map.entry("Boda Boda", WorkerSkill.SkillType.BODA_BODA),
            Map.entry("Tuk Tuk", WorkerSkill.SkillType.TUK_TUK),
            Map.entry("Courier & Delivery", WorkerSkill.SkillType.COURIER),
            Map.entry("Barber", WorkerSkill.SkillType.BARBER),
            Map.entry("Hair Salon", WorkerSkill.SkillType.HAIR_SALON),
            Map.entry("Makeup & Beauty", WorkerSkill.SkillType.MAKEUP_ARTIST),
            Map.entry("Car Wash", WorkerSkill.SkillType.CAR_WASH),
            Map.entry("Tyre Services", WorkerSkill.SkillType.TYRE_SERVICES),
            Map.entry("Photography", WorkerSkill.SkillType.PHOTOGRAPHER),
            Map.entry("Design", WorkerSkill.SkillType.GRAPHIC_DESIGNER),
            Map.entry("IT Support", WorkerSkill.SkillType.IT_TECHNICIAN)
    );

    private final CategoryRepository categoryRepository;

    @Override
    @Transactional
    public void run(String... args) {
        int updated = 0;
        for (Category category : categoryRepository.findAll()) {
            boolean changed = false;
            if (category.getSlug() == null || category.getSlug().isBlank()) {
                category.setSlug(slugify(category.getName()));
                changed = true;
            }
            if (category.getSkillTypes().isEmpty()) {
                WorkerSkill.SkillType skillType = LEGACY_SKILL_TYPES.get(category.getName());
                if (skillType != null) {
                    category.setSkillTypes(Set.of(skillType));
                    changed = true;
                }
            }
            if (changed) {
                categoryRepository.save(category);
                updated++;
            }
        }
        if (updated > 0) {
            log.info("Backfilled SEO fields for {} categories", updated);
        }
    }

    private String slugify(String value) {
        return value.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}