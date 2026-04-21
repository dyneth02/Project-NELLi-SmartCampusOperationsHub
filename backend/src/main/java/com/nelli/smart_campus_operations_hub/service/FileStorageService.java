package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.exception.FileStorageException;
import com.nelli.smart_campus_operations_hub.exception.FileUploadException;
import com.nelli.smart_campus_operations_hub.util.ValidationUtil;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Manages local ticket attachment files on disk.
 *
 * <p>Storage strategy:
 * files are persisted under a configurable upload root using ticket-scoped subdirectories
 * (`{uploadRoot}/{ticketId}/...`) to keep ownership and cleanup operations simple.
 *
 * <p>Security note:
 * files are stored outside the web root and should be exposed only through a controlled API endpoint
 * that performs access checks before streaming content.
 */
@Service
@Slf4j
public class FileStorageService {

    @Value("${file.upload.dir:uploads/smartcampus/tickets}")
    private String uploadDir;

    private Path fileStorageLocation;

    @PostConstruct
    public void init() {
        try {
            this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(this.fileStorageLocation);
            log.info("File storage initialized at: {}", this.fileStorageLocation);
        } catch (IOException ex) {
            throw new RuntimeException("Could not initialize file storage directory: " + uploadDir, ex);
        }
    }

    public FileUploadResponse uploadImage(MultipartFile file, String ticketId) {
        ValidationUtil.validateImageFile(file);

        String originalFilename = file.getOriginalFilename() == null ? "file" : file.getOriginalFilename();
        String sanitizedOriginal = sanitizeFilename(originalFilename);
        String uniqueFilename = UUID.randomUUID() + "_" + sanitizedOriginal;

        try {
            Path ticketDirectory = fileStorageLocation.resolve(ticketId).normalize();
            Files.createDirectories(ticketDirectory);

            Path targetLocation = ticketDirectory.resolve(uniqueFilename).normalize();
            if (!targetLocation.startsWith(ticketDirectory)) {
                throw new FileUploadException("Invalid file path.");
            }

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/api/v1/files/tickets/" + ticketId + "/" + uniqueFilename;
            String relativePath = ticketId + "/" + uniqueFilename;

            log.info("Ticket image uploaded. ticketId={}, storedFileName={}", ticketId, uniqueFilename);

            return FileUploadResponse.builder()
                    .fileName(originalFilename)
                    .storedFileName(uniqueFilename)
                    .filePath(relativePath)
                    .fileUrl(fileUrl)
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .build();
        } catch (IOException ex) {
            throw new FileUploadException("Failed to store file: " + originalFilename, ex);
        }
    }

    public void deleteImage(String ticketId, String storedFileName) {
        Path filePath = fileStorageLocation.resolve(ticketId).resolve(storedFileName).normalize();
        try {
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Ticket image deleted. ticketId={}, storedFileName={}", ticketId, storedFileName);
            }
        } catch (IOException ex) {
            log.error("Best-effort delete failed. ticketId={}, storedFileName={}", ticketId, storedFileName, ex);
        }
    }

    public Resource loadFileAsResource(String ticketId, String fileName) {
        try {
            Path filePath = fileStorageLocation.resolve(ticketId).resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new FileStorageException("File not found or not readable: " + fileName);
        } catch (MalformedURLException ex) {
            throw new FileStorageException("File not found: " + fileName, ex);
        }
    }

    private String sanitizeFilename(String filename) {
        String sanitized = filename.replace("..", "");
        sanitized = sanitized.replace("\\", "_").replace("/", "_");
        sanitized = sanitized.replace(" ", "_");
        sanitized = sanitized.replaceAll("[^a-zA-Z0-9._-]", "");
        return sanitized;
    }

    @Data
    @AllArgsConstructor
    @Builder
    public static class FileUploadResponse {
        private String fileName;
        private String storedFileName;
        private String filePath;
        private String fileUrl;
        private String fileType;
        private Long fileSize;
    }
}
