package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.dto.request.CommentRequest;
import com.nelli.smart_campus_operations_hub.dto.request.TicketRequest;
import com.nelli.smart_campus_operations_hub.dto.request.TicketStatusUpdateRequest;
import com.nelli.smart_campus_operations_hub.dto.request.TicketUpdateRequest;
import com.nelli.smart_campus_operations_hub.dto.response.AttachmentResponse;
import com.nelli.smart_campus_operations_hub.dto.response.CommentResponse;
import com.nelli.smart_campus_operations_hub.dto.response.TicketResponse;
import com.nelli.smart_campus_operations_hub.enums.FacilityStatus;
import com.nelli.smart_campus_operations_hub.enums.NotificationType;
import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.enums.TicketPriority;
import com.nelli.smart_campus_operations_hub.enums.TicketStatus;
import com.nelli.smart_campus_operations_hub.exception.ResourceNotFoundException;
import com.nelli.smart_campus_operations_hub.exception.UnauthorizedException;
import com.nelli.smart_campus_operations_hub.model.Comment;
import com.nelli.smart_campus_operations_hub.model.Facility;
import com.nelli.smart_campus_operations_hub.model.Ticket;
import com.nelli.smart_campus_operations_hub.model.TicketAttachment;
import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.CommentRepository;
import com.nelli.smart_campus_operations_hub.repository.FacilityRepository;
import com.nelli.smart_campus_operations_hub.repository.TicketAttachmentRepository;
import com.nelli.smart_campus_operations_hub.repository.TicketRepository;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import com.nelli.smart_campus_operations_hub.util.AppConstants;
import com.nelli.smart_campus_operations_hub.util.ValidationUtil;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Handles ticket lifecycle management, assignment, attachments, and comments with permission checks.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketAttachmentRepository ticketAttachmentRepository;
    private final CommentRepository commentRepository;
    private final FacilityRepository facilityRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final ModelMapper modelMapper;

    /**
     * Creates a new ticket in OPEN state.
     *
     * @param request ticket payload
     * @param userEmail reporter email
     * @return created ticket response
     */
    @Transactional
    public TicketResponse createTicket(TicketRequest request, String userEmail) {
        User user = findUserByEmail(userEmail);
        Facility facility = findFacilityById(request.getFacilityId());
        if (facility.getStatus() != FacilityStatus.ACTIVE) {
            throw new IllegalStateException("Cannot create tickets for inactive facilities.");
        }

        Ticket ticket = modelMapper.map(request, Ticket.class);
        ticket.setTicketNumber(generateTicketNumber());
        ticket.setReportedBy(user);
        ticket.setFacility(facility);
        ticket.setStatus(TicketStatus.OPEN);
        ticket = ticketRepository.save(ticket);
        notificationService.sendNewTicketNotificationToAdmins(ticket);

        log.info("Ticket created. ticketId={}, userId={}, status={}", ticket.getId(), user.getId(), ticket.getStatus());
        return toTicketResponse(ticket, user);
    }

    /**
     * Updates editable ticket details while ticket is OPEN and user is owner.
     *
     * @param ticketId ticket id
     * @param request update request
     * @param userEmail requester email
     * @return updated ticket response
     */
    @Transactional
    public TicketResponse updateTicketDetails(UUID ticketId, TicketUpdateRequest request, String userEmail) {
        Ticket ticket = findTicketById(ticketId);
        User user = findUserByEmail(userEmail);
        if (!ticket.getReportedBy().getId().equals(user.getId())) {
            throw new UnauthorizedException("Only ticket owner can update ticket details.");
        }
        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new IllegalStateException("Ticket details can only be updated while status is OPEN.");
        }

        ticket.setDescription(request.getDescription());
        if (request.getPriority() != null) {
            ticket.setPriority(request.getPriority());
        }
        if (request.getCategory() != null) {
            ticket.setCategory(request.getCategory());
        }
        ticket = ticketRepository.save(ticket);
        log.info("Ticket details updated. ticketId={}, userId={}", ticket.getId(), user.getId());
        return toTicketResponse(ticket, user);
    }

    /**
     * Updates ticket status according to allowed transitions and role permissions.
     *
     * @param ticketId ticket id
     * @param request status update payload
     * @param userEmail requester email
     * @return updated ticket response
     */
    @Transactional
    public TicketResponse updateTicketStatus(UUID ticketId, TicketStatusUpdateRequest request, String userEmail) {
        Ticket ticket = findTicketById(ticketId);
        User user = findUserByEmail(userEmail);

        boolean allowed = user.getRole() == Role.ADMIN
                || user.getRole() == Role.TECHNICIAN
                || (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(user.getId()));
        if (!allowed) {
            throw new UnauthorizedException("Not authorized to update ticket status.");
        }

        TicketStatus oldStatus = ticket.getStatus();
        TicketStatus next = request.getStatus();
        ValidationUtil.validateTicketStatusTransition(oldStatus, next);

        ticket.setStatus(next);
        if (next == TicketStatus.RESOLVED) {
            if (request.getResolutionNotes() == null || request.getResolutionNotes().isBlank()) {
                throw new IllegalArgumentException("Resolution notes are required when resolving a ticket.");
            }
            ticket.setResolutionNotes(request.getResolutionNotes());
            ticket.setResolvedAt(LocalDateTime.now());
        } else if (next == TicketStatus.CLOSED) {
            ticket.setClosedAt(LocalDateTime.now());
        }

        ticket = ticketRepository.save(ticket);
        notificationService.sendTicketStatusChangedNotification(ticket, oldStatus, next);
        log.info("Ticket status updated. ticketId={}, userId={}, oldStatus={}, newStatus={}", ticket.getId(), user.getId(), oldStatus, next);
        return toTicketResponse(ticket, user);
    }

    /**
     * Assigns a technician to a ticket. ADMIN only operation.
     *
     * @param ticketId ticket id
     * @param technicianId technician id
     * @param adminEmail admin email
     * @return assigned ticket response
     */
    @Transactional
    public TicketResponse assignTicket(UUID ticketId, UUID technicianId, String adminEmail) {
        Ticket ticket = findTicketById(ticketId);
        User admin = findUserByEmail(adminEmail);
        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only admins can assign tickets.");
        }

        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", technicianId));
        if (technician.getRole() != Role.TECHNICIAN) {
            throw new IllegalArgumentException("Assignee must have TECHNICIAN role.");
        }

        ticket.setAssignedTo(technician);
        if (ticket.getStatus() == TicketStatus.OPEN) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }
        ticket = ticketRepository.save(ticket);
        notificationService.sendTicketAssignedNotification(ticket, technician);
        log.info("Ticket assigned. ticketId={}, adminId={}, technicianId={}", ticket.getId(), admin.getId(), technician.getId());
        return toTicketResponse(ticket, admin);
    }

    /**
     * Returns tickets reported by current user.
     *
     * @param userEmail user email
     * @return ticket list
     */
    public List<TicketResponse> getMyTickets(String userEmail) {
        User user = findUserByEmail(userEmail);
        return ticketRepository.findByReportedByIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(t -> toTicketResponse(t, user))
                .collect(Collectors.toList());
    }

    /**
     * Returns tickets assigned to current technician/admin.
     *
     * @param userEmail user email
     * @return assigned tickets
     */
    public List<TicketResponse> getAssignedTickets(String userEmail) {
        User user = findUserByEmail(userEmail);
        if (user.getRole() != Role.TECHNICIAN && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only technicians or admins can view assigned tickets.");
        }
        return ticketRepository.findByAssignedToIdOrderByPriorityDescCreatedAtAsc(user.getId()).stream()
                .map(t -> toTicketResponse(t, user))
                .collect(Collectors.toList());
    }

    /**
     * Returns filtered ticket list for admin views.
     *
     * @param status optional status
     * @param priority optional priority
     * @param facilityId optional facility id
     * @param assignedToId optional assignee id
     * @return filtered tickets
     */
    public List<TicketResponse> getAllTickets(
            TicketStatus status,
            TicketPriority priority,
            UUID facilityId,
            UUID assignedToId,
            Boolean assigned
    ) {
        List<TicketStatus> statuses = status == null
                ? Arrays.asList(TicketStatus.values())
                : List.of(status);
        return ticketRepository.findWithFilters(statuses, priority, facilityId, assignedToId, assigned).stream()
                .map(t -> toTicketResponse(t, null))
                .collect(Collectors.toList());
    }

    /**
     * Returns ticket details if current user is reporter, assigned technician, or admin.
     *
     * @param id ticket id
     * @param userEmail requester email
     * @return ticket response
     */
    public TicketResponse getTicketById(UUID id, String userEmail) {
        Ticket ticket = findTicketById(id);
        User user = findUserByEmail(userEmail);
        return toTicketResponse(ticket, user);
    }

    /**
     * Uploads a ticket image to {@code file.upload.dir} (default {@code uploads/smartcampus/tickets})
     * and stores an API-relative {@code fileUrl} for retrieval via {@link com.nelli.smart_campus_operations_hub.controller.FileController}.
     *
     * @param ticketId ticket id
     * @param file multipart file
     * @param userEmail uploader email
     * @return attachment response
     */
    @Transactional
    public AttachmentResponse uploadAttachment(UUID ticketId, MultipartFile file, String userEmail) {
        Ticket ticket = findTicketById(ticketId);
        User user = findUserByEmail(userEmail);
        validateTicketAttachmentPermission(ticket, user);

        long count = ticketAttachmentRepository.countByTicketId(ticketId);
        if (count >= AppConstants.MAX_IMAGES_PER_TICKET) {
            throw new IllegalStateException("Maximum 3 images allowed");
        }
        ValidationUtil.validateImageFile(file);
        FileStorageService.FileUploadResponse stored = fileStorageService.uploadImage(file, ticketId.toString());

        TicketAttachment attachment = TicketAttachment.builder()
                .ticket(ticket)
                .uploadedBy(user)
                .fileName(stored.getFileName())
                .fileUrl(stored.getFileUrl())
                .cloudinaryPublicId(stored.getStoredFileName())
                .fileType(stored.getFileType())
                .fileSize(stored.getFileSize())
                .build();
        attachment = ticketAttachmentRepository.save(attachment);
        log.info("Ticket attachment uploaded. ticketId={}, attachmentId={}, userId={}", ticket.getId(), attachment.getId(), user.getId());
        return toAttachmentResponse(attachment);
    }

    /**
     * Deletes one attachment if current user is uploader or admin.
     *
     * @param attachmentId attachment id
     * @param userEmail requester email
     */
    @Transactional
    public void deleteAttachment(UUID attachmentId, String userEmail) {
        TicketAttachment attachment = ticketAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("TicketAttachment", "id", attachmentId));
        User user = findUserByEmail(userEmail);
        boolean canDelete = attachment.getUploadedBy().getId().equals(user.getId()) || user.getRole() == Role.ADMIN;
        if (!canDelete) {
            throw new UnauthorizedException("Not authorized to delete this attachment.");
        }
        fileStorageService.deleteImage(
                attachment.getTicket().getId().toString(),
                attachment.getCloudinaryPublicId()
        );
        ticketAttachmentRepository.delete(attachment);
        log.info("Ticket attachment deleted. attachmentId={}, userId={}", attachmentId, user.getId());
    }

    /**
     * Returns all attachments for a ticket.
     *
     * @param ticketId ticket id
     * @return attachment responses
     */
    public List<AttachmentResponse> getTicketAttachments(UUID ticketId) {
        findTicketById(ticketId);
        return ticketAttachmentRepository.findByTicketId(ticketId).stream()
                .map(this::toAttachmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Adds a new comment to ticket.
     *
     * @param ticketId ticket id
     * @param request comment payload
     * @param userEmail commenter email
     * @return comment response
     */
    @Transactional
    public CommentResponse addComment(UUID ticketId, CommentRequest request, String userEmail) {
        Ticket ticket = findTicketById(ticketId);
        User user = findUserByEmail(userEmail);

        if (ticket.getStatus() != TicketStatus.OPEN && ticket.getStatus() != TicketStatus.IN_PROGRESS) {
            throw new IllegalStateException("Comments are only allowed on open or in-progress tickets.");
        }

        Comment comment = Comment.builder()
                .ticket(ticket)
                .user(user)
                .content(request.getContent())
                .build();
        comment = commentRepository.save(comment);
        notificationService.sendNewCommentNotification(comment);

        log.info("Ticket comment added. commentId={}, ticketId={}, userId={}", comment.getId(), ticket.getId(), user.getId());
        return toCommentResponse(comment, user);
    }

    /**
     * Updates comment content. Only owner can edit.
     *
     * @param commentId comment id
     * @param request update payload
     * @param userEmail requester email
     * @return updated comment
     */
    @Transactional
    public CommentResponse updateComment(UUID commentId, CommentRequest request, String userEmail) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));
        User user = findUserByEmail(userEmail);
        if (!comment.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("Only comment owner can edit this comment.");
        }
        comment.setContent(request.getContent());
        comment.setEditedAt(LocalDateTime.now());
        comment = commentRepository.save(comment);
        log.info("Ticket comment updated. commentId={}, userId={}", commentId, user.getId());
        return toCommentResponse(comment, user);
    }

    /**
     * Deletes comment if owner or admin.
     *
     * @param commentId comment id
     * @param userEmail requester email
     */
    @Transactional
    public void deleteComment(UUID commentId, String userEmail) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment", "id", commentId));
        User user = findUserByEmail(userEmail);
        boolean canDelete = comment.getUser().getId().equals(user.getId()) || user.getRole() == Role.ADMIN;
        if (!canDelete) {
            throw new UnauthorizedException("Not authorized to delete this comment.");
        }
        commentRepository.delete(comment);
        log.info("Ticket comment deleted. commentId={}, userId={}", commentId, user.getId());
    }

    /**
     * Returns comments for a ticket ordered by creation time.
     *
     * @param ticketId ticket id
     * @return comment list
     */
    public List<CommentResponse> getTicketComments(UUID ticketId) {
        findTicketById(ticketId);
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream()
                .map(c -> CommentResponse.builder()
                        .id(c.getId())
                        .ticketId(c.getTicket().getId())
                        .userId(c.getUser().getId())
                        .userName(c.getUser().getName())
                        .content(c.getContent())
                        .createdAt(c.getCreatedAt())
                        .editedAt(c.getEditedAt())
                        .isEdited(c.isEdited())
                        .canEdit(false)
                        .canDelete(false)
                        .build())
                .collect(Collectors.toList());
    }

    private void addTicketHateoasLinks(TicketResponse response, User currentUser) {
        Map<String, Object> links = response.get_links();
        if (links == null) {
            links = new HashMap<>();
            response.set_links(links);
        }
        links.put("self", "/api/v1/tickets/" + response.getId());
        links.put("facility", "/api/v1/facilities/" + response.getFacilityId());
        links.put("attachments", "/api/v1/tickets/" + response.getId() + "/attachments");
        links.put("comments", "/api/v1/tickets/" + response.getId() + "/comments");
        if (currentUser == null) {
            return;
        }
        boolean isReporter = currentUser.getId().equals(response.getReportedById());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isTechnician = currentUser.getRole() == Role.TECHNICIAN;
        if (isReporter && response.getStatus() == TicketStatus.OPEN) {
            links.put("update", "/api/v1/tickets/" + response.getId());
        }
        if (isAdmin || isTechnician) {
            links.put("statusUpdate", "/api/v1/tickets/" + response.getId() + "/status");
        }
        if (isAdmin) {
            links.put("assign", "/api/v1/tickets/" + response.getId() + "/assign");
        }
    }

    private String generateTicketNumber() {
        int year = Year.now().getValue();
        String prefix = AppConstants.TICKET_NUMBER_PREFIX + "-" + year + "-";
        long sequence = ticketRepository.findAll().stream()
                .map(Ticket::getTicketNumber)
                .filter(n -> n != null && n.startsWith(prefix))
                .count() + 1;
        return String.format("%s%06d", prefix, sequence);
    }

    private void notifyTicketStakeholders(Ticket ticket, NotificationType type, String message) {
        if (type == NotificationType.TICKET_STATUS_CHANGED) {
            notificationService.sendTicketStatusChangedNotification(ticket, ticket.getStatus(), ticket.getStatus());
        }
        log.debug("Stakeholders notified. ticketId={}, type={}, message={}", ticket.getId(), type, message);
    }

    private TicketResponse toTicketResponse(Ticket ticket, User currentUser) {
        TicketResponse response = TicketResponse.builder()
                .id(ticket.getId())
                .ticketNumber(ticket.getTicketNumber())
                .facilityId(ticket.getFacility() != null ? ticket.getFacility().getId() : null)
                .facilityName(ticket.getFacility() != null ? ticket.getFacility().getName() : null)
                .category(ticket.getCategory())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .description(ticket.getDescription())
                .resolutionNotes(ticket.getResolutionNotes())
                .reportedById(ticket.getReportedBy() != null ? ticket.getReportedBy().getId() : null)
                .reportedByName(ticket.getReportedBy() != null ? ticket.getReportedBy().getName() : null)
                .reportedByEmail(ticket.getReportedBy() != null ? ticket.getReportedBy().getEmail() : null)
                .assignedToId(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null)
                .assignedToName(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getName() : null)
                .contactEmail(ticket.getContactEmail())
                .contactPhone(ticket.getContactPhone())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .resolvedAt(ticket.getResolvedAt())
                .closedAt(ticket.getClosedAt())
                .responseTimeHours(ticket.getResponseTimeHours())
                .resolutionTimeHours(ticket.getResolutionTimeHours())
                .build();
        List<AttachmentResponse> attachments = ticketAttachmentRepository.findByTicketId(ticket.getId()).stream()
                .map(this::toAttachmentResponse)
                .collect(Collectors.toList());
        response.setAttachments(attachments);
        response.setCommentsCount((int) commentRepository.countByTicketId(ticket.getId()));
        addTicketHateoasLinks(response, currentUser);
        return response;
    }

    private AttachmentResponse toAttachmentResponse(TicketAttachment attachment) {
        return AttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .fileUrl(attachment.getFileUrl())
                .fileType(attachment.getFileType())
                .fileSize(attachment.getFileSize())
                .uploadedAt(attachment.getCreatedAt())
                .uploadedByName(attachment.getUploadedBy().getName())
                .build();
    }

    private CommentResponse toCommentResponse(Comment comment, User currentUser) {
        boolean canEdit = currentUser.getId().equals(comment.getUser().getId());
        boolean canDelete = canEdit || currentUser.getRole() == Role.ADMIN;
        return CommentResponse.builder()
                .id(comment.getId())
                .ticketId(comment.getTicket().getId())
                .userId(comment.getUser().getId())
                .userName(comment.getUser().getName())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .editedAt(comment.getEditedAt())
                .isEdited(comment.isEdited())
                .canEdit(canEdit)
                .canDelete(canDelete)
                .build();
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
    }

    private Facility findFacilityById(UUID id) {
        return facilityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Facility", "id", id));
    }

    private Ticket findTicketById(UUID id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket", "id", id));
    }

    private void validateTicketVisibility(Ticket ticket, User user) {
        boolean isReporter = ticket.getReportedBy().getId().equals(user.getId());
        boolean isAssigned = ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        if (!isReporter && !isAssigned && !isAdmin) {
            throw new UnauthorizedException("Not authorized to view this ticket.");
        }
    }

    private void validateTicketAttachmentPermission(Ticket ticket, User user) {
        boolean isReporter = ticket.getReportedBy().getId().equals(user.getId());
        boolean isAssigned = ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        if (!isReporter && !isAssigned && !isAdmin) {
            throw new UnauthorizedException("Not authorized to manage attachments for this ticket.");
        }
    }
}
