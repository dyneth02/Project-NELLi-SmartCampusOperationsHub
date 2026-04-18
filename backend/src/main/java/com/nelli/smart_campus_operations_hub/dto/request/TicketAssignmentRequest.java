package com.nelli.smart_campus_operations_hub.dto.request;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Data;

@Data
public class TicketAssignmentRequest {

    @NotNull
    private UUID technicianId;
}
