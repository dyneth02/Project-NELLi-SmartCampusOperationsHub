package com.nelli.smart_campus_operations_hub.model;

import com.nelli.smart_campus_operations_hub.enums.TicketCategory;
import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import com.nelli.smart_campus_operations_hub.util.AppConstants;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a maintenance/support ticket from initial report to closure across the defined ticket
 * lifecycle.
 */
@Entity
@Table(
        name = "tickets",
        indexes = {
                @Index(name = "idx_ticket_facility", columnList = "facility_id"),
                @Index(name = "idx_ticket_reported_by", columnList = "reported_by"),
                @Index(name = "idx_ticket_assigned_to", columnList = "assigned_to"),
                @Index(name = "idx_ticket_status", columnList = "status"),
                @Index(name = "idx_ticket_priority", columnList = "priority")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ticket extends BaseEntity {

    @NotBlank
    @Size(max = 20)
    @Column(name = "ticket_number", nullable = false, unique = true, length = 20)
    private String ticketNumber;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "facility_id", nullable = false)
    private Facility facility;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "reported_by", nullable = false)
    private User reportedBy;

    @ManyToOne
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 40)
    private TicketCategory category;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private TicketPriority priority;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Default
    @Column(name = "status", nullable = false, length = 20)
    private TicketStatus status = TicketStatus.OPEN;

    @NotBlank
    @Size(max = 5000)
    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @NotBlank
    @Email
    @Size(max = 100)
    @Column(name = "contact_email", nullable = false, length = 100)
    private String contactEmail;

    @Size(max = 20)
    @Pattern(regexp = "^\\+?[1-9]\\d{1,14}$", message = "Invalid international phone format.")
    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Default
    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TicketAttachment> attachments = new ArrayList<>();

    @Default
    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    /**
     * @return elapsed hours from creation until first non-OPEN status update.
     */
    public long getResponseTimeHours() {
        if (getCreatedAt() == null || getUpdatedAt() == null || status == TicketStatus.OPEN) {
            return 0L;
        }
        return Duration.between(getCreatedAt(), getUpdatedAt()).toHours();
    }

    /**
     * @return elapsed hours from ticket creation until it was resolved.
     */
    public long getResolutionTimeHours() {
        if (getCreatedAt() == null || resolvedAt == null) {
            return 0L;
        }
        return Duration.between(getCreatedAt(), resolvedAt).toHours();
    }

    @PrePersist
    private void ensureTicketNumber() {
        if (ticketNumber != null && !ticketNumber.isBlank()) {
            return;
        }
        int year = Year.now().getValue();
        int randomNumber = ThreadLocalRandom.current().nextInt(0, 1_000_000);
        this.ticketNumber = String.format(
                "%s-%d-%06d",
                AppConstants.TICKET_NUMBER_PREFIX,
                year,
                randomNumber
        );
    }
}
