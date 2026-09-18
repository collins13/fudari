package com.tufixit.backend.config;

import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.util.LocationNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Derives county/town/area from existing free-text locationName values.
 *
 * Only fills blanks, so an artisan or admin who has set the structured fields
 * explicitly is never overwritten on restart.
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class UserLocationBackfill implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) {
        List<User> updated = new ArrayList<>();

        for (User user : userRepository.findAll()) {
            if (user.getLocationName() == null || user.getLocationName().isBlank()) continue;
            if (user.getCounty() != null && user.getTown() != null) continue;

            LocationNormalizer.Parsed parsed = LocationNormalizer.parse(user.getLocationName());
            if (parsed.county() == null && parsed.town() == null && parsed.area() == null) continue;

            if (user.getCounty() == null) user.setCounty(parsed.county());
            if (user.getTown() == null) user.setTown(parsed.town());
            if (user.getArea() == null) user.setArea(parsed.area());
            if (user.getServiceRadiusKm() == null) user.setServiceRadiusKm(15);
            updated.add(user);
        }

        if (!updated.isEmpty()) {
            userRepository.saveAll(updated);
            log.info("Backfilled structured location for {} users", updated.size());
        }
    }
}
