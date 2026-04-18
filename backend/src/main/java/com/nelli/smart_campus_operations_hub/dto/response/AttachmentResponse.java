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
public class AttachmentResponse {

    private UUID id;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long fileSize;
    private LocalDateTime uploadedAt;
    private String uploadedByName;
}
