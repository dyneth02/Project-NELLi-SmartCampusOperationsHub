package com.nelli.smart_campus_operations_hub.dto.response;

import com.nelli.smart_campus_operations_hub.enums.TicketCategory;
import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketResponse {

    private UUID id;
    private String ticketNumber;
    private UUID facilityId;
    private String facilityName;
    private TicketCategory category;
    private TicketPriority priority;
    private TicketStatus status;
    private String description;
    private String resolutionNotes;
    private UUID reportedById;
    private String reportedByName;
    private String reportedByEmail;
    private UUID assignedToId;
    private String assignedToName;
    private String contactEmail;
    private String contactPhone;
    private List<AttachmentResponse> attachments;
    private int commentsCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
    private Long responseTimeHours;
    private Long resolutionTimeHours;

    @Builder.Default
    private Map<String, Object> _links = new HashMap<>();
}
