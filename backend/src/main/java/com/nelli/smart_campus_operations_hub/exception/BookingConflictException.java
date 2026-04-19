package com.nelli.smart_campus_operations_hub.exception;

import com.nelli.smart_campus_operations_hub.model.Booking;
import java.util.List;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a booking request conflicts with existing bookings.
 */
@ResponseStatus(HttpStatus.CONFLICT)
@Getter
public class BookingConflictException extends RuntimeException {

    private final List<Booking> conflictingBookings;

    public BookingConflictException(String message) {
        super(message);
        this.conflictingBookings = null;
    }

    public BookingConflictException(String message, List<Booking> conflictingBookings) {
        super(message);
        this.conflictingBookings = conflictingBookings;
    }
}
