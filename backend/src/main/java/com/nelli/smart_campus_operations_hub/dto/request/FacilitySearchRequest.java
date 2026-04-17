package com.nelli.smart_campus_operations_hub.dto.request;

import com.nelli.smart_campus_operations_hub.enums.FacilityType;
import lombok.Data;

@Data
public class FacilitySearchRequest {

    private FacilityType type;
    private Integer minCapacity;
    private String location;
    private String keyword;
}
