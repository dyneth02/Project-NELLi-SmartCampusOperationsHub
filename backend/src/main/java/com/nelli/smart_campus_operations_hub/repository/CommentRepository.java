package com.nelli.smart_campus_operations_hub.repository;

import com.nelli.smart_campus_operations_hub.model.Comment;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for ticket comments and comment activity lookups.
 */
@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {

    /**
     * Finds all comments for a ticket in chronological order.
     *
     * @param ticketId ticket id
     * @return comments ordered by creation date ascending
     */
    List<Comment> findByTicketIdOrderByCreatedAtAsc(UUID ticketId);

    /**
     * Finds all comments authored by a user.
     *
     * @param userId user id
     * @return comments by the user
     */
    List<Comment> findByUserId(UUID userId);

    /**
     * Counts comments attached to a ticket.
     *
     * @param ticketId ticket id
     * @return comment count
     */
    long countByTicketId(UUID ticketId);

    /**
     * Finds comments created after the given date-time for notification triggering.
     *
     * @param ticketId ticket id
     * @param since lower bound timestamp
     * @return recent comments
     */
    @Query("SELECT c FROM Comment c WHERE c.ticket.id = :ticketId AND c.createdAt > :since")
    List<Comment> findRecentComments(@Param("ticketId") UUID ticketId, @Param("since") LocalDateTime since);
}
