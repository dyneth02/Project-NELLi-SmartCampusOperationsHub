package com.nelli.smart_campus_operations_hub.controller;

import com.nelli.smart_campus_operations_hub.dto.response.AnalyticsOverviewResponse;
import com.nelli.smart_campus_operations_hub.dto.response.ApiResponse;
import com.nelli.smart_campus_operations_hub.dto.response.FacilityUsageResponse;
import com.nelli.smart_campus_operations_hub.dto.response.PeakHoursResponse;
import com.nelli.smart_campus_operations_hub.dto.response.TicketMetricsResponse;
import com.nelli.smart_campus_operations_hub.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Provides aggregated admin analytics for facilities, bookings, and ticket performance.
 */
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@Slf4j
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    @Operation(summary = "Get analytics overview", description = "Admin only - Get overall system statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AnalyticsOverviewResponse>> getOverview() {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getOverview(), "Analytics overview retrieved"));
    }

    @GetMapping("/facilities/top-used")
    @Operation(summary = "Get top used facilities", description = "Admin only - Facilities sorted by booking count")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<FacilityUsageResponse>>> getTopUsedFacilities(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getTopUsedFacilities(limit), "Top facilities retrieved"));
    }

    @GetMapping("/bookings/peak-hours")
    @Operation(summary = "Get peak booking hours", description = "Admin only - Hourly distribution of bookings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PeakHoursResponse>>> getPeakHours() {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getPeakBookingHours(), "Peak hours retrieved"));
    }

    @GetMapping("/tickets/metrics")
    @Operation(summary = "Get ticket metrics", description = "Admin only - Ticket statistics and response times")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TicketMetricsResponse>> getTicketMetrics() {
        return ResponseEntity.ok(ApiResponse.success(analyticsService.getTicketMetrics(), "Ticket metrics retrieved"));
    }

    @GetMapping("/facilities/usage")
    @Operation(summary = "Get facility usage by period", description = "Admin only - Facility usage within date range")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<FacilityUsageResponse>>> getFacilityUsage(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException("endDate must be on or after startDate.");
        }
        List<FacilityUsageResponse> response = analyticsService.getFacilityUsageByPeriod(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(response, "Facility usage retrieved"));
    }
}
