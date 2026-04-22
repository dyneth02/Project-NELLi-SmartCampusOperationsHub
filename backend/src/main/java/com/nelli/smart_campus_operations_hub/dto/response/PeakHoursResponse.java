package com.nelli.smart_campus_operations_hub.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PeakHoursResponse {

    private int hour;
    private long bookingCount;
    private String label;
}
