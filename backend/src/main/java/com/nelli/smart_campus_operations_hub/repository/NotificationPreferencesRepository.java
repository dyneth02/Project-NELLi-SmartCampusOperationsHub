package com.nelli.smart_campus_operations_hub.repository;

import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.model.NotificationPreferences;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for user notification preference settings and digest targeting.
 */
@Repository
public interface NotificationPreferencesRepository extends JpaRepository<NotificationPreferences, UUID> {

    /**
     * Finds notification preferences for a specific user.
     *
     * @param userId user id
     * @return user preferences when present
     */
    Optional<NotificationPreferences> findByUserId(UUID userId);

    /**
     * Finds users by role who opted in to email notifications.
     *
     * @param role target role
     * @return preferences for users eligible for role-based email sends
     */
    @Query("SELECT np FROM NotificationPreferences np WHERE np.user.role = :role AND np.emailNotifications = true")
    List<NotificationPreferences> findByRoleWithEmailEnabled(@Param("role") Role role);

    /**
     * Finds users eligible for weekly digest emails.
     *
     * @return preferences with weekly digest and email notifications both enabled
     */
    @Query("SELECT np FROM NotificationPreferences np WHERE np.weeklyDigest = true AND np.emailNotifications = true")
    List<NotificationPreferences> findUsersForWeeklyDigest();
}
