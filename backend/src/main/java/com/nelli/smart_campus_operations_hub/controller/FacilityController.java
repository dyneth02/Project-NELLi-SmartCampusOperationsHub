package com.nelli.smart_campus_operations_hub.controller;

import com.nelli.smart_campus_operations_hub.dto.request.FacilityRequest;
import com.nelli.smart_campus_operations_hub.dto.request.FacilitySearchRequest;
import com.nelli.smart_campus_operations_hub.dto.response.ApiResponse;
import com.nelli.smart_campus_operations_hub.dto.response.BookingResponse;
import com.nelli.smart_campus_operations_hub.dto.response.FacilityResponse;
import com.nelli.smart_campus_operations_hub.enums.FacilityType;
import com.nelli.smart_campus_operations_hub.service.BookingService;
import com.nelli.smart_campus_operations_hub.service.FacilityService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * This manages facility catalog CRUD and search operations for campus assets.
 */
@RestController
@RequestMapping("/api/v1/facilities")
@RequiredArgsConstructor
@Slf4j
public class FacilityController {

    private final FacilityService facilityService;
    private final BookingService bookingService;

    @GetMapping
    @Operation(summary = "Get all facilities", description = "Retrieve list of all facilities with optional filters")
    public ResponseEntity<ApiResponse<List<FacilityResponse>>> getAllFacilities(
            @RequestParam(required = false) FacilityType type,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String keyword
    ) {
        List<FacilityResponse> facilities;
        if (type != null || minCapacity != null || location != null || keyword != null) {
            FacilitySearchRequest searchRequest = new FacilitySearchRequest();
            searchRequest.setType(type);
            searchRequest.setMinCapacity(minCapacity);
            searchRequest.setLocation(location);
            searchRequest.setKeyword(keyword);
            facilities = facilityService.searchFacilities(searchRequest);
        } else {
            facilities = facilityService.getAllFacilities();
        }
        return ResponseEntity.ok(ApiResponse.success(facilities, "Facilities retrieved"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get facility by ID")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Facility found")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Facility not found")
    public ResponseEntity<ApiResponse<FacilityResponse>> getFacilityById(@PathVariable UUID id) {
        FacilityResponse response = facilityService.getFacilityById(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Facility retrieved"));
    }

    @PostMapping
    @Operation(summary = "Create new facility", description = "Admin only - Create a new facility")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Facility created")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<FacilityResponse>> createFacility(@Valid @RequestBody FacilityRequest request) {
        FacilityResponse response = facilityService.createFacility(request);
        log.info("Facility created. facilityId={}", response.getId());
        return ResponseEntity
                .created(URI.create("/api/v1/facilities/" + response.getId()))
                .body(ApiResponse.success(response, "Facility created"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update facility", description = "Admin only - Full update of facility")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<FacilityResponse>> updateFacility(
            @PathVariable UUID id,
            @Valid @RequestBody FacilityRequest request
    ) {
        FacilityResponse response = facilityService.updateFacility(id, request);
        log.info("Facility updated. facilityId={}", id);
        return ResponseEntity.ok(ApiResponse.success(response, "Facility updated"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete facility", description = "Admin only - Soft delete facility")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Facility deleted")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFacility(@PathVariable UUID id) {
        facilityService.deleteFacility(id);
        log.info("Facility deleted. facilityId={}", id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    @Operation(summary = "Search facilities", description = "Advanced search with multiple filters")
    public ResponseEntity<ApiResponse<List<FacilityResponse>>> searchFacilities(
            @ModelAttribute FacilitySearchRequest searchRequest
    ) {
        List<FacilityResponse> results = facilityService.searchFacilities(searchRequest);
        return ResponseEntity.ok(ApiResponse.success(results, "Facilities search completed"));
    }

    @GetMapping("/{id}/bookings")
    @Operation(summary = "Get facility bookings", description = "Get all bookings for a facility")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getFacilityBookings(@PathVariable UUID id) {
        List<BookingResponse> bookings = bookingService.getFacilityBookings(id);
        return ResponseEntity.ok(ApiResponse.success(bookings, "Facility bookings retrieved"));
    }
}
