package com.nelli.smart_campus_operations_hub.dto.response;

import com.nelli.smart_campus_operations_hub.dto.request.AvailabilityWindowDto;
import com.nelli.smart_campus_operations_hub.enums.FacilityStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityType;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
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
public class FacilityResponse {

    private UUID id;
    private String name;
    private FacilityType type;
    private Integer capacity;
    private String location;
    private String description;
    private FacilityStatus status;
    private List<String> equipment;
    private List<AvailabilityWindowDto> availabilityWindows;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private Map<String, Object> _links = new HashMap<>();
}
