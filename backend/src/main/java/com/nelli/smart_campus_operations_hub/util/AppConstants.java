package com.nelli.smart_campus_operations_hub.util;

import java.util.List;

/**
 * Application-level constants that drive shared configuration rules.
 */
public final class AppConstants {

    private AppConstants() {
        // Prevent instantiation.
    }

    /** File upload constraints and storage configuration. */
    public static final long MAX_FILE_SIZE = 5L * 1024L * 1024L;
    public static final int MAX_IMAGES_PER_TICKET = 3;
    public static final List<String> ALLOWED_IMAGE_TYPES =
            List.of("image/jpeg", "image/png", "image/jpg");
    public static final String TICKET_IMAGES_FOLDER = "smart-campus/tickets/uploads";

    /** Date/time format patterns used throughout the system. */
    public static final String DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";
    public static final String DATE_FORMAT = "yyyy-MM-dd";
    public static final String TIME_FORMAT = "HH:mm";

    /** Booking and validation thresholds. */
    public static final int MIN_BOOKING_DURATION_MINUTES = 30;
    public static final int MAX_BOOKING_DURATION_HOURS = 8;
    public static final int MIN_FACILITY_CAPACITY = 1;
    public static final int MAX_FACILITY_CAPACITY = 500;
    public static final String TICKET_NUMBER_PREFIX = "TCK";

    /** Pagination defaults for list endpoints. */
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;

    /** Digest delivery schedule settings. */
    public static final String WEEKLY_DIGEST_DAY = "SUNDAY";
    public static final int WEEKLY_DIGEST_HOUR = 8;
    public static final int DAILY_DIGEST_HOUR = 9;
}
