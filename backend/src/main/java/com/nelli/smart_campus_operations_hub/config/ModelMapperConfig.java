package com.nelli.smart_campus_operations_hub.config;

import com.nelli.smart_campus_operations_hub.dto.response.BookingResponse;
import com.nelli.smart_campus_operations_hub.dto.response.FacilityResponse;
import com.nelli.smart_campus_operations_hub.dto.response.TicketResponse;
import com.nelli.smart_campus_operations_hub.dto.response.UserResponse;
import com.nelli.smart_campus_operations_hub.model.Booking;
import com.nelli.smart_campus_operations_hub.model.Facility;
import com.nelli.smart_campus_operations_hub.model.Ticket;
import com.nelli.smart_campus_operations_hub.model.User;
import java.util.HashMap;
import java.util.Map;
import org.modelmapper.ModelMapper;
import org.modelmapper.config.Configuration.AccessLevel;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Central {@link ModelMapper} configuration for strict and safe entity-to-DTO mappings.
 *
 * <p>Includes custom mappings for:
 * <ul>
 *   <li>{@link Facility} -> {@link FacilityResponse} with calculated metadata.</li>
 *   <li>{@link Booking} -> {@link BookingResponse} with related entity display fields.</li>
 *   <li>{@link Ticket} -> {@link TicketResponse} with related names and time metrics.</li>
 *   <li>{@link User} -> {@link UserResponse} exposing only non-sensitive profile fields.</li>
 * </ul>
 */
@Configuration
public class ModelMapperConfig {

    @Bean
    public ModelMapper modelMapper() {
        ModelMapper mapper = new ModelMapper();
        mapper.getConfiguration()
                .setMatchingStrategy(MatchingStrategies.STRICT)
                .setFieldMatchingEnabled(true)
                .setFieldAccessLevel(AccessLevel.PRIVATE)
                .setSkipNullEnabled(true);
        configureFacilityMapping(mapper);
        configureBookingMapping(mapper);
        configureTicketMapping(mapper);
        configureUserMapping(mapper);
        return mapper;
    }

    private void configureFacilityMapping(ModelMapper mapper) {
        mapper.createTypeMap(Facility.class, FacilityResponse.class).addMappings(mapping -> {
            mapping.map(Facility::getId, FacilityResponse::setId);
            mapping.map(src -> src.getBookings() == null ? 0 : src.getBookings().size(), (dest, v) -> {
                Map<String, Object> links = dest.get_links() != null ? dest.get_links() : new HashMap<>();
                links.put("bookingsCount", v);
                dest.set_links(links);
            });
        });
    }

    private void configureBookingMapping(ModelMapper mapper) {
        mapper.createTypeMap(Booking.class, BookingResponse.class).addMappings(mapping -> {
            mapping.map(src -> src.getFacility().getId(), BookingResponse::setFacilityId);
            mapping.map(src -> src.getFacility().getName(), BookingResponse::setFacilityName);
            mapping.map(src -> src.getFacility().getType(), BookingResponse::setFacilityType);
            mapping.map(src -> src.getUser().getId(), BookingResponse::setUserId);
            mapping.map(src -> src.getUser().getName(), BookingResponse::setUserName);
            mapping.map(src -> src.getUser().getEmail(), BookingResponse::setUserEmail);
            mapping.map(
                    src -> src.getApprovedBy() != null ? src.getApprovedBy().getId() : null,
                    BookingResponse::setApprovedBy
            );
            mapping.map(
                    src -> src.getApprovedBy() != null ? src.getApprovedBy().getName() : null,
                    BookingResponse::setApprovedByName
            );
            mapping.map(Booking::getDurationMinutes, BookingResponse::setDurationMinutes);
        });
    }

    private void configureTicketMapping(ModelMapper mapper) {
        mapper.createTypeMap(Ticket.class, TicketResponse.class).addMappings(mapping -> {
            mapping.map(src -> src.getFacility().getId(), TicketResponse::setFacilityId);
            mapping.map(src -> src.getFacility().getName(), TicketResponse::setFacilityName);
            mapping.map(src -> src.getReportedBy().getId(), TicketResponse::setReportedById);
            mapping.map(src -> src.getReportedBy().getName(), TicketResponse::setReportedByName);
            mapping.map(src -> src.getReportedBy().getEmail(), TicketResponse::setReportedByEmail);
            mapping.map(
                    src -> src.getAssignedTo() != null ? src.getAssignedTo().getId() : null,
                    TicketResponse::setAssignedToId
            );
            mapping.map(
                    src -> src.getAssignedTo() != null ? src.getAssignedTo().getName() : null,
                    TicketResponse::setAssignedToName
            );
            mapping.map(src -> src.getComments() == null ? 0 : src.getComments().size(), TicketResponse::setCommentsCount);
            mapping.map(Ticket::getResponseTimeHours, TicketResponse::setResponseTimeHours);
            mapping.map(Ticket::getResolutionTimeHours, TicketResponse::setResolutionTimeHours);
        });
    }

    private void configureUserMapping(ModelMapper mapper) {
        mapper.createTypeMap(User.class, UserResponse.class).addMappings(mapping -> {
            mapping.map(User::getId, UserResponse::setId);
            mapping.map(User::getEmail, UserResponse::setEmail);
            mapping.map(User::getName, UserResponse::setName);
            mapping.map(User::getPhone, UserResponse::setPhone);
            mapping.map(User::getRole, UserResponse::setRole);
            mapping.map(User::getAuthProvider, UserResponse::setAuthProvider);
            mapping.map(User::getCreatedAt, UserResponse::setCreatedAt);
        });
    }
}
