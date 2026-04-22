package com.nelli.smart_campus_operations_hub.util;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Utility methods for common date/time checks, calculations, and formatting.
 */
public final class DateTimeUtil {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private DateTimeUtil() {
        // Utility class.
    }

    /**
     * Checks whether two time ranges overlap.
     * Example: [09:00, 11:00] overlaps [10:00, 12:00].
     *
     * @param start1 first range start
     * @param end1 first range end
     * @param start2 second range start
     * @param end2 second range end
     * @return {@code true} when ranges overlap
     */
    public static boolean isOverlapping(
            LocalDateTime start1,
            LocalDateTime end1,
            LocalDateTime start2,
            LocalDateTime end2
    ) {
        return start1.isBefore(end2) && end1.isAfter(start2);
    }

    /**
     * Calculates full minutes between two timestamps.
     * Example: 10:00 to 10:45 returns 45.
     *
     * @param start start timestamp
     * @param end end timestamp
     * @return duration in minutes
     */
    public static long getDurationInMinutes(LocalDateTime start, LocalDateTime end) {
        return Duration.between(start, end).toMinutes();
    }

    /**
     * Calculates full hours between two timestamps.
     * Example: 08:00 to 11:30 returns 3.
     *
     * @param start start timestamp
     * @param end end timestamp
     * @return duration in hours
     */
    public static long getHoursBetween(LocalDateTime start, LocalDateTime end) {
        return Duration.between(start, end).toHours();
    }

    /**
     * Checks whether a timestamp is in the future relative to now.
     *
     * @param dateTime candidate timestamp
     * @return {@code true} when candidate is in the future
     */
    public static boolean isFutureDateTime(LocalDateTime dateTime) {
        return dateTime.isAfter(LocalDateTime.now());
    }

    /**
     * Checks whether target date-time is within an inclusive date range.
     * Example: target on 2026-01-15 is within start=2026-01-01 and end=2026-01-31.
     *
     * @param target candidate date-time
     * @param start start date (inclusive)
     * @param end end date (inclusive)
     * @return {@code true} when target falls in range
     */
    public static boolean isWithinDateRange(LocalDateTime target, LocalDate start, LocalDate end) {
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(LocalTime.MAX);
        return !target.isBefore(startDateTime) && !target.isAfter(endDateTime);
    }

    /**
     * Formats a date-time as "yyyy-MM-dd HH:mm".
     *
     * @param dateTime source date-time
     * @return formatted text
     */
    public static String formatDateTime(LocalDateTime dateTime) {
        return dateTime.format(DATE_TIME_FORMATTER);
    }

    /**
     * Formats a date as "yyyy-MM-dd".
     *
     * @param date source date
     * @return formatted text
     */
    public static String formatDate(LocalDate date) {
        return date.format(DATE_FORMATTER);
    }

    /**
     * Formats a time as "HH:mm".
     *
     * @param time source time
     * @return formatted text
     */
    public static String formatTime(LocalTime time) {
        return time.format(TIME_FORMATTER);
    }

    /**
     * Returns all dates between start and end (inclusive) that match the given day of week.
     * Example: all Mondays in a recurrence window.
     *
     * @param start start date (inclusive)
     * @param end end date (inclusive)
     * @param dayOfWeek desired day of week
     * @return matching dates list
     */
    public static List<LocalDate> getDatesBetween(LocalDate start, LocalDate end, DayOfWeek dayOfWeek) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            if (cursor.getDayOfWeek() == dayOfWeek) {
                dates.add(cursor);
            }
            cursor = cursor.plusDays(1);
        }
        return dates;
    }

    /**
     * Extracts hour of day from date-time in 24-hour format.
     *
     * @param dateTime source date-time
     * @return hour value from 0 to 23
     */
    public static int getHourOfDay(LocalDateTime dateTime) {
        return dateTime.getHour();
    }
}
