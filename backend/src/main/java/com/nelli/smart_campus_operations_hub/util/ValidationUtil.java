package com.nelli.smart_campus_operations_hub.util;

import com.nelli.smart_campus_operations_hub.dto.request.BookingRequest;
import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import com.nelli.smart_campus_operations_hub.enums.RecurrenceType;
import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import com.nelli.smart_campus_operations_hub.exception.FileUploadException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.web.multipart.MultipartFile;

/**
 * Utility methods for custom business validation that goes beyond annotation-based constraints.
 */
public final class ValidationUtil {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^\\+[1-9]\\d{7,14}$");

    private ValidationUtil() {
        // Utility class.
    }

    /**
     * Validates booking time range rules:
     * start must be in the future, end after start, and duration between configured min/max.
     *
     * @param start booking start date-time
     * @param end booking end date-time
     */
    public static void validateBookingTimeRange(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new IllegalArgumentException("Booking start and end date-time are required.");
        }
        if (!end.isAfter(start)) {
            throw new IllegalArgumentException("Booking end time must be after start time.");
        }
        if (!start.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Booking start time must be in the future.");
        }

        long minutes = Duration.between(start, end).toMinutes();
        if (minutes < AppConstants.MIN_BOOKING_DURATION_MINUTES) {
            throw new IllegalArgumentException(
                    "Booking duration must be at least "
                            + AppConstants.MIN_BOOKING_DURATION_MINUTES
                            + " minutes."
            );
        }

        long maxMinutes = AppConstants.MAX_BOOKING_DURATION_HOURS * 60L;
        if (minutes > maxMinutes) {
            throw new IllegalArgumentException(
                    "Booking duration cannot exceed "
                            + AppConstants.MAX_BOOKING_DURATION_HOURS
                            + " hours."
            );
        }
    }

    /**
     * Validates recurrence settings for recurring booking requests.
     *
     * @param request booking request payload
     */
    public static void validateRecurrenceParameters(BookingRequest request) {
        if (request == null || !request.isRecurring()) {
            return;
        }
        if (request.getRecurrenceType() == null) {
            throw new IllegalArgumentException("Recurrence type is required for recurring bookings.");
        }
        if (request.getRecurrenceEndDate() == null) {
            throw new IllegalArgumentException("Recurrence end date is required for recurring bookings.");
        }
        if (request.getStartDateTime() != null
                && !request.getRecurrenceEndDate().isAfter(request.getStartDateTime().toLocalDate())) {
            throw new IllegalArgumentException("Recurrence end date must be after booking start date.");
        }
        if (request.getRecurrenceType() == RecurrenceType.WEEKLY
                && (request.getRecurrenceDays() == null || request.getRecurrenceDays().isEmpty())) {
            throw new IllegalArgumentException("Recurrence days are required for weekly recurrence.");
        }
    }

    /**
     * Validates email format.
     * Example valid input: user@example.com.
     *
     * @param email candidate email
     * @return {@code true} when format is valid
     */
    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    /**
     * Validates international phone number format (+[country][number]).
     * Optional field: null/blank is valid.
     *
     * @param phone candidate phone
     * @return {@code true} when format is valid
     */
    public static boolean isValidPhoneNumber(String phone) {
        if (phone == null || phone.isBlank()) {
            return true;
        }
        return PHONE_PATTERN.matcher(phone).matches();
    }

    /**
     * Validates uploaded image file content, size, and mime type.
     *
     * @param file uploaded multipart file
     */
    public static void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FileUploadException("Image file is required.");
        }
        if (file.getSize() > AppConstants.MAX_FILE_SIZE) {
            throw new FileUploadException(
                    "Image file size cannot exceed " + AppConstants.MAX_FILE_SIZE + " bytes."
            );
        }
        String contentType = file.getContentType();
        if (contentType == null || !AppConstants.ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new FileUploadException("Unsupported image type: " + contentType);
        }
    }

    /**
     * Validates ticket lifecycle transition.
     * Valid transitions: OPEN -> IN_PROGRESS/REJECTED, IN_PROGRESS -> RESOLVED/OPEN, RESOLVED -> CLOSED,
     * and idempotent transitions to the same state.
     *
     * @param current current state
     * @param next target state
     */
    public static void validateTicketStatusTransition(TicketStatus current, TicketStatus next) {
        if (current == null || next == null) {
            throw new IllegalStateException("Ticket status transition requires both current and target states.");
        }
        if (current == next) {
            return;
        }

        Map<TicketStatus, Set<TicketStatus>> allowed = new EnumMap<>(TicketStatus.class);
        allowed.put(TicketStatus.OPEN, EnumSet.of(TicketStatus.IN_PROGRESS, TicketStatus.REJECTED));
        allowed.put(TicketStatus.IN_PROGRESS, EnumSet.of(TicketStatus.RESOLVED, TicketStatus.OPEN));
        allowed.put(TicketStatus.RESOLVED, EnumSet.of(TicketStatus.CLOSED));
        allowed.put(TicketStatus.CLOSED, EnumSet.noneOf(TicketStatus.class));
        allowed.put(TicketStatus.REJECTED, EnumSet.noneOf(TicketStatus.class));

        if (!allowed.getOrDefault(current, EnumSet.noneOf(TicketStatus.class)).contains(next)) {
            throw new IllegalStateException(
                    "Invalid ticket status transition from " + current + " to " + next + "."
            );
        }
    }

    /**
     * Validates booking lifecycle transition.
     * Valid transitions: PENDING -> APPROVED/REJECTED, APPROVED -> CANCELLED, and idempotent transitions.
     *
     * @param current current state
     * @param next target state
     */
    public static void validateBookingStatusTransition(BookingStatus current, BookingStatus next) {
        if (current == null || next == null) {
            throw new IllegalStateException("Booking status transition requires both current and target states.");
        }
        if (current == next) {
            return;
        }

        Map<BookingStatus, Set<BookingStatus>> allowed = new EnumMap<>(BookingStatus.class);
        allowed.put(BookingStatus.PENDING, EnumSet.of(BookingStatus.APPROVED, BookingStatus.REJECTED));
        allowed.put(BookingStatus.APPROVED, EnumSet.of(BookingStatus.CANCELLED));
        allowed.put(BookingStatus.REJECTED, EnumSet.noneOf(BookingStatus.class));
        allowed.put(BookingStatus.CANCELLED, EnumSet.noneOf(BookingStatus.class));

        if (!allowed.getOrDefault(current, EnumSet.noneOf(BookingStatus.class)).contains(next)) {
            throw new IllegalStateException(
                    "Invalid booking status transition from " + current + " to " + next + "."
            );
        }
    }
}
