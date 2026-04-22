package com.nelli.smart_campus_operations_hub.dto.response;

import com.nelli.smart_campus_operations_hub.enums.FacilityType;
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
public class FacilityUsageResponse {

    private UUID facilityId;
    private String facilityName;
    private FacilityType facilityType;
    private long bookingCount;
    private long totalHoursBooked;
    private double utilizationRate;

    @Builder.Default
    private Map<String, Object> _links = new HashMap<>();
}
