package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.model.Booking;
import com.nelli.smart_campus_operations_hub.model.NotificationPreferences;
import com.nelli.smart_campus_operations_hub.model.Ticket;
import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.BookingRepository;
import com.nelli.smart_campus_operations_hub.repository.NotificationPreferencesRepository;
import com.nelli.smart_campus_operations_hub.repository.NotificationRepository;
import com.nelli.smart_campus_operations_hub.repository.TicketRepository;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled background jobs for digests and maintenance cleanup.
 *
 * <p>Cron notes:
 * <ul>
 *   <li>0 0 8 * * SUN: Sundays 08:00 weekly digests.</li>
 *   <li>0 0 9 * * *: daily 09:00 admin digests.</li>
 *   <li>0 0 2 * * *: daily 02:00 notification cleanup.</li>
 *   <li>0 0 3 * * SUN: Sundays 03:00 analytics generation placeholder.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledTasksService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationPreferencesRepository notificationPreferencesRepository;
    private final EmailService emailService;

    @Scheduled(cron = "0 0 8 * * SUN")
    public void sendWeeklyDigests() {
        log.info("Weekly digest job started.");
        int success = 0;
        int failures = 0;
        try {
            List<NotificationPreferences> recipients = notificationPreferencesRepository.findUsersForWeeklyDigest();
            for (NotificationPreferences preferences : recipients) {
                try {
                    User user = preferences.getUser();
                    List<Booking> upcomingBookings = bookingRepository.findUpcomingBookings(user.getId(), LocalDateTime.now());
                    List<Ticket> activeTickets = ticketRepository.findActiveTicketsByUser(user.getId());
                    emailService.sendWeeklyDigest(user, upcomingBookings, activeTickets);
                    success++;
                } catch (Exception ex) {
                    failures++;
                    log.error("Weekly digest send failed for a user: {}", ex.getMessage());
                }
            }
            log.info("Weekly digest job finished. recipients={}, success={}, failures={}", recipients.size(), success, failures);
        } catch (Exception ex) {
            log.error("Weekly digest job failed: {}", ex.getMessage(), ex);
        }
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void sendDailyAdminDigests() {
        log.info("Daily admin digest job started.");
        int success = 0;
        int failures = 0;
        try {
            List<NotificationPreferences> adminPreferences = notificationPreferencesRepository.findByRoleWithEmailEnabled(Role.ADMIN);
            List<Booking> pendingBookings = bookingRepository.findByStatus(BookingStatus.PENDING);
            List<Ticket> unassignedTickets = ticketRepository.findUnassignedTickets();
            for (NotificationPreferences preferences : adminPreferences) {
                try {
                    emailService.sendDailyAdminDigest(
                            preferences.getUser(),
                            pendingBookings,
                            unassignedTickets
                    );
                    success++;
                } catch (Exception ex) {
                    failures++;
                    log.error("Daily admin digest send failed for adminId={}: {}", preferences.getUser().getId(), ex.getMessage());
                }
            }
            log.info("Daily admin digest job finished. admins={}, success={}, failures={}", adminPreferences.size(), success, failures);
        } catch (Exception ex) {
            log.error("Daily admin digest job failed: {}", ex.getMessage(), ex);
        }
    }

    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupOldNotifications() {
        log.info("Notification cleanup job started.");
        try {
            LocalDateTime cutoff = LocalDateTime.now().minusDays(90);
            long before = notificationRepository.findAll().size();
            notificationRepository.deleteOldReadNotifications(cutoff);
            long after = notificationRepository.findAll().size();
            log.info("Notification cleanup finished. deleted={}", Math.max(0, before - after));
        } catch (Exception ex) {
            log.error("Notification cleanup failed: {}", ex.getMessage(), ex);
        }
    }

    @Scheduled(cron = "0 0 3 * * SUN")
    public void generateWeeklyAnalytics() {
        log.info("Weekly analytics generation job started.");
        try {
            // Placeholder for future snapshot persistence.
            log.info("Weekly analytics generation completed.");
        } catch (Exception ex) {
            log.error("Weekly analytics generation failed: {}", ex.getMessage(), ex);
        }
    }
}
