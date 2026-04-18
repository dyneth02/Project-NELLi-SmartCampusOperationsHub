package com.nelli.smart_campus_operations_hub.model;

import com.nelli.smart_campus_operations_hub.enums.AuthProvider;
import com.nelli.smart_campus_operations_hub.enums.Role;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Represents a system user with authentication details, profile data, and relationships to
 * bookings, tickets, and notification preferences.
 */
@Entity
@Table(
        name = "users",
        indexes = {@Index(name = "idx_user_email", columnList = "email")}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = "passwordHash")
public class User extends BaseEntity {

    @NotBlank
    @Email
    @Size(max = 100)
    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;

    @Size(max = 255)
    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @NotBlank
    @Size(max = 100)
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Size(max = 20)
    @Column(name = "phone", length = 20)
    private String phone;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "role", nullable = false, length = 20)
    private Role role = Role.USER;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "auth_provider", nullable = false, length = 20)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Size(max = 100)
    @Column(name = "oauth_id", length = 100)
    private String oauthId;

    @Default
    @Column(name = "enabled", nullable = false)
    private boolean enabled = true;

    @Default
    @Column(name = "account_locked", nullable = false)
    private boolean accountLocked = false;

    @Default
    @OneToMany(mappedBy = "user")
    private List<Booking> bookings = new ArrayList<>();

    @Default
    @OneToMany(mappedBy = "reportedBy")
    private List<Ticket> reportedTickets = new ArrayList<>();

    @Default
    @OneToMany(mappedBy = "assignedTo")
    private List<Ticket> assignedTickets = new ArrayList<>();

    @OneToOne(mappedBy = "user", cascade = CascadeType.ALL)
    private NotificationPreferences notificationPreferences;
}
