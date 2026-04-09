package com.nelli.smart_campus_operations_hub.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Stores per-user notification settings.
 * This record is expected to be created automatically when a user registers.
 */
@Entity
@Table(name = "notification_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreferences {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID id;

    @NotNull
    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Default
    @Column(name = "booking_updates", nullable = false)
    private boolean bookingUpdates = true;

    @Default
    @Column(name = "ticket_updates", nullable = false)
    private boolean ticketUpdates = true;

    @Default
    @Column(name = "comment_notifications", nullable = false)
    private boolean commentNotifications = true;

    @Default
    @Column(name = "email_notifications", nullable = false)
    private boolean emailNotifications = true;

    @Default
    @Column(name = "weekly_digest", nullable = false)
    private boolean weeklyDigest = true;
}
