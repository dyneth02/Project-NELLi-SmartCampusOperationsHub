package com.nelli.smart_campus_operations_hub.dto.response;

import com.nelli.smart_campus_operations_hub.enums.NotificationType;
import java.time.LocalDateTime;
import java.util.HashMap;
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
public class NotificationResponse {

    private UUID id;
    private NotificationType type;
    private String title;
    private String message;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    @Builder.Default
    private Map<String, Object> _links = new HashMap<>();
}
