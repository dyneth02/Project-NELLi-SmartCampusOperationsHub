package com.nelli.smart_campus_operations_hub.dto.response;

import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreferencesResponse {

    private UUID userId;
    private boolean bookingUpdates;
    private boolean ticketUpdates;
    private boolean commentNotifications;
    private boolean emailNotifications;
    private boolean weeklyDigest;
}
