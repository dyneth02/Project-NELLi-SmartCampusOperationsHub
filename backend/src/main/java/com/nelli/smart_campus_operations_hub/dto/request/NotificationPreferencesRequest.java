package com.nelli.smart_campus_operations_hub.dto.request;

import lombok.Data;

@Data
public class NotificationPreferencesRequest {

    private Boolean bookingUpdates;
    private Boolean ticketUpdates;
    private Boolean commentNotifications;
    private Boolean emailNotifications;
    private Boolean weeklyDigest;
}
