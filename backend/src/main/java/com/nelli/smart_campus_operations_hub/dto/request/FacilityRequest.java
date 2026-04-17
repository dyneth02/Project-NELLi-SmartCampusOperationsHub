package com.nelli.smart_campus_operations_hub.dto.request;

import com.nelli.smart_campus_operations_hub.enums.FacilityStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FacilityRequest {

    @NotBlank
    @Size(max = 200)
    private String name;

    @NotNull
    private FacilityType type;

    @Min(1)
    private Integer capacity;

    @NotBlank
    @Size(max = 500)
    private String location;

    @Size(max = 5000)
    private String description;

    @NotNull
    private FacilityStatus status;

    private List<String> equipment;

    @Valid
    private List<AvailabilityWindowDto> availabilityWindows;

    @AssertTrue(message = "Capacity is required when facility type is not EQUIPMENT.")
    private boolean isCapacityValidForType() {
        if (type == null || type == FacilityType.EQUIPMENT) {
            return true;
        }
        return capacity != null && capacity >= 1;
    }
}
