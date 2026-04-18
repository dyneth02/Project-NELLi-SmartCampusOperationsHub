package com.nelli.smart_campus_operations_hub.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentResponse {

    private UUID id;
    private UUID ticketId;
    private UUID userId;
    private String userName;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private boolean isEdited;
    private boolean canEdit;
    private boolean canDelete;
}
