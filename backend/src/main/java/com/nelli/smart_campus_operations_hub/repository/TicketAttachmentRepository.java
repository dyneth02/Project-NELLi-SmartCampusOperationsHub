package com.nelli.smart_campus_operations_hub.repository;

import com.nelli.smart_campus_operations_hub.model.TicketAttachment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for ticket attachments.
 * Includes count lookups used to enforce the 3-image-per-ticket limit.
 */
@Repository
public interface TicketAttachmentRepository extends JpaRepository<TicketAttachment, UUID> {

    /**
     * Finds all attachments linked to a ticket.
     *
     * @param ticketId ticket id
     * @return ticket attachments
     */
    List<TicketAttachment> findByTicketId(UUID ticketId);

    /**
     * Counts ticket attachments, typically for max-image validation checks.
     *
     * @param ticketId ticket id
     * @return number of attachments
     */
    long countByTicketId(UUID ticketId);

    /**
     * Finds an attachment by Cloudinary public id.
     *
     * @param publicId Cloudinary public id
     * @return matching attachment when present
     */
    Optional<TicketAttachment> findByCloudinaryPublicId(String publicId);

    /**
     * Deletes all attachments for a ticket, usually during ticket cleanup flows.
     *
     * @param ticketId ticket id
     */
    void deleteByTicketId(UUID ticketId);
}
