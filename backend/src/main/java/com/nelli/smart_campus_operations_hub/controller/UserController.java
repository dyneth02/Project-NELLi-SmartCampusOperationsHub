package com.nelli.smart_campus_operations_hub.controller;

import com.nelli.smart_campus_operations_hub.dto.response.ApiResponse;
import com.nelli.smart_campus_operations_hub.dto.response.UserResponse;
import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.exception.ResourceNotFoundException;
import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin-facing user management endpoints for role and account-status operations.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Get all users", description = "Admin only - List all users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsers() {
        List<UserResponse> users = userRepository.findAll().stream()
                .map(this::toUserResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(users, "Users retrieved"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID", description = "Admin only - View user details")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return ResponseEntity.ok(ApiResponse.success(toUserResponse(user), "User retrieved"));
    }

    @PatchMapping("/{id}/role")
    @Operation(summary = "Change user role", description = "Admin only - Update user's role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> changeUserRole(
            @PathVariable UUID id,
            @RequestBody Map<String, String> payload
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        String roleValue = payload.get("role");
        if (roleValue == null || roleValue.isBlank()) {
            throw new IllegalArgumentException("Role is required.");
        }
        Role role;
        try {
            role = Role.valueOf(roleValue.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid role: " + roleValue);
        }
        user.setRole(role);
        user = userRepository.save(user);
        log.info("User role changed. userId={}, role={}", id, role);
        return ResponseEntity.ok(ApiResponse.success(toUserResponse(user), "User role updated"));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Enable/disable user", description = "Admin only - Activate or deactivate user account")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> payload
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        Boolean enabled = payload.get("enabled");
        if (enabled == null) {
            throw new IllegalArgumentException("enabled flag is required.");
        }
        user.setEnabled(enabled);
        user = userRepository.save(user);
        log.info("User status updated. userId={}, enabled={}", id, enabled);
        return ResponseEntity.ok(ApiResponse.success(toUserResponse(user), "User status updated"));
    }

    @GetMapping("/technicians")
    @Operation(summary = "Get all technicians", description = "Get list of users with TECHNICIAN role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getTechnicians() {
        List<UserResponse> technicians = userRepository.findByRole(Role.TECHNICIAN).stream()
                .map(this::toUserResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(technicians, "Technicians retrieved"));
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .phone(user.getPhone())
                .role(user.getRole())
                .authProvider(user.getAuthProvider())
                .createdAt(user.getCreatedAt())
                .status(user.isEnabled() ? "ACTIVE" : "INACTIVE")
                .build();
    }
}

