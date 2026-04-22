package com.nelli.smart_campus_operations_hub.dto.request;

import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TicketStatusUpdateRequest {

    @NotNull
    private TicketStatus status;

    @Size(max = 5000)
    private String resolutionNotes;

    @AssertTrue(message = "resolutionNotes is required when status is RESOLVED.")
    private boolean isResolutionNotesValid() {
        if (status != TicketStatus.RESOLVED) {
            return true;
        }
        return resolutionNotes != null && !resolutionNotes.isBlank();
    }
}
