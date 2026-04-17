package com.nelli.smart_campus_operations_hub.dto.request;

import com.nelli.smart_campus_operations_hub.enums.RecurrenceType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingRequest {

    @NotNull
    private UUID facilityId;

    @NotNull
    @Future
    private LocalDateTime startDateTime;

    @NotNull
    @Future
    private LocalDateTime endDateTime;

    @NotBlank
    @Size(max = 1000)
    private String purpose;

    @Min(1)
    private Integer expectedAttendees;

    @NotBlank
    @Email
    private String contactEmail;

    @Default
    private boolean isRecurring = false;

    private RecurrenceType recurrenceType;
    private LocalDate recurrenceEndDate;
    private List<DayOfWeek> recurrenceDays;

    @AssertTrue(message = "endDateTime must be after startDateTime.")
    private boolean isEndDateAfterStartDate() {
        if (startDateTime == null || endDateTime == null) {
            return true;
        }
        return endDateTime.isAfter(startDateTime);
    }

    @AssertTrue(message = "Recurrence fields are required when isRecurring is true.")
    private boolean isRecurringFieldsValid() {
        if (!isRecurring) {
            return true;
        }
        return recurrenceType != null && recurrenceEndDate != null && recurrenceDays != null && !recurrenceDays.isEmpty();
    }

    @AssertTrue(message = "recurrenceEndDate must be after startDateTime date.")
    private boolean isRecurrenceEndDateValid() {
        if (!isRecurring || recurrenceEndDate == null || startDateTime == null) {
            return true;
        }
        return recurrenceEndDate.isAfter(startDateTime.toLocalDate());
    }
}
