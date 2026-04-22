package com.nelli.smart_campus_operations_hub.controller;

import com.nelli.smart_campus_operations_hub.dto.request.BookingRequest;
import com.nelli.smart_campus_operations_hub.dto.response.ApiResponse;
import com.nelli.smart_campus_operations_hub.dto.response.BookingResponse;
import com.nelli.smart_campus_operations_hub.dto.response.RecurringBookingResponse;
import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import com.nelli.smart_campus_operations_hub.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes booking workflow APIs from request creation through approval/rejection/cancel lifecycle.
 */
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    @Operation(summary = "Create booking request", description = "Request a facility booking")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Booking created")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Booking conflict - time slot unavailable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (request.isRecurring()) {
            throw new IllegalArgumentException("Use /api/v1/bookings/recurring for recurring bookings.");
        }
        String email = userDetails.getUsername();
        BookingResponse response = bookingService.createBooking(request, email);
        log.info("Booking created. bookingId={}, user={}", response.getId(), email);
        return ResponseEntity
                .created(URI.create("/api/v1/bookings/" + response.getId()))
                .body(ApiResponse.success(response, "Booking created"));
    }

    @PostMapping("/recurring")
    @Operation(summary = "Create recurring booking series", description = "Create multiple bookings with recurrence pattern")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Recurring bookings created")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "One or more time slots conflict")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<RecurringBookingResponse>> createRecurringBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (!request.isRecurring()) {
            throw new IllegalArgumentException("Recurring booking payload must set isRecurring=true.");
        }
        String email = userDetails.getUsername();
        RecurringBookingResponse response = bookingService.createRecurringBooking(request, email);
        log.info("Recurring booking created. groupId={}, user={}", response.getRecurringGroupId(), email);
        return ResponseEntity.status(201).body(ApiResponse.success(response, "Recurring bookings created"));
    }

    @GetMapping("/my-bookings")
    @Operation(summary = "Get my bookings", description = "Retrieve current user's bookings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(
            @RequestParam(required = false) BookingStatus status,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<BookingResponse> response = bookingService.getMyBookings(userDetails.getUsername(), status);
        return ResponseEntity.ok(ApiResponse.success(response, "My bookings retrieved"));
    }

    @GetMapping
    @Operation(summary = "Get all bookings", description = "Admin only - View all bookings with filters")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getAllBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) UUID facilityId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate
    ) {
        List<BookingResponse> response = bookingService.getAllBookings(status, facilityId, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(response, "Bookings retrieved"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get booking by ID")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Booking found")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Booking not found")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Not authorized to view this booking")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        BookingResponse response = bookingService.getBookingById(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Booking retrieved"));
    }

    @PatchMapping("/{id}/approve")
    @Operation(summary = "Approve booking", description = "Admin only - Approve pending booking")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Booking approved")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingResponse>> approveBooking(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        BookingResponse response = bookingService.approveBooking(id, userDetails.getUsername());
        log.info("Booking approved. bookingId={}, admin={}", id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Booking approved"));
    }

    @PatchMapping("/{id}/reject")
    @Operation(summary = "Reject booking", description = "Admin only - Reject pending booking with reason")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingResponse>> rejectBooking(
            @PathVariable UUID id,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String reason = payload.get("reason");
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Rejection reason is required.");
        }
        BookingResponse response = bookingService.rejectBooking(id, reason, userDetails.getUsername());
        log.info("Booking rejected. bookingId={}, admin={}", id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Booking rejected"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancel booking", description = "Cancel a pending or approved booking")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Booking cancelled")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> cancelBooking(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        bookingService.cancelBooking(id, userDetails.getUsername());
        log.info("Booking cancelled. bookingId={}, user={}", id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/facility/{facilityId}")
    @Operation(summary = "Get facility bookings", description = "Get all bookings for a specific facility")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getFacilityBookings(@PathVariable UUID facilityId) {
        List<BookingResponse> response = bookingService.getFacilityBookings(facilityId);
        return ResponseEntity.ok(ApiResponse.success(response, "Facility bookings retrieved"));
    }
}
