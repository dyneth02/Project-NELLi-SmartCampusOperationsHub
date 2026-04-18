package com.nelli.smart_campus_operations_hub.repository;

import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import com.nelli.smart_campus_operations_hub.model.Ticket;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for {@link Ticket} tracking, filtering, and analytics.
 */
@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    /**
     * Finds tickets reported by a user, newest first.
     *
     * @param reportedById reporter id
     * @return reported tickets sorted by creation time descending
     */
    List<Ticket> findByReportedByIdOrderByCreatedAtDesc(UUID reportedById);

    /**
     * Finds tickets assigned to a technician ordered by priority and age.
     *
     * @param assignedToId technician id
     * @return assigned tickets sorted by priority descending then creation ascending
     */
    List<Ticket> findByAssignedToIdOrderByPriorityDescCreatedAtAsc(UUID assignedToId);

    /**
     * Finds all tickets for a facility.
     *
     * @param facilityId facility id
     * @return facility tickets
     */
    List<Ticket> findByFacilityId(UUID facilityId);

    /**
     * Finds tickets by status.
     *
     * @param status ticket status
     * @return tickets in status
     */
    List<Ticket> findByStatus(TicketStatus status);

    /**
     * Finds tickets by status and priority.
     *
     * @param status ticket status
     * @param priority ticket priority
     * @return matching tickets
     */
    List<Ticket> findByStatusAndPriority(TicketStatus status, TicketPriority priority);

    /**
     * Applies optional filter set for admin and technician views.
     *
     * @param statuses required statuses
     * @param priority optional priority
     * @param facilityId optional facility id
     * @param assignedToId optional assignee id
     * @return tickets matching supplied filters
     */
    @Query(
            "SELECT t FROM Ticket t WHERE t.status IN :statuses AND "
                    + "(:priority IS NULL OR t.priority = :priority) AND "
                    + "(:facilityId IS NULL OR t.facility.id = :facilityId) AND "
                    + "(:assignedToId IS NULL OR t.assignedTo.id = :assignedToId)"
    )
    List<Ticket> findWithFilters(
            @Param("statuses") List<TicketStatus> statuses,
            @Param("priority") TicketPriority priority,
            @Param("facilityId") UUID facilityId,
            @Param("assignedToId") UUID assignedToId
    );

    /**
     * Finds tickets that are still active and currently unassigned.
     *
     * @return unassigned active tickets
     */
    @Query("SELECT t FROM Ticket t WHERE t.status NOT IN ('CLOSED', 'RESOLVED') AND t.assignedTo IS NULL")
    List<Ticket> findUnassignedTickets();

    /**
     * Finds active tickets raised by a specific user.
     *
     * @param userId reporter id
     * @return non-closed tickets for the user
     */
    @Query("SELECT t FROM Ticket t WHERE t.reportedBy.id = :userId AND t.status NOT IN ('CLOSED')")
    List<Ticket> findActiveTicketsByUser(@Param("userId") UUID userId);

    /**
     * Counts tickets by status for dashboard analytics.
     *
     * @param status ticket status
     * @return count of tickets in status
     */
    long countByStatus(TicketStatus status);

    /**
     * Calculates average resolution time in hours for resolved tickets.
     *
     * @return average resolution time in hours, nullable when no resolved tickets exist
     */
    @Query(
            value = "SELECT AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600.0) "
                    + "FROM tickets t "
                    + "WHERE t.status = 'RESOLVED' AND t.resolved_at IS NOT NULL",
            nativeQuery = true
    )
    Double getAverageResolutionTimeHours();
}
