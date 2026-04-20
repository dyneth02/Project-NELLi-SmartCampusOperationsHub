package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.dto.request.NotificationPreferencesRequest;
import com.nelli.smart_campus_operations_hub.dto.response.NotificationPreferencesResponse;
import com.nelli.smart_campus_operations_hub.dto.response.NotificationResponse;
import com.nelli.smart_campus_operations_hub.enums.NotificationType;
import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import com.nelli.smart_campus_operations_hub.exception.ResourceNotFoundException;
import com.nelli.smart_campus_operations_hub.exception.UnauthorizedException;
import com.nelli.smart_campus_operations_hub.model.Booking;
import com.nelli.smart_campus_operations_hub.model.Comment;
import com.nelli.smart_campus_operations_hub.model.Notification;
import com.nelli.smart_campus_operations_hub.model.NotificationPreferences;
import com.nelli.smart_campus_operations_hub.model.Ticket;
import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.NotificationPreferencesRepository;
import com.nelli.smart_campus_operations_hub.repository.NotificationRepository;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Coordinates notification delivery (in-app + email) while honoring per-user preferences.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferencesRepository notificationPreferencesRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    /**
     * Sends booking-approved notification to booking owner.
     *
     * @param booking approved booking
     */
    @Transactional
    public void sendBookingApprovedNotification(Booking booking) {
        String message = "Your booking for " + booking.getFacility().getName()
                + " on " + booking.getStartDateTime() + " has been approved";
        sendNotificationToUser(
                booking.getUser(),
                NotificationType.BOOKING_APPROVED,
                "Booking Approved",
                message,
                "BOOKING",
                booking.getId()
        );
        if (isEmailEnabled(booking.getUser())) {
            emailService.sendBookingApprovedEmail(booking.getUser(), booking);
        }
        log.info("Booking approved notification processed. bookingId={}, userId={}", booking.getId(), booking.getUser().getId());
    }

    /**
     * Sends booking-rejected notification to booking owner.
     *
     * @param booking rejected booking
     */
    @Transactional
    public void sendBookingRejectedNotification(Booking booking) {
        String reason = booking.getRejectionReason() == null ? "" : (" Reason: " + booking.getRejectionReason());
        String message = "Your booking for " + booking.getFacility().getName()
                + " on " + booking.getStartDateTime() + " has been rejected." + reason;
        sendNotificationToUser(
                booking.getUser(),
                NotificationType.BOOKING_REJECTED,
                "Booking Rejected",
                message,
                "BOOKING",
                booking.getId()
        );
        if (isEmailEnabled(booking.getUser())) {
            emailService.sendBookingRejectedEmail(booking.getUser(), booking);
        }
        log.info("Booking rejected notification processed. bookingId={}, userId={}", booking.getId(), booking.getUser().getId());
    }

    /**
     * Sends ticket status change notification to ticket reporter.
     *
     * @param ticket affected ticket
     * @param oldStatus previous status
     * @param newStatus new status
     */
    @Transactional
    public void sendTicketStatusChangedNotification(Ticket ticket, TicketStatus oldStatus, TicketStatus newStatus) {
        String message = "Your ticket " + ticket.getTicketNumber()
                + " status changed from " + oldStatus + " to " + newStatus;
        sendNotificationToUser(
                ticket.getReportedBy(),
                NotificationType.TICKET_STATUS_CHANGED,
                "Ticket Status Updated",
                message,
                "TICKET",
                ticket.getId()
        );
        if (isEmailEnabled(ticket.getReportedBy())) {
            emailService.sendTicketStatusEmail(ticket.getReportedBy(), ticket, newStatus);
        }
        log.info("Ticket status notification processed. ticketId={}, userId={}", ticket.getId(), ticket.getReportedBy().getId());
    }

    /**
     * Sends assignment notification to technician and assignment update to reporter.
     *
     * @param ticket assigned ticket
     * @param technician assigned technician
     */
    @Transactional
    public void sendTicketAssignedNotification(Ticket ticket, User technician) {
        sendNotificationToUser(
                technician,
                NotificationType.TICKET_ASSIGNED,
                "New Ticket Assigned",
                "You have been assigned to ticket " + ticket.getTicketNumber(),
                "TICKET",
                ticket.getId()
        );
        if (isEmailEnabled(technician)) {
            emailService.sendTicketAssignedEmail(technician, ticket);
        }
        sendNotificationToUser(
                ticket.getReportedBy(),
                NotificationType.TICKET_ASSIGNED,
                "Ticket Assigned",
                "Your ticket " + ticket.getTicketNumber() + " has been assigned to a technician.",
                "TICKET",
                ticket.getId()
        );
        if (isEmailEnabled(ticket.getReportedBy())) {
            emailService.sendTicketAssignedEmail(ticket.getReportedBy(), ticket);
        }
        log.info("Ticket assignment notifications processed. ticketId={}, technicianId={}", ticket.getId(), technician.getId());
    }

    /**
     * Sends new-comment notifications to reporter/assigned technician when applicable.
     *
     * @param comment newly created comment
     */
    @Transactional
    public void sendNewCommentNotification(Comment comment) {
        Ticket ticket = comment.getTicket();
        List<User> recipients = new ArrayList<>();

        if (!ticket.getReportedBy().getId().equals(comment.getUser().getId())) {
            recipients.add(ticket.getReportedBy());
        }
        if (ticket.getAssignedTo() != null && !ticket.getAssignedTo().getId().equals(comment.getUser().getId())) {
            recipients.add(ticket.getAssignedTo());
        }

        for (User user : recipients) {
            sendNotificationToUser(
                    user,
                    NotificationType.NEW_COMMENT,
                    "New Comment on Ticket",
                    comment.getUser().getName() + " commented on ticket " + ticket.getTicketNumber(),
                    "TICKET",
                    ticket.getId()
            );
            if (isEmailEnabled(user)) {
                emailService.sendNewCommentEmail(user, comment, ticket);
            }
        }
        log.info("Comment notifications processed. commentId={}, ticketId={}", comment.getId(), ticket.getId());
    }

    public void sendNewBookingRequestNotificationToAdmins(Booking booking) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            sendNotificationToUser(
                    admin,
                    NotificationType.BOOKING_APPROVED,
                    "New Booking Request",
                    "New pending booking for " + booking.getFacility().getName() + " at " + booking.getStartDateTime(),
                    "BOOKING",
                    booking.getId()
            );
        }
    }

    public void sendNewTicketNotificationToAdmins(Ticket ticket) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            sendNotificationToUser(
                    admin,
                    NotificationType.TICKET_STATUS_CHANGED,
                    "New Ticket Created",
                    "Ticket " + ticket.getTicketNumber() + " was created and needs triage.",
                    "TICKET",
                    ticket.getId()
            );
        }
    }

    public void sendBookingCancelledNotification(Booking booking) {
        sendNotificationToUser(
                booking.getUser(),
                NotificationType.BOOKING_CANCELLED,
                "Booking Cancelled",
                "Your booking for " + booking.getFacility().getName() + " on " + booking.getStartDateTime() + " has been cancelled.",
                "BOOKING",
                booking.getId()
        );
    }

    /**
     * Returns all notifications for current user.
     *
     * @param userEmail current user email
     * @return notifications ordered newest first
     */
    public List<NotificationResponse> getUserNotifications(String userEmail) {
        User user = findUserByEmail(userEmail);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toNotificationResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns unread notifications for current user.
     *
     * @param userEmail current user email
     * @return unread notifications
     */
    public List<NotificationResponse> getUnreadNotifications(String userEmail) {
        User user = findUserByEmail(userEmail);
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(user.getId()).stream()
                .map(this::toNotificationResponse)
                .collect(Collectors.toList());
    }

    /**
     * Returns unread notification count.
     *
     * @param userEmail user email
     * @return unread count
     */
    public long getUnreadCount(String userEmail) {
        User user = findUserByEmail(userEmail);
        return notificationRepository.countByUserIdAndIsReadFalse(user.getId());
    }

    /**
     * Marks one notification as read.
     *
     * @param notificationId notification id
     * @param userEmail current user email
     */
    @Transactional
    public void markAsRead(UUID notificationId, String userEmail) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));
        User user = findUserByEmail(userEmail);
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("Cannot mark another user's notification.");
        }
        notification.markAsRead();
        notificationRepository.save(notification);
    }

    /**
     * Marks all user notifications as read.
     *
     * @param userEmail user email
     */
    @Transactional
    public void markAllAsRead(String userEmail) {
        User user = findUserByEmail(userEmail);
        notificationRepository.markAllAsReadForUser(user.getId(), LocalDateTime.now());
    }

    /**
     * Deletes one notification if owned by the current user.
     *
     * @param notificationId notification id
     * @param userEmail current user email
     */
    @Transactional
    public void deleteNotification(UUID notificationId, String userEmail) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));
        User user = findUserByEmail(userEmail);
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("Cannot delete another user's notification.");
        }
        notificationRepository.delete(notification);
    }

    /**
     * Retrieves or initializes current user's notification preferences.
     *
     * @param userEmail user email
     * @return current preferences
     */
    public NotificationPreferencesResponse getPreferences(String userEmail) {
        User user = findUserByEmail(userEmail);
        NotificationPreferences preferences = notificationPreferencesRepository.findByUserId(user.getId())
                .orElseGet(() -> notificationPreferencesRepository.save(defaultPreferences(user)));
        return toPreferencesResponse(preferences);
    }

    /**
     * Partially updates current user's notification preferences.
     *
     * @param userEmail user email
     * @param request patch payload
     * @return updated preferences
     */
    @Transactional
    public NotificationPreferencesResponse updatePreferences(String userEmail, NotificationPreferencesRequest request) {
        User user = findUserByEmail(userEmail);
        NotificationPreferences preferences = notificationPreferencesRepository.findByUserId(user.getId())
                .orElseGet(() -> notificationPreferencesRepository.save(defaultPreferences(user)));

        if (request.getBookingUpdates() != null) {
            preferences.setBookingUpdates(request.getBookingUpdates());
        }
        if (request.getTicketUpdates() != null) {
            preferences.setTicketUpdates(request.getTicketUpdates());
        }
        if (request.getCommentNotifications() != null) {
            preferences.setCommentNotifications(request.getCommentNotifications());
        }
        if (request.getEmailNotifications() != null) {
            preferences.setEmailNotifications(request.getEmailNotifications());
        }
        if (request.getWeeklyDigest() != null) {
            preferences.setWeeklyDigest(request.getWeeklyDigest());
        }

        preferences = notificationPreferencesRepository.save(preferences);
        return toPreferencesResponse(preferences);
    }

    private void sendNotificationToUser(
            User user,
            NotificationType type,
            String title,
            String message,
            String entityType,
            UUID entityId
    ) {
        NotificationPreferences preferences = notificationPreferencesRepository.findByUserId(user.getId())
                .orElseGet(() -> notificationPreferencesRepository.save(defaultPreferences(user)));

        if (!isInAppEnabledForType(preferences, type)) {
            return;
        }

        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .relatedEntityType(entityType)
                .relatedEntityId(entityId)
                .build();
        notificationRepository.save(notification);

    }

    private boolean isInAppEnabledForType(NotificationPreferences preferences, NotificationType type) {
        return switch (type) {
            case BOOKING_APPROVED, BOOKING_REJECTED, BOOKING_CANCELLED -> preferences.isBookingUpdates();
            case TICKET_STATUS_CHANGED, TICKET_ASSIGNED, TICKET_RESOLVED -> preferences.isTicketUpdates();
            case NEW_COMMENT -> preferences.isCommentNotifications();
        };
    }

    private NotificationPreferences defaultPreferences(User user) {
        return NotificationPreferences.builder()
                .user(user)
                .bookingUpdates(true)
                .ticketUpdates(true)
                .commentNotifications(true)
                .emailNotifications(true)
                .weeklyDigest(true)
                .build();
    }

    private NotificationResponse toNotificationResponse(Notification notification) {
        NotificationResponse response = NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .relatedEntityType(notification.getRelatedEntityType())
                .relatedEntityId(notification.getRelatedEntityId())
                .isRead(notification.isRead())
                .readAt(notification.getReadAt())
                .createdAt(notification.getCreatedAt())
                .build();
        if (response.get_links() == null) {
            response.set_links(new HashMap<>());
        }
        response.get_links().put("self", "/api/v1/notifications/" + notification.getId());
        response.get_links().put("markAsRead", "/api/v1/notifications/" + notification.getId() + "/read");
        return response;
    }

    private NotificationPreferencesResponse toPreferencesResponse(NotificationPreferences preferences) {
        return NotificationPreferencesResponse.builder()
                .userId(preferences.getUser() != null ? preferences.getUser().getId() : null)
                .bookingUpdates(preferences.isBookingUpdates())
                .ticketUpdates(preferences.isTicketUpdates())
                .commentNotifications(preferences.isCommentNotifications())
                .emailNotifications(preferences.isEmailNotifications())
                .weeklyDigest(preferences.isWeeklyDigest())
                .build();
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private boolean isEmailEnabled(User user) {
        return notificationPreferencesRepository.findByUserId(user.getId())
                .map(NotificationPreferences::isEmailNotifications)
                .orElse(true);
    }
}
