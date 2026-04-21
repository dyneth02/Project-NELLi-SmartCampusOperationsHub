package com.nelli.smart_campus_operations_hub.controller;

import com.nelli.smart_campus_operations_hub.exception.FileStorageException;
import com.nelli.smart_campus_operations_hub.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves uploaded ticket image files through a controlled API path.
 *
 * <p>Security notes:
 * validates UUID-like ticket id and sanitizes requested filename before resolving file resources.
 * Endpoint is intentionally public for attachment rendering but can be restricted later if needed.
 */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    private final FileStorageService fileStorageService;

    @GetMapping("/tickets/{ticketId}/{fileName:.+}")
    @Operation(summary = "Download ticket attachment", description = "Retrieve uploaded ticket image file")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "File found")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "File not found")
    public ResponseEntity<Resource> downloadFile(
            @PathVariable String ticketId,
            @PathVariable String fileName,
            HttpServletRequest request
    ) {
        try {
            UUID.fromString(ticketId);
            if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
                throw new FileStorageException("Invalid file name");
            }

            Resource resource = fileStorageService.loadFileAsResource(ticketId, fileName);
            String contentType = request.getServletContext().getMimeType(resource.getFilename());
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            log.info("File access success. ticketId={}, fileName={}", ticketId, fileName);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (IllegalArgumentException | FileStorageException ex) {
            log.warn("File access failed. ticketId={}, fileName={}", ticketId, fileName);
            return ResponseEntity.notFound().build();
        }
    }
}
