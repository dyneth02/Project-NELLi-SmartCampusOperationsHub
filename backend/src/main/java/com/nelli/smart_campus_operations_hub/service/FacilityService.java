package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.dto.request.FacilityRequest;
import com.nelli.smart_campus_operations_hub.dto.request.FacilitySearchRequest;
import com.nelli.smart_campus_operations_hub.dto.response.FacilityResponse;
import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityType;
import com.nelli.smart_campus_operations_hub.exception.ResourceNotFoundException;
import com.nelli.smart_campus_operations_hub.model.AvailabilityWindow;
import com.nelli.smart_campus_operations_hub.model.Facility;
import com.nelli.smart_campus_operations_hub.repository.BookingRepository;
import com.nelli.smart_campus_operations_hub.repository.FacilityRepository;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Provides facility CRUD and search operations with soft-delete behavior and link enrichment.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FacilityService {

    private final FacilityRepository facilityRepository;
    private final BookingRepository bookingRepository;
    private final ModelMapper modelMapper;

    /**
     * Retrieves all facilities and enriches each response with navigation links.
     *
     * @return list of facility responses
     */
    public List<FacilityResponse> getAllFacilities() {
        return facilityRepository.findAll().stream()
                .map(this::toResponseWithLinks)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a facility by id.
     *
     * @param id facility id
     * @return facility response with links
     */
    public FacilityResponse getFacilityById(UUID id) {
        Facility facility = findFacility(id);
        FacilityResponse response = modelMapper.map(facility, FacilityResponse.class);
        addHateoasLinks(response, true);
        return response;
    }

    /**
     * Creates a new facility.
     *
     * @param request facility create request
     * @return created facility response
     */
    @Transactional
    public FacilityResponse createFacility(FacilityRequest request) {
        validateFacilityCapacity(request.getType(), request.getCapacity());
        boolean duplicateName = facilityRepository.findAll().stream()
                .anyMatch(f -> f.getName() != null && f.getName().equalsIgnoreCase(request.getName()));
        if (duplicateName) {
            throw new IllegalArgumentException("Facility with name '" + request.getName() + "' already exists.");
        }

        Facility facility = modelMapper.map(request, Facility.class);
        if (facility.getStatus() == null) {
            facility.setStatus(FacilityStatus.ACTIVE);
        }
        facility = facilityRepository.save(facility);

        log.info("Facility created. facilityId={}, operation=CREATE", facility.getId());
        return toResponseWithLinks(facility);
    }

    /**
     * Updates an existing facility.
     *
     * @param id facility id
     * @param request update request
     * @return updated facility response
     */
    @Transactional
    public FacilityResponse updateFacility(UUID id, FacilityRequest request) {
        Facility existing = findFacility(id);
        validateFacilityCapacity(request.getType(), request.getCapacity());

        existing.setName(request.getName());
        existing.setType(request.getType());
        existing.setCapacity(request.getCapacity());
        existing.setLocation(request.getLocation());
        existing.setDescription(request.getDescription());
        existing.setStatus(request.getStatus());
        existing.setEquipment(request.getEquipment());
        if (request.getAvailabilityWindows() != null) {
            existing.setAvailabilityWindows(request.getAvailabilityWindows().stream()
                    .map(dto -> modelMapper.map(dto, AvailabilityWindow.class))
                    .collect(Collectors.toList()));
        }

        Facility saved = facilityRepository.save(existing);
        log.info("Facility updated. facilityId={}, operation=UPDATE", saved.getId());
        return toResponseWithLinks(saved);
    }

    /**
     * Soft-deletes a facility by moving it to OUT_OF_SERVICE when allowed.
     *
     * @param id facility id
     */
    @Transactional
    public void deleteFacility(UUID id) {
        Facility facility = findFacility(id);
        boolean hasActiveBookings = bookingRepository.findByFacilityIdOrderByStartDateTimeAsc(id).stream()
                .anyMatch(b -> b.getStatus() == BookingStatus.PENDING || b.getStatus() == BookingStatus.APPROVED);
        if (hasActiveBookings) {
            throw new IllegalStateException("Cannot delete facility with active bookings");
        }

        facility.setStatus(FacilityStatus.OUT_OF_SERVICE);
        facilityRepository.save(facility);
        log.info("Facility deleted (soft). facilityId={}, operation=DELETE", facility.getId());
    }

    /**
     * Searches facilities by optional filter set.
     *
     * @param searchRequest filter request
     * @return matching facilities
     */
    public List<FacilityResponse> searchFacilities(FacilitySearchRequest searchRequest) {
        boolean noFilters = searchRequest.getType() == null
                && searchRequest.getMinCapacity() == null
                && (searchRequest.getLocation() == null || searchRequest.getLocation().isBlank())
                && (searchRequest.getKeyword() == null || searchRequest.getKeyword().isBlank());

        List<Facility> facilities;
        if (noFilters) {
            facilities = facilityRepository.findByStatus(FacilityStatus.ACTIVE);
        } else if (searchRequest.getKeyword() != null && !searchRequest.getKeyword().isBlank()) {
            facilities = facilityRepository.searchByKeywordAndStatus(searchRequest.getKeyword(), FacilityStatus.ACTIVE);
        } else if (searchRequest.getType() != null) {
            facilities = facilityRepository.findWithFilters(
                    searchRequest.getType(),
                    searchRequest.getMinCapacity(),
                    searchRequest.getLocation()
            );
        } else {
            facilities = facilityRepository.findByStatus(FacilityStatus.ACTIVE).stream()
                    .filter(f -> searchRequest.getMinCapacity() == null
                            || (f.getCapacity() != null && f.getCapacity() >= searchRequest.getMinCapacity()))
                    .filter(f -> searchRequest.getLocation() == null
                            || searchRequest.getLocation().isBlank()
                            || (f.getLocation() != null
                            && f.getLocation().toLowerCase(Locale.ROOT)
                            .contains(searchRequest.getLocation().toLowerCase(Locale.ROOT))))
                    .collect(Collectors.toList());
        }

        return facilities.stream().map(this::toResponseWithLinks).collect(Collectors.toList());
    }

    /**
     * Returns active facilities by type.
     *
     * @param type facility type
     * @return active facilities for type
     */
    public List<FacilityResponse> getFacilitiesByType(FacilityType type) {
        return facilityRepository.findByTypeAndStatus(type, FacilityStatus.ACTIVE).stream()
                .map(this::toResponseWithLinks)
                .collect(Collectors.toList());
    }

    /**
     * Returns all currently active facilities.
     *
     * @return available facilities
     */
    public List<FacilityResponse> getAvailableFacilities() {
        return facilityRepository.findByStatus(FacilityStatus.ACTIVE).stream()
                .map(this::toResponseWithLinks)
                .collect(Collectors.toList());
    }

    private Facility findFacility(UUID id) {
        return facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facility", "id", id));
    }

    private void validateFacilityCapacity(FacilityType type, Integer capacity) {
        if (type != FacilityType.EQUIPMENT && (capacity == null || capacity <= 0)) {
            throw new IllegalArgumentException("Capacity must be provided and greater than 0 for non-equipment facilities.");
        }
    }

    private FacilityResponse toResponseWithLinks(Facility facility) {
        FacilityResponse response = modelMapper.map(facility, FacilityResponse.class);
        addHateoasLinks(response, true);
        return response;
    }

    private void addHateoasLinks(FacilityResponse response, boolean includeAdminActions) {
        Map<String, Object> links = response.get_links();
        UUID id = response.getId();
        links.put("self", "/api/v1/facilities/" + id);
        links.put("bookings", "/api/v1/facilities/" + id + "/bookings");
        links.put("tickets", "/api/v1/facilities/" + id + "/tickets");
        if (includeAdminActions) {
            links.put("update", "/api/v1/facilities/" + id);
            links.put("delete", "/api/v1/facilities/" + id);
        }
    }
}
