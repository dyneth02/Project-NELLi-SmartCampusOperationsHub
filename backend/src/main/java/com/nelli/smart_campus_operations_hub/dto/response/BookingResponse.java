package com.nelli.smart_campus_operations_hub.dto.response;

import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityType;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingResponse {

    private UUID id;
    private UUID facilityId;
    private String facilityName;
    private FacilityType facilityType;
    private UUID userId;
    private String userName;
    private String userEmail;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private long durationMinutes;
    private String purpose;
    private Integer expectedAttendees;
    private String contactEmail;
    private BookingStatus status;
    private String rejectionReason;
    private UUID approvedBy;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private boolean isRecurring;
    private UUID recurringGroupId;
    private LocalDateTime createdAt;

    @Builder.Default
    private Map<String, Object> _links = new HashMap<>();
}
