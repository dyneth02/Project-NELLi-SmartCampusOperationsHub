package com.nelli.smart_campus_operations_hub.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsOverviewResponse {

    private long totalFacilities;
    private long activeFacilities;
    private long totalBookings;
    private long pendingBookings;
    private long approvedBookings;
    private long totalTickets;
    private long openTickets;
    private long resolvedTickets;
    private Double averageResolutionTimeHours;
    private String topUsedFacility;
    private String busyHour;
    private long activeUsers;
}
