package com.nelli.smart_campus_operations_hub.controller;

import com.nelli.smart_campus_operations_hub.dto.request.NotificationPreferencesRequest;
import com.nelli.smart_campus_operations_hub.dto.response.ApiResponse;
import com.nelli.smart_campus_operations_hub.dto.response.NotificationPreferencesResponse;
import com.nelli.smart_campus_operations_hub.dto.response.NotificationResponse;
import com.nelli.smart_campus_operations_hub.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Handles current-user notification retrieval, acknowledgement, and preference settings.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get user notifications", description = "Retrieve all notifications for current user")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<NotificationResponse> response = notificationService.getUserNotifications(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Notifications retrieved"));
    }

    @GetMapping("/unread")
    @Operation(summary = "Get unread notifications")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getUnreadNotifications(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<NotificationResponse> response = notificationService.getUnreadNotifications(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Unread notifications retrieved"));
    }

    @GetMapping("/unread/count")
    @Operation(summary = "Get unread count", description = "Get count of unread notifications for badge")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        long count = notificationService.getUnreadCount(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(count, "Unread count retrieved"));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark notification as read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        notificationService.markAsRead(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", "Success"));
    }

    @PatchMapping("/mark-all-read")
    @Operation(summary = "Mark all notifications as read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> markAllAsRead(@AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllAsRead(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", "Success"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete notification")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Notification deleted")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        notificationService.deleteNotification(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    @Operation(summary = "Get notification preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<NotificationPreferencesResponse>> getPreferences(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        NotificationPreferencesResponse response = notificationService.getPreferences(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Preferences retrieved"));
    }

    @PatchMapping("/preferences")
    @Operation(summary = "Update notification preferences", description = "Partial update of notification settings")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<NotificationPreferencesResponse>> updatePreferences(
            @RequestBody NotificationPreferencesRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        NotificationPreferencesResponse response = notificationService.updatePreferences(userDetails.getUsername(), request);
        log.info("Notification preferences updated for email={}", userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Preferences updated"));
    }
}
