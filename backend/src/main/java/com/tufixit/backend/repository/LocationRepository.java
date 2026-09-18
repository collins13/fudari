package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocationRepository extends JpaRepository<Location, Long> {

    Optional<Location> findBySlugAndType(String slug, Location.LocationType type);

    Optional<Location> findBySlugAndParentId(String slug, Long parentId);

    List<Location> findByTypeAndIsActiveTrueOrderByNameAsc(Location.LocationType type);

    List<Location> findByParentIdAndIsActiveTrueOrderByNameAsc(Long parentId);

    boolean existsBySlugAndType(String slug, Location.LocationType type);

    /** Towns and areas rolling up to a county, for the county hub page. */
    @Query("""
            SELECT l FROM Location l
            WHERE l.county.id = :countyId AND l.type = :type AND l.isActive = true
            ORDER BY l.sortOrder ASC, l.name ASC
            """)
    List<Location> findByCountyAndType(@Param("countyId") Long countyId,
                                       @Param("type") Location.LocationType type);

    @Query("SELECT l FROM Location l WHERE l.isActive = true AND l.type <> 'AREA' ORDER BY l.name ASC")
    List<Location> findActiveCountiesAndTowns();
}
