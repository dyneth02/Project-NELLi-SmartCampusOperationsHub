package com.nelli.smart_campus_operations_hub.controller;

import com.nelli.smart_campus_operations_hub.dto.request.CommentRequest;
import com.nelli.smart_campus_operations_hub.dto.request.TicketAssignmentRequest;
import com.nelli.smart_campus_operations_hub.dto.request.TicketRequest;
import com.nelli.smart_campus_operations_hub.dto.request.TicketStatusUpdateRequest;
import com.nelli.smart_campus_operations_hub.dto.request.TicketUpdateRequest;
import com.nelli.smart_campus_operations_hub.dto.response.ApiResponse;
import com.nelli.smart_campus_operations_hub.dto.response.AttachmentResponse;
import com.nelli.smart_campus_operations_hub.dto.response.CommentResponse;
import com.nelli.smart_campus_operations_hub.dto.response.TicketResponse;
import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import com.nelli.smart_campus_operations_hub.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.net.URI;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Manages ticket workflow operations including assignment, status transitions,
 * comment threads, and image attachments.
 */
@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
@Slf4j
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    @Operation(summary = "Create ticket", description = "Report a facility issue or maintenance request")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Ticket created")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(
            @Valid @RequestBody TicketRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        TicketResponse response = ticketService.createTicket(request, userDetails.getUsername());
        log.info("Ticket created. ticketId={}, user={}", response.getId(), userDetails.getUsername());
        return ResponseEntity
                .created(URI.create("/api/v1/tickets/" + response.getId()))
                .body(ApiResponse.success(response, "Ticket created"));
    }

    @GetMapping("/my-tickets")
    @Operation(summary = "Get my tickets", description = "Retrieve tickets created by current user")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getMyTickets(@AuthenticationPrincipal UserDetails userDetails) {
        List<TicketResponse> response = ticketService.getMyTickets(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "My tickets retrieved"));
    }

    @GetMapping("/assigned")
    @Operation(summary = "Get assigned tickets", description = "Technician/Admin - View tickets assigned to me")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getAssignedTickets(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<TicketResponse> response = ticketService.getAssignedTickets(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Assigned tickets retrieved"));
    }

    @GetMapping
    @Operation(summary = "Get all tickets", description = "View all tickets with filters")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getAllTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketPriority priority,
            @RequestParam(required = false) UUID facilityId,
            @RequestParam(required = false) UUID assignedToId,
            @RequestParam(required = false) Boolean assigned
    ) {
        List<TicketResponse> response = ticketService.getAllTickets(status, priority, facilityId, assignedToId, assigned);
        return ResponseEntity.ok(ApiResponse.success(response, "Tickets retrieved"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get ticket by ID")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Ticket found")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Ticket not found")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Not authorized to view this ticket")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TicketResponse>> getTicketById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        TicketResponse response = ticketService.getTicketById(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Ticket retrieved"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update ticket details", description = "Update ticket description, priority, category (reporter only, before assignment)")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TicketResponse>> updateTicket(
            @PathVariable UUID id,
            @Valid @RequestBody TicketUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        TicketResponse response = ticketService.updateTicketDetails(id, request, userDetails.getUsername());
        log.info("Ticket updated. ticketId={}, user={}", id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Ticket updated"));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update ticket status", description = "Admin/Technician - Change ticket status and add resolution notes")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<ApiResponse<TicketResponse>> updateTicketStatus(
            @PathVariable UUID id,
            @Valid @RequestBody TicketStatusUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        TicketResponse response = ticketService.updateTicketStatus(id, request, userDetails.getUsername());
        log.info("Ticket status updated. ticketId={}, user={}", id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Ticket status updated"));
    }

    @PatchMapping("/{id}/assign")
    @Operation(summary = "Assign ticket to technician", description = "Admin only - Assign ticket to a technician")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TicketResponse>> assignTicket(
            @PathVariable UUID id,
            @Valid @RequestBody TicketAssignmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        TicketResponse response = ticketService.assignTicket(id, request.getTechnicianId(), userDetails.getUsername());
        log.info("Ticket assigned. ticketId={}, admin={}", id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Ticket assigned"));
    }

    @PostMapping("/{id}/attachments")
    @Operation(summary = "Upload attachment", description = "Upload image attachment to ticket (max 3)")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Attachment uploaded")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AttachmentResponse>> uploadAttachment(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        AttachmentResponse response = ticketService.uploadAttachment(id, file, userDetails.getUsername());
        return ResponseEntity.status(201).body(ApiResponse.success(response, "Attachment uploaded"));
    }

    @DeleteMapping("/attachments/{attachmentId}")
    @Operation(summary = "Delete attachment", description = "Delete ticket attachment (uploader or admin only)")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Attachment deleted")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ticketService.deleteAttachment(attachmentId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/attachments")
    @Operation(summary = "Get ticket attachments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AttachmentResponse>>> getAttachments(@PathVariable UUID id) {
        List<AttachmentResponse> response = ticketService.getTicketAttachments(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Attachments retrieved"));
    }

    @PostMapping("/{id}/comments")
    @Operation(summary = "Add comment", description = "Add a comment to the ticket")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Comment added")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable UUID id,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        CommentResponse response = ticketService.addComment(id, request, userDetails.getUsername());
        return ResponseEntity.status(201).body(ApiResponse.success(response, "Comment added"));
    }

    @PutMapping("/comments/{commentId}")
    @Operation(summary = "Update comment", description = "Edit own comment")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable UUID commentId,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        CommentResponse response = ticketService.updateComment(commentId, request, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(response, "Comment updated"));
    }

    @DeleteMapping("/comments/{commentId}")
    @Operation(summary = "Delete comment", description = "Delete own comment or admin can delete any")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Comment deleted")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID commentId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ticketService.deleteComment(commentId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/comments")
    @Operation(summary = "Get ticket comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getComments(@PathVariable UUID id) {
        List<CommentResponse> response = ticketService.getTicketComments(id);
        return ResponseEntity.ok(ApiResponse.success(response, "Comments retrieved"));
    }
}
