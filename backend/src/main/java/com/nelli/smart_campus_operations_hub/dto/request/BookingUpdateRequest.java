package com.nelli.smart_campus_operations_hub.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class BookingUpdateRequest {

    @NotNull
    @Future
    private LocalDateTime startDateTime;

    @NotNull
    @Future
    private LocalDateTime endDateTime;

    @NotBlank
    private String purpose;

    @Min(1)
    private Integer expectedAttendees;

    @AssertTrue(message = "endDateTime must be after startDateTime.")
    private boolean isEndDateAfterStartDate() {
        if (startDateTime == null || endDateTime == null) {
            return true;
        }
        return endDateTime.isAfter(startDateTime);
    }
}
