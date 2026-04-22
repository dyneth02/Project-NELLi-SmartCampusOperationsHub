package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.dto.response.AnalyticsOverviewResponse;
import com.nelli.smart_campus_operations_hub.dto.response.FacilityUsageResponse;
import com.nelli.smart_campus_operations_hub.dto.response.PeakHoursResponse;
import com.nelli.smart_campus_operations_hub.dto.response.TicketMetricsResponse;
import com.nelli.smart_campus_operations_hub.enums.BookingStatus;
import com.nelli.smart_campus_operations_hub.enums.FacilityStatus;
import com.nelli.smart_campus_operations_hub.enums.TicketCategory;
import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import com.nelli.smart_campus_operations_hub.model.Booking;
import com.nelli.smart_campus_operations_hub.model.Facility;
import com.nelli.smart_campus_operations_hub.model.Ticket;
import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.BookingRepository;
import com.nelli.smart_campus_operations_hub.repository.FacilityRepository;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import java.time.Duration;
import com.nelli.smart_campus_operations_hub.repository.TicketRepository;
import com.nelli.smart_campus_operations_hub.util.DateTimeUtil;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Produces dashboard analytics aggregates for facilities, bookings, and ticket workflows.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final FacilityRepository facilityRepository;
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    /**
     * Returns top-level dashboard metrics snapshot.
     *
     * @return overview response
     */
    public AnalyticsOverviewResponse getOverview() {
        List<Facility> facilities = facilityRepository.findAll();
        List<Booking> bookings = bookingRepository.findAll();
        List<Ticket> tickets = ticketRepository.findAll();

        Map<UUID, Long> approvedByFacility = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .collect(Collectors.groupingBy(b -> b.getFacility().getId(), Collectors.counting()));
        String topUsedFacility = approvedByFacility.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .flatMap(e -> facilities.stream().filter(f -> f.getId().equals(e.getKey())).findFirst())
                .map(Facility::getName)
                .orElse("N/A");

        String busyHour = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .collect(Collectors.groupingBy(b -> b.getStartDateTime().getHour(), Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(e -> formatHourRange(e.getKey()))
                .orElse("N/A");

        return AnalyticsOverviewResponse.builder()
                .totalFacilities(facilities.size())
                .activeFacilities(facilities.stream().filter(f -> f.getStatus() == FacilityStatus.ACTIVE).count())
                .totalBookings(bookings.size())
                .pendingBookings(bookings.stream().filter(b -> b.getStatus() == BookingStatus.PENDING).count())
                .approvedBookings(bookings.stream().filter(b -> b.getStatus() == BookingStatus.APPROVED).count())
                .totalTickets(tickets.size())
                .openTickets(tickets.stream().filter(t -> t.getStatus() == TicketStatus.OPEN || t.getStatus() == TicketStatus.IN_PROGRESS).count())
                .resolvedTickets(tickets.stream().filter(t -> t.getStatus() == TicketStatus.RESOLVED).count())
                .averageResolutionTimeHours(ticketRepository.getAverageResolutionTimeHours())
                .topUsedFacility(topUsedFacility)
                .busyHour(busyHour)
                .activeUsers(userRepository.findAll().stream().filter(User::isEnabled).count())
                .build();
    }

    /**
     * Returns most used facilities ranked by approved bookings.
     *
     * @param limit max result size
     * @return usage stats
     */
    public List<FacilityUsageResponse> getTopUsedFacilities(int limit) {
        Map<UUID, List<Booking>> grouped = bookingRepository.findAll().stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .collect(Collectors.groupingBy(b -> b.getFacility().getId()));

        return grouped.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue().size(), a.getValue().size()))
                .limit(limit)
                .map(entry -> {
                    Facility facility = entry.getValue().get(0).getFacility();
                    long totalHours = entry.getValue().stream()
                            .mapToLong(Booking::getDurationMinutes)
                            .sum() / 60;
                    return FacilityUsageResponse.builder()
                            .facilityId(facility.getId())
                            .facilityName(facility.getName())
                            .facilityType(facility.getType())
                            .bookingCount(entry.getValue().size())
                            .totalHoursBooked(totalHours)
                            .utilizationRate(calculateUtilizationRate(facility.getId(), LocalDate.now().minusDays(30), LocalDate.now()))
                            .build();
                })
                .peek(resp -> resp.get_links().put("facility", "/api/v1/facilities/" + resp.getFacilityId()))
                .collect(Collectors.toList());
    }

    /**
     * Returns booking distribution by hour for all 24 hours.
     *
     * @return peak hour response list
     */
    public List<PeakHoursResponse> getPeakBookingHours() {
        Map<Integer, Long> counts = bookingRepository.findAll().stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .collect(Collectors.groupingBy(b -> b.getStartDateTime().getHour(), Collectors.counting()));

        List<PeakHoursResponse> results = new ArrayList<>();
        for (int hour = 0; hour < 24; hour++) {
            results.add(PeakHoursResponse.builder()
                    .hour(hour)
                    .bookingCount(counts.getOrDefault(hour, 0L))
                    .label(formatHourRange(hour))
                    .build());
        }
        return results;
    }

    /**
     * Returns ticket metrics including status distributions and averages.
     *
     * @return ticket metrics
     */
    public TicketMetricsResponse getTicketMetrics() {
        List<Ticket> tickets = ticketRepository.findAll();
        Map<TicketPriority, Long> byPriority = new EnumMap<>(TicketPriority.class);
        for (TicketPriority priority : TicketPriority.values()) {
            byPriority.put(priority, tickets.stream().filter(t -> t.getPriority() == priority).count());
        }
        Map<TicketCategory, Long> byCategory = new EnumMap<>(TicketCategory.class);
        for (TicketCategory category : TicketCategory.values()) {
            byCategory.put(category, tickets.stream().filter(t -> t.getCategory() == category).count());
        }

        return TicketMetricsResponse.builder()
                .averageResponseTimeHours(calculateAverageResponseTime())
                .averageResolutionTimeHours(ticketRepository.getAverageResolutionTimeHours())
                .totalTickets(tickets.size())
                .openTickets(tickets.stream().filter(t -> t.getStatus() == TicketStatus.OPEN).count())
                .inProgressTickets(tickets.stream().filter(t -> t.getStatus() == TicketStatus.IN_PROGRESS).count())
                .resolvedTickets(tickets.stream().filter(t -> t.getStatus() == TicketStatus.RESOLVED).count())
                .closedTickets(tickets.stream().filter(t -> t.getStatus() == TicketStatus.CLOSED).count())
                .ticketsByPriority(byPriority)
                .ticketsByCategory(byCategory)
                .build();
    }

    /**
     * Returns facility usage metrics within a period.
     *
     * @param startDate period start
     * @param endDate period end
     * @return usage stats
     */
    public List<FacilityUsageResponse> getFacilityUsageByPeriod(LocalDate startDate, LocalDate endDate) {
        Map<UUID, List<Booking>> grouped = bookingRepository.findAll().stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .filter(b -> DateTimeUtil.isWithinDateRange(b.getStartDateTime(), startDate, endDate))
                .collect(Collectors.groupingBy(b -> b.getFacility().getId()));

        return grouped.values().stream()
                .map(list -> {
                    Facility facility = list.get(0).getFacility();
                    long totalHours = list.stream().mapToLong(Booking::getDurationMinutes).sum() / 60;
                    return FacilityUsageResponse.builder()
                            .facilityId(facility.getId())
                            .facilityName(facility.getName())
                            .facilityType(facility.getType())
                            .bookingCount(list.size())
                            .totalHoursBooked(totalHours)
                            .utilizationRate(calculateUtilizationRate(facility.getId(), startDate, endDate))
                            .build();
                })
                .sorted(Comparator.comparingLong(FacilityUsageResponse::getBookingCount).reversed())
                .collect(Collectors.toList());
    }

    private double calculateUtilizationRate(UUID facilityId, LocalDate startDate, LocalDate endDate) {
        long bookedHours = bookingRepository.findByFacilityIdOrderByStartDateTimeAsc(facilityId).stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .filter(b -> DateTimeUtil.isWithinDateRange(b.getStartDateTime(), startDate, endDate))
                .mapToLong(Booking::getDurationMinutes)
                .sum() / 60;
        long days = Math.max(1, Duration.between(startDate.atStartOfDay(), endDate.plusDays(1).atStartOfDay()).toDays());
        long availableHours = days * 12;
        return availableHours == 0 ? 0.0 : ((double) bookedHours / availableHours);
    }

    private Double calculateAverageResponseTime() {
        List<Ticket> tickets = ticketRepository.findAll().stream()
                .filter(t -> t.getStatus() != TicketStatus.OPEN)
                .filter(t -> t.getCreatedAt() != null && t.getUpdatedAt() != null)
                .toList();
        if (tickets.isEmpty()) {
            return 0.0;
        }
        double avg = tickets.stream()
                .mapToLong(t -> Duration.between(t.getCreatedAt(), t.getUpdatedAt()).toHours())
                .average()
                .orElse(0.0);
        return avg;
    }

    private String formatHourRange(int hour) {
        int next = (hour + 1) % 24;
        return String.format("%02d:00 - %02d:00", hour, next);
    }
}

