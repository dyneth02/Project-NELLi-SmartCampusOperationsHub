package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import com.nelli.smart_campus_operations_hub.model.Booking;
import com.nelli.smart_campus_operations_hub.model.Comment;
import com.nelli.smart_campus_operations_hub.model.Ticket;
import com.nelli.smart_campus_operations_hub.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends asynchronous HTML email notifications. Email delivery is best-effort and non-blocking.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    /**
     * Sends booking approved email.
     *
     * @param user recipient
     * @param booking related booking
     */
    @Async
    public void sendBookingApprovedEmail(User user, Booking booking) {
        String body = "<p>Your booking has been approved.</p>"
                + "<p>Facility: " + safe(booking != null && booking.getFacility() != null ? booking.getFacility().getName() : null) + "</p>"
                + "<p>Date/Time: " + safe(booking != null ? booking.getStartDateTime() : null) + "</p>"
                + "<p><a href='" + frontendUrl + "/bookings'>View Booking</a></p>";
        sendHtmlEmail(user.getEmail(), "Booking Approved", body);
    }

    /**
     * Sends booking rejected email.
     *
     * @param user recipient
     * @param booking related booking
     */
    @Async
    public void sendBookingRejectedEmail(User user, Booking booking) {
        String body = "<p>Your booking has been rejected.</p>"
                + "<p>Facility: " + safe(booking != null && booking.getFacility() != null ? booking.getFacility().getName() : null) + "</p>"
                + "<p>Reason: " + safe(booking != null ? booking.getRejectionReason() : null) + "</p>"
                + "<p><a href='" + frontendUrl + "/bookings'>View Booking</a></p>";
        sendHtmlEmail(user.getEmail(), "Booking Rejected", body);
    }

    /**
     * Sends ticket status update email.
     *
     * @param user recipient
     * @param ticket ticket
     * @param status new status
     */
    @Async
    public void sendTicketStatusEmail(User user, Ticket ticket, TicketStatus status) {
        String body = "<p>Your ticket status was updated.</p>"
                + "<p>Ticket: " + safe(ticket != null ? ticket.getTicketNumber() : null) + "</p>"
                + "<p>Status: " + safe(status) + "</p>"
                + "<p>Resolution: " + safe(ticket != null ? ticket.getResolutionNotes() : null) + "</p>"
                + "<p><a href='" + frontendUrl + "/tickets'>View Ticket</a></p>";
        sendHtmlEmail(user.getEmail(), "Ticket Status Updated", body);
    }

    /**
     * Sends technician assignment email.
     *
     * @param user technician recipient
     * @param ticket assigned ticket
     */
    @Async
    public void sendTicketAssignedEmail(User user, Ticket ticket) {
        String body = "<p>You have been assigned a new ticket.</p>"
                + "<p>Ticket: " + safe(ticket != null ? ticket.getTicketNumber() : null) + "</p>"
                + "<p>Priority: " + safe(ticket != null ? ticket.getPriority() : null) + "</p>"
                + "<p>Description: " + safe(ticket != null ? ticket.getDescription() : null) + "</p>"
                + "<p><a href='" + frontendUrl + "/tickets'>View Ticket</a></p>";
        sendHtmlEmail(user.getEmail(), "New Ticket Assignment", body);
    }

    /**
     * Sends new ticket comment email.
     *
     * @param user recipient
     * @param comment comment
     * @param ticket ticket
     */
    @Async
    public void sendNewCommentEmail(User user, Comment comment, Ticket ticket) {
        String content = comment == null ? "" : comment.getContent();
        if (content != null && content.length() > 160) {
            content = content.substring(0, 160) + "...";
        }
        String body = "<p>There is a new comment on your ticket.</p>"
                + "<p>Ticket: " + safe(ticket != null ? ticket.getTicketNumber() : null) + "</p>"
                + "<p>Comment: " + safe(content) + "</p>"
                + "<p><a href='" + frontendUrl + "/tickets'>View Ticket</a></p>";
        sendHtmlEmail(user.getEmail(), "New Comment on Ticket", body);
    }

    /**
     * Sends weekly digest email with upcoming bookings and active tickets.
     *
     * @param user user recipient
     * @param upcomingBookings upcoming bookings
     * @param activeTickets active tickets
     */
    @Async
    public void sendWeeklyDigest(User user, List<Booking> upcomingBookings, List<Ticket> activeTickets) {
        String body = "<p>Weekly digest generated at " + LocalDateTime.now() + ".</p>"
                + "<p>Upcoming bookings: " + (upcomingBookings == null ? 0 : upcomingBookings.size()) + "</p>"
                + "<p>Active tickets: " + (activeTickets == null ? 0 : activeTickets.size()) + "</p>"
                + "<p><a href='" + frontendUrl + "/dashboard'>Open Dashboard</a></p>";
        sendHtmlEmail(user.getEmail(), "Weekly Campus Digest", body);
    }

    /**
     * Sends daily admin digest email for pending workload.
     *
     * @param admin admin recipient
     * @param pendingBookings pending bookings
     * @param unassignedTickets unassigned tickets
     */
    @Async
    public void sendDailyAdminDigest(User admin, List<Booking> pendingBookings, List<Ticket> unassignedTickets) {
        String body = "<p>Daily admin digest generated at " + LocalDateTime.now() + ".</p>"
                + "<p>Pending bookings: " + (pendingBookings == null ? 0 : pendingBookings.size()) + "</p>"
                + "<p>Unassigned tickets: " + (unassignedTickets == null ? 0 : unassignedTickets.size()) + "</p>"
                + "<p><a href='" + frontendUrl + "/admin'>Open Admin Panel</a></p>";
        sendHtmlEmail(admin.getEmail(), "Daily Admin Digest", body);
    }

    private String buildHtmlEmail(String subject, String body) {
        return "<html><body style='font-family:Arial,sans-serif;'>"
                + "<h2>Nelli Smart Campus Hub</h2>"
                + "<h3>" + safe(subject) + "</h3>"
                + body
                + "<hr/><small>This is an automated email from Nelli Smart Campus Hub.</small>"
                + "</body></html>";
    }

    private void sendHtmlEmail(String to, String subject, String body) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(buildHtmlEmail(subject, body), true);
            mailSender.send(message);
            log.info("Email sent successfully. to={}, subject={}", to, subject);
        } catch (MailException | MessagingException ex) {
            log.error("Email send failed. to={}, subject={}, error={}", to, subject, ex.getMessage());
        }
    }

    private String safe(Object value) {
        return value == null ? "N/A" : String.valueOf(value);
    }
}
