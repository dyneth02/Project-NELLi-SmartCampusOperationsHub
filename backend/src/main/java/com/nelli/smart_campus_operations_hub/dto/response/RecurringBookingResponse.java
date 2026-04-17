package com.nelli.smart_campus_operations_hub.dto.response;

import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecurringBookingResponse {

    private UUID recurringGroupId;
    private int totalBookings;
    private int successfulBookings;
    private int failedBookings;
    private List<BookingResponse> bookings;
    private List<String> conflicts;
}
