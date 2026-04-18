package com.nelli.smart_campus_operations_hub.repository;

import com.nelli.smart_campus_operations_hub.enums.NotificationType;
import com.nelli.smart_campus_operations_hub.model.Notification;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for user notifications, unread counts, and cleanup routines.
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    /**
     * Finds all notifications for a user, newest first.
     *
     * @param userId user id
     * @return notifications ordered by creation date descending
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Finds unread notifications for a user, newest first.
     *
     * @param userId user id
     * @return unread notifications ordered by creation date descending
     */
    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(UUID userId);

    /**
     * Counts unread notifications for badge display.
     *
     * @param userId user id
     * @return unread notification count
     */
    long countByUserIdAndIsReadFalse(UUID userId);

    /**
     * Finds notifications of a specific type for a user.
     *
     * @param userId user id
     * @param type notification type
     * @return matching notifications
     */
    List<Notification> findByUserIdAndType(UUID userId, NotificationType type);

    /**
     * Marks all unread notifications as read for a given user in one bulk update.
     *
     * @param userId user id
     * @param readAt read timestamp
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsReadForUser(@Param("userId") UUID userId, @Param("readAt") LocalDateTime readAt);

    /**
     * Deletes old read notifications to keep table size manageable.
     * Intended for scheduled cleanup runs, such as removing records older than 90 days.
     *
     * @param cutoffDate records older than this date are deleted when already read
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoffDate AND n.isRead = true")
    void deleteOldReadNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);
}
