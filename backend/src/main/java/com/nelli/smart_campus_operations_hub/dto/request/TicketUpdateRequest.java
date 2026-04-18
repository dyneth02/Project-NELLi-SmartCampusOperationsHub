package com.nelli.smart_campus_operations_hub.dto.request;

import com.nelli.smart_campus_operations_hub.enums.TicketCategory;
import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TicketUpdateRequest {

    @NotBlank
    @Size(max = 5000)
    private String description;

    private TicketPriority priority;
    private TicketCategory category;
}
