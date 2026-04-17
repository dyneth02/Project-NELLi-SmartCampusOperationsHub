package com.nelli.smart_campus_operations_hub.model;

import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a facility booking request from creation through approval, rejection, or cancellation.
 */
@Entity
@Table(
        name = "bookings",
        indexes = {
                @Index(
                        name = "idx_booking_facility_time",
                        columnList = "facility_id, start_date_time, end_date_time"
                ),
                @Index(name = "idx_booking_user", columnList = "user_id"),
                @Index(name = "idx_booking_status", columnList = "status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking extends BaseEntity {

    @NotNull
    @ManyToOne
    @JoinColumn(name = "facility_id", nullable = false)
    private Facility facility;

    @NotNull
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull
    @Column(name = "start_date_time", nullable = false)
    private LocalDateTime startDateTime;

    @NotNull
    @Column(name = "end_date_time", nullable = false)
    private LocalDateTime endDateTime;

    @NotBlank
    @Size(max = 1000)
    @Column(name = "purpose", nullable = false, length = 1000)
    private String purpose;

    @Min(1)
    @Column(name = "expected_attendees")
    private Integer expectedAttendees;

    @NotBlank
    @Email
    @Size(max = 100)
    @Column(name = "contact_email", nullable = false, length = 100)
    private String contactEmail;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Default
    @Column(name = "status", nullable = false, length = 20)
    private BookingStatus status = BookingStatus.PENDING;

    @Size(max = 500)
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @ManyToOne
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "recurring_group_id")
    private UUID recurringGroupId;

    @Default
    @Column(name = "is_recurring", nullable = false)
    private boolean isRecurring = false;

    /**
     * @return the booking duration in minutes; {@code 0} if the time range is incomplete.
     */
    public long getDurationMinutes() {
        if (startDateTime == null || endDateTime == null) {
            return 0L;
        }
        return Duration.between(startDateTime, endDateTime).toMinutes();
    }

    @AssertTrue(message = "endDateTime must be after startDateTime.")
    private boolean isEndDateAfterStartDate() {
        if (startDateTime == null || endDateTime == null) {
            return true;
        }
        return endDateTime.isAfter(startDateTime);
    }

    @AssertTrue(message = "startDateTime must be in the future for new bookings.")
    private boolean isStartDateTimeInFutureForNewBooking() {
        if (startDateTime == null || getId() != null) {
            return true;
        }
        return startDateTime.isAfter(LocalDateTime.now());
    }
}
