package com.nelli.smart_campus_operations_hub.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a ticket attachment persisted with Cloudinary metadata for retrieval and deletion.
 */
@Entity
@Table(
        name = "ticket_attachments",
        indexes = {@Index(name = "idx_attachment_ticket", columnList = "ticket_id")}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketAttachment extends BaseEntity {

    @NotNull
    @ManyToOne
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @NotBlank
    @Size(max = 255)
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @NotBlank
    @Size(max = 1000)
    @Column(name = "file_url", nullable = false, length = 1000)
    private String fileUrl;

    @NotBlank
    @Size(max = 255)
    @Column(name = "cloudinary_public_id", nullable = false, length = 255)
    private String cloudinaryPublicId;

    @NotBlank
    @Size(max = 50)
    @Column(name = "file_type", nullable = false, length = 50)
    private String fileType;

    @NotNull
    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;
}
