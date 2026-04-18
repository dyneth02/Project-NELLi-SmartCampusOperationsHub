package com.nelli.smart_campus_operations_hub.repository;

import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import com.nelli.smart_campus_operations_hub.model.Booking;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for {@link Booking} workflow and scheduling checks.
 */
@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    /**
     * Finds all bookings for a user ordered by newest start time first.
     *
     * @param userId user id
     * @return user bookings sorted descending by start date-time
     */
    List<Booking> findByUserIdOrderByStartDateTimeDesc(UUID userId);

    /**
     * Finds bookings for a user filtered by booking status.
     *
     * @param userId user id
     * @param status booking status
     * @return filtered user bookings
     */
    List<Booking> findByUserIdAndStatus(UUID userId, BookingStatus status);

    /**
     * Finds all bookings for a facility sorted chronologically by start date-time.
     *
     * @param facilityId facility id
     * @return facility bookings ordered ascending by start date-time
     */
    List<Booking> findByFacilityIdOrderByStartDateTimeAsc(UUID facilityId);

    /**
     * Finds bookings by status for administrative views.
     *
     * @param status booking status
     * @return bookings in that status
     */
    List<Booking> findByStatus(BookingStatus status);

    /**
     * Finds all bookings that belong to the same recurring series.
     *
     * @param recurringGroupId recurrence group id
     * @return bookings in the series
     */
    List<Booking> findByRecurringGroupId(UUID recurringGroupId);

    /**
     * Detects time conflicts with approved bookings for a facility.
     *
     * <p>Overlap rule: a new window [start1, end1] conflicts with an existing window [start2, end2]
     * when start1 < end2 AND end1 > start2. This method checks only approved records and can exclude
     * the current booking id during update flows.
     *
     * @param facilityId facility id
     * @param startDateTime candidate booking start
     * @param endDateTime candidate booking end
     * @param excludeBookingId booking id to exclude during update, nullable for create
     * @return {@code true} when an overlap exists
     */
    @Query(
            "SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Booking b WHERE "
                    + "b.facility.id = :facilityId AND "
                    + "b.status = 'APPROVED' AND "
                    + "(:excludeBookingId IS NULL OR b.id != :excludeBookingId) AND "
                    + "(b.startDateTime < :endDateTime AND b.endDateTime > :startDateTime)"
    )
    boolean hasOverlappingBookings(
            @Param("facilityId") UUID facilityId,
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime,
            @Param("excludeBookingId") UUID excludeBookingId
    );

    /**
     * Finds bookings with optional admin filters for status, facility, and date range.
     *
     * @param statuses required statuses
     * @param facilityId optional facility id
     * @param startDate optional lower bound for start
     * @param endDate optional upper bound for end
     * @return bookings matching all provided filters
     */
    @Query(
            "SELECT b FROM Booking b WHERE b.status IN :statuses AND "
                    + "(:facilityId IS NULL OR b.facility.id = :facilityId) AND "
                    + "(:startDate IS NULL OR b.startDateTime >= :startDate) AND "
                    + "(:endDate IS NULL OR b.endDateTime <= :endDate)"
    )
    List<Booking> findWithFilters(
            @Param("statuses") List<BookingStatus> statuses,
            @Param("facilityId") UUID facilityId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * Finds a user's upcoming approved bookings from the given point in time.
     *
     * @param userId user id
     * @param now current date-time
     * @return upcoming approved bookings
     */
    @Query(
            "SELECT b FROM Booking b WHERE b.user.id = :userId AND "
                    + "b.status = 'APPROVED' AND b.startDateTime > :now"
    )
    List<Booking> findUpcomingBookings(@Param("userId") UUID userId, @Param("now") LocalDateTime now);
}
