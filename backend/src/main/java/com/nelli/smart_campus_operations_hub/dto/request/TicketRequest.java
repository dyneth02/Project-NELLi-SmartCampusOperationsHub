package com.nelli.smart_campus_operations_hub.dto.request;

import com.nelli.smart_campus_operations_hub.enums.TicketCategory;
import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketRequest {

    @NotNull(message = "Facility ID is required")
    private UUID facilityId;

    @NotNull
    private TicketCategory category;

    @NotNull
    private TicketPriority priority;

    @NotBlank
    @Size(max = 5000)
    private String description;

    @NotBlank
    @Email
    private String contactEmail;

    @Pattern(regexp = "^$|^\\+?[1-9]\\d{1,14}$", message = "Invalid phone format.")
    private String contactPhone;
}

