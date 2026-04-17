package com.nelli.smart_campus_operations_hub.model;

import com.nelli.smart_campus_operations_hub.enums.FacilityStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityType;
import com.nelli.smart_campus_operations_hub.util.AvailabilityWindowListJsonConverter;
import com.nelli.smart_campus_operations_hub.util.StringListJsonConverter;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Builder.Default;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a campus facility or asset that can be booked or associated with maintenance tickets.
 * Supports typed facilities such as rooms, labs, and equipment.
 */
@Entity
@Table(
        name = "facilities",
        indexes = {
                @Index(name = "idx_facility_name", columnList = "name"),
                @Index(name = "idx_facility_type", columnList = "type")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Facility extends BaseEntity {

    @NotBlank
    @Size(max = 200)
    @Column(name = "name", nullable = false, unique = true, length = 200)
    private String name;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private FacilityType type;

    @Min(1)
    @Column(name = "capacity")
    private Integer capacity;

    @NotBlank
    @Size(max = 500)
    @Column(name = "location", nullable = false, length = 500)
    private String location;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Default
    @Column(name = "status", nullable = false, length = 30)
    private FacilityStatus status = FacilityStatus.ACTIVE;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "equipment", columnDefinition = "jsonb")
    private List<String> equipment;

    @Convert(converter = AvailabilityWindowListJsonConverter.class)
    @Column(name = "availability_windows", columnDefinition = "jsonb")
    private List<AvailabilityWindow> availabilityWindows;

    @Default
    @OneToMany(mappedBy = "facility", cascade = CascadeType.ALL)
    private List<Booking> bookings = new ArrayList<>();

    @Default
    @OneToMany(mappedBy = "facility", cascade = CascadeType.ALL)
    private List<Ticket> tickets = new ArrayList<>();

    /**
     * @return {@code true} when the facility can be booked and used.
     */
    public boolean isAvailable() {
        return status == FacilityStatus.ACTIVE;
    }

    @AssertTrue(message = "Capacity must be at least 1 for non-equipment facilities.")
    private boolean isCapacityValidForType() {
        if (type == null || type == FacilityType.EQUIPMENT) {
            return true;
        }
        return capacity != null && capacity >= 1;
    }
}
