package com.nelli.smart_campus_operations_hub.repository;

import com.nelli.smart_campus_operations_hub.enums.FacilityStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityType;
import com.nelli.smart_campus_operations_hub.model.Facility;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for {@link Facility} entities and search filters.
 */
@Repository
public interface FacilityRepository extends JpaRepository<Facility, UUID> {

    /**
     * Finds facilities by operational status.
     *
     * @param status facility status
     * @return facilities matching status
     */
    List<Facility> findByStatus(FacilityStatus status);

    /**
     * Finds facilities by facility type.
     *
     * @param type facility type
     * @return facilities matching type
     */
    List<Facility> findByType(FacilityType type);

    /**
     * Finds facilities by combined type and status.
     *
     * @param type facility type
     * @param status facility status
     * @return facilities matching both filters
     */
    List<Facility> findByTypeAndStatus(FacilityType type, FacilityStatus status);

    /**
     * Finds facilities with capacity at or above the provided minimum and matching status.
     *
     * @param capacity minimum required capacity
     * @param status facility status
     * @return facilities that satisfy capacity and status
     */
    List<Facility> findByCapacityGreaterThanEqualAndStatus(Integer capacity, FacilityStatus status);

    /**
     * Performs keyword search over facility name and location while constraining by status.
     *
     * @param keyword search keyword
     * @param status required facility status
     * @return facilities matching keyword and status
     */
    @Query(
            "SELECT f FROM Facility f WHERE "
                    + "(LOWER(f.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
                    + "LOWER(f.location) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND "
                    + "f.status = :status"
    )
    List<Facility> searchByKeywordAndStatus(
            @Param("keyword") String keyword,
            @Param("status") FacilityStatus status
    );

    /**
     * Applies advanced facility filters for search pages with optional capacity and location.
     *
     * @param type required facility type
     * @param capacity optional minimum capacity
     * @param location optional location keyword
     * @return active facilities matching provided filters
     */
    @Query(
            "SELECT f FROM Facility f WHERE f.type = :type AND "
                    + "(:capacity IS NULL OR f.capacity >= :capacity) AND "
                    + "(:location IS NULL OR LOWER(f.location) LIKE LOWER(CONCAT('%', :location, '%'))) AND "
                    + "f.status = 'ACTIVE'"
    )
    List<Facility> findWithFilters(
            @Param("type") FacilityType type,
            @Param("capacity") Integer capacity,
            @Param("location") String location
    );
}
