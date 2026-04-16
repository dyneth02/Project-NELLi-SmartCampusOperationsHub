package com.nelli.smart_campus_operations_hub.model;

import jakarta.persistence.Embeddable;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Embeddable value object that defines an available time range for a specific day of week.
 *
 * <p>Usage example: a Monday window from 08:00 to 17:00 can be checked by passing a target
 * {@link LocalDateTime} to {@link #isWithinWindow(LocalDateTime)}.
 */
@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvailabilityWindow {

    @NotNull
    private DayOfWeek dayOfWeek;

    @NotNull
    private LocalTime startTime;

    @NotNull
    private LocalTime endTime;

    /**
     * Checks whether the provided date-time falls within this window's day and time range.
     *
     * @param dateTime candidate date-time
     * @return {@code true} when date and time are inside this availability window
     */
    public boolean isWithinWindow(LocalDateTime dateTime) {
        if (dateTime == null || dayOfWeek == null || startTime == null || endTime == null) {
            return false;
        }
        if (!dayOfWeek.equals(dateTime.getDayOfWeek())) {
            return false;
        }
        LocalTime candidateTime = dateTime.toLocalTime();
        return !candidateTime.isBefore(startTime) && candidateTime.isBefore(endTime);
    }

    @AssertTrue(message = "endTime must be after startTime.")
    private boolean isEndTimeAfterStartTime() {
        if (startTime == null || endTime == null) {
            return true;
        }
        return endTime.isAfter(startTime);
    }
}
