package com.nelli.smart_campus_operations_hub.dto.response;

import com.nelli.smart_campus_operations_hub.enums.TicketCategory;
import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import java.util.Map;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TicketMetricsResponse {

    private Double averageResponseTimeHours;
    private Double averageResolutionTimeHours;
    private long totalTickets;
    private long openTickets;
    private long inProgressTickets;
    private long resolvedTickets;
    private long closedTickets;
    private Map<TicketPriority, Long> ticketsByPriority;
    private Map<TicketCategory, Long> ticketsByCategory;
}
