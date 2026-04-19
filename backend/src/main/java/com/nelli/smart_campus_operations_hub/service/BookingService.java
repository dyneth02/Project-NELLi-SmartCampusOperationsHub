package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.dto.request.BookingRequest;
import com.nelli.smart_campus_operations_hub.dto.response.BookingResponse;
import com.nelli.smart_campus_operations_hub.dto.response.RecurringBookingResponse;
import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityStatus;
import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.exception.BookingConflictException;
import com.nelli.smart_campus_operations_hub.exception.InvalidStateTransitionException;
import com.nelli.smart_campus_operations_hub.exception.ResourceNotFoundException;
import com.nelli.smart_campus_operations_hub.exception.UnauthorizedException;
import com.nelli.smart_campus_operations_hub.model.Booking;
import com.nelli.smart_campus_operations_hub.model.Facility;
import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.BookingRepository;
import com.nelli.smart_campus_operations_hub.repository.FacilityRepository;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import com.nelli.smart_campus_operations_hub.util.DateTimeUtil;
import com.nelli.smart_campus_operations_hub.util.ValidationUtil;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * This manages booking creation, recurrence, approvals, cancellation, and query operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final BookingRepository bookingRepository;
    private final FacilityRepository facilityRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final ModelMapper modelMapper;

    /**
     * Creates a new booking in PENDING state after conflict validation.
     *
     * @param request booking payload
     * @param userEmail current user email
     * @return created booking response
     */
    @Transactional
    public BookingResponse createBooking(BookingRequest request, String userEmail) {
        User user = findUserByEmail(userEmail);
        Facility facility = findFacilityById(request.getFacilityId());
        ensureFacilityActive(facility);
        ValidationUtil.validateBookingTimeRange(request.getStartDateTime(), request.getEndDateTime());

        boolean hasConflict = bookingRepository.hasOverlappingBookings(
                request.getFacilityId(),
                request.getStartDateTime(),
                request.getEndDateTime(),
                null
        );
        if (hasConflict) {
            throw new BookingConflictException("Booking time slot conflicts with existing approved booking.");
        }

        Booking booking = modelMapper.map(request, Booking.class);
        booking.setUser(user);
        booking.setFacility(facility);
        booking.setStatus(BookingStatus.PENDING);
        booking.setRecurring(false);
        booking = bookingRepository.save(booking);

        notificationService.sendNewBookingRequestNotificationToAdmins(booking);
        log.info("Booking created. bookingId={}, userId={}, status={}", booking.getId(), user.getId(), booking.getStatus());
        BookingResponse response = modelMapper.map(booking, BookingResponse.class);
        addBookingHateoasLinks(response, userEmail, user.getRole());
        return response;
    }

    /**
     * Creates recurring bookings as an all-or-nothing series.
     *
     * @param request recurring booking payload
     * @param userEmail current user email
     * @return recurring booking creation response
     */
    @Transactional
    public RecurringBookingResponse createRecurringBooking(BookingRequest request, String userEmail) {
        ValidationUtil.validateRecurrenceParameters(request);
        User user = findUserByEmail(userEmail);
        Facility facility = findFacilityById(request.getFacilityId());
        ensureFacilityActive(facility);

        UUID recurringGroupId = UUID.randomUUID();
        List<Booking> toSave = new ArrayList<>();
        List<Booking> conflictingBookings = new ArrayList<>();
        List<String> conflicts = new ArrayList<>();

        for (var day : request.getRecurrenceDays()) {
            List<LocalDate> dates = DateTimeUtil.getDatesBetween(
                    request.getStartDateTime().toLocalDate(),
                    request.getRecurrenceEndDate(),
                    day
            );
            for (LocalDate date : dates) {
                LocalDateTime start = date.atTime(request.getStartDateTime().toLocalTime());
                LocalDateTime end = date.atTime(request.getEndDateTime().toLocalTime());
                ValidationUtil.validateBookingTimeRange(start, end);

                boolean hasConflict = bookingRepository.hasOverlappingBookings(
                        facility.getId(),
                        start,
                        end,
                        null
                );
                if (hasConflict) {
                    conflicts.add("Conflict on " + start + " - " + end);
                    bookingRepository.findByFacilityIdOrderByStartDateTimeAsc(facility.getId()).stream()
                            .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                            .filter(b -> DateTimeUtil.isOverlapping(start, end, b.getStartDateTime(), b.getEndDateTime()))
                            .forEach(conflictingBookings::add);
                    continue;
                }

                Booking booking = modelMapper.map(request, Booking.class);
                booking.setStartDateTime(start);
                booking.setEndDateTime(end);
                booking.setUser(user);
                booking.setFacility(facility);
                booking.setStatus(BookingStatus.PENDING);
                booking.setRecurring(true);
                booking.setRecurringGroupId(recurringGroupId);
                toSave.add(booking);
            }
        }

        if (!conflicts.isEmpty()) {
            throw new BookingConflictException("Recurring booking contains conflicting slots.", conflictingBookings);
        }

        List<Booking> saved = bookingRepository.saveAll(toSave);
        for (Booking booking : saved) {
            notificationService.sendNewBookingRequestNotificationToAdmins(booking);
        }

        List<BookingResponse> responses = saved.stream()
                .map(b -> {
                    BookingResponse response = modelMapper.map(b, BookingResponse.class);
                    addBookingHateoasLinks(response, userEmail, user.getRole());
                    return response;
                })
                .collect(Collectors.toList());

        log.info(
                "Recurring booking created. recurringGroupId={}, userId={}, bookings={}",
                recurringGroupId,
                user.getId(),
                saved.size()
        );
        return RecurringBookingResponse.builder()
                .recurringGroupId(recurringGroupId)
                .totalBookings(saved.size())
                .successfulBookings(saved.size())
                .failedBookings(0)
                .bookings(responses)
                .conflicts(conflicts)
                .build();
    }

    /**
     * Approves a pending booking after final conflict re-check.
     *
     * @param bookingId booking id
     * @param adminEmail admin email
     * @return approved booking response
     */
    @Transactional
    public BookingResponse approveBooking(UUID bookingId, String adminEmail) {
        Booking booking = findBookingById(bookingId);
        User admin = findUserByEmail(adminEmail);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidStateTransitionException(
                    "Booking",
                    booking.getStatus().name(),
                    BookingStatus.APPROVED.name()
            );
        }

        boolean hasConflict = bookingRepository.hasOverlappingBookings(
                booking.getFacility().getId(),
                booking.getStartDateTime(),
                booking.getEndDateTime(),
                booking.getId()
        );
        if (hasConflict) {
            throw new BookingConflictException("Cannot approve booking due to scheduling conflict.");
        }

        booking.setStatus(BookingStatus.APPROVED);
        booking.setApprovedBy(admin);
        booking.setApprovedAt(LocalDateTime.now());
        booking = bookingRepository.save(booking);
        notificationService.sendBookingApprovedNotification(booking);

        log.info("Booking approved. bookingId={}, adminId={}, status={}", booking.getId(), admin.getId(), booking.getStatus());
        BookingResponse response = modelMapper.map(booking, BookingResponse.class);
        addBookingHateoasLinks(response, adminEmail, admin.getRole());
        return response;
    }

    /**
     * Rejects a pending booking with reason.
     *
     * @param bookingId booking id
     * @param reason rejection reason
     * @param adminEmail admin email
     * @return rejected booking response
     */
    @Transactional
    public BookingResponse rejectBooking(UUID bookingId, String reason, String adminEmail) {
        Booking booking = findBookingById(bookingId);
        User admin = findUserByEmail(adminEmail);
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidStateTransitionException(
                    "Booking",
                    booking.getStatus().name(),
                    BookingStatus.REJECTED.name()
            );
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectionReason(reason);
        booking.setApprovedBy(admin);
        booking.setApprovedAt(LocalDateTime.now());
        booking = bookingRepository.save(booking);
        notificationService.sendBookingRejectedNotification(booking);

        log.info("Booking rejected. bookingId={}, adminId={}, status={}", booking.getId(), admin.getId(), booking.getStatus());
        BookingResponse response = modelMapper.map(booking, BookingResponse.class);
        addBookingHateoasLinks(response, adminEmail, admin.getRole());
        return response;
    }

    /**
     * Cancels an existing booking if allowed by user ownership/admin role and state rules.
     *
     * @param bookingId booking id
     * @param userEmail requester email
     */
    @Transactional
    public void cancelBooking(UUID bookingId, String userEmail) {
        Booking booking = findBookingById(bookingId);
        User user = findUserByEmail(userEmail);

        boolean isOwner = booking.getUser().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedException("You are not allowed to cancel this booking.");
        }
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidStateTransitionException("Booking", booking.getStatus().name(), BookingStatus.CANCELLED.name());
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        bookingRepository.save(booking);
        notificationService.sendBookingCancelledNotification(booking);

        log.info("Booking cancelled. bookingId={}, userId={}, status={}", booking.getId(), user.getId(), booking.getStatus());
    }

    /**
     * Retrieves current user's bookings optionally filtered by status.
     *
     * @param userEmail user email
     * @param status optional status
     * @return booking list
     */
    public List<BookingResponse> getMyBookings(String userEmail, BookingStatus status) {
        User user = findUserByEmail(userEmail);
        List<Booking> bookings = status == null
                ? bookingRepository.findByUserIdOrderByStartDateTimeDesc(user.getId())
                : bookingRepository.findByUserIdAndStatus(user.getId(), status);
        return bookings.stream()
                .map(b -> {
                    BookingResponse response = modelMapper.map(b, BookingResponse.class);
                    addBookingHateoasLinks(response, userEmail, user.getRole());
                    return response;
                })
                .collect(Collectors.toList());
    }

    /**
     * Retrieves bookings using admin filters.
     *
     * @param status optional status
     * @param facilityId optional facility id
     * @param startDate optional start lower bound
     * @param endDate optional end upper bound
     * @return filtered booking list
     */
    public List<BookingResponse> getAllBookings(
            BookingStatus status,
            UUID facilityId,
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        List<BookingStatus> statuses = status == null
                ? Arrays.asList(BookingStatus.values())
                : List.of(status);
        return bookingRepository.findWithFilters(statuses, facilityId, startDate, endDate).stream()
                .map(b -> modelMapper.map(b, BookingResponse.class))
                .collect(Collectors.toList());
    }

    /**
     * Returns booking details when current user has access.
     *
     * @param id booking id
     * @param userEmail requester email
     * @return booking response
     */
    public BookingResponse getBookingById(UUID id, String userEmail) {
        Booking booking = findBookingById(id);
        User user = findUserByEmail(userEmail);

        boolean isOwner = booking.getUser().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedException("You are not allowed to view this booking.");
        }

        BookingResponse response = modelMapper.map(booking, BookingResponse.class);
        addBookingHateoasLinks(response, userEmail, user.getRole());
        return response;
    }

    /**
     * Returns all bookings for one facility.
     *
     * @param facilityId facility id
     * @return facility bookings
     */
    public List<BookingResponse> getFacilityBookings(UUID facilityId) {
        findFacilityById(facilityId);
        return bookingRepository.findByFacilityIdOrderByStartDateTimeAsc(facilityId).stream()
                .map(b -> modelMapper.map(b, BookingResponse.class))
                .collect(Collectors.toList());
    }

    private void addBookingHateoasLinks(BookingResponse response, String currentUserEmail, Role currentUserRole) {
        Map<String, Object> links = response.get_links();
        links.put("self", "/api/v1/bookings/" + response.getId());
        links.put("facility", "/api/v1/facilities/" + response.getFacilityId());

        if (response.getStatus() == BookingStatus.PENDING) {
            if (currentUserRole == Role.ADMIN) {
                links.put("approve", "/api/v1/bookings/" + response.getId() + "/approve");
                links.put("reject", "/api/v1/bookings/" + response.getId() + "/reject");
            }
            if (currentUserEmail != null && currentUserEmail.equalsIgnoreCase(response.getUserEmail())) {
                links.put("cancel", "/api/v1/bookings/" + response.getId() + "/cancel");
            }
        }

        if (response.getStatus() == BookingStatus.APPROVED
                && (currentUserRole == Role.ADMIN
                || (currentUserEmail != null && currentUserEmail.equalsIgnoreCase(response.getUserEmail())))) {
            links.put("cancel", "/api/v1/bookings/" + response.getId() + "/cancel");
        }
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private Facility findFacilityById(UUID id) {
        return facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facility", "id", id));
    }

    private Booking findBookingById(UUID id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));
    }

    private void ensureFacilityActive(Facility facility) {
        if (facility.getStatus() != FacilityStatus.ACTIVE) {
            throw new IllegalStateException("Facility is not active for booking.");
        }
    }
}
