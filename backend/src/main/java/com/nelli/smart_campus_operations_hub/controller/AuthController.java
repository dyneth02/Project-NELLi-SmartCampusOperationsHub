package com.nelli.smart_campus_operations_hub.controller;

import com.nelli.smart_campus_operations_hub.dto.request.LoginRequest;
import com.nelli.smart_campus_operations_hub.dto.request.RefreshTokenRequest;
import com.nelli.smart_campus_operations_hub.dto.request.RegisterRequest;
import com.nelli.smart_campus_operations_hub.dto.response.ApiResponse;
import com.nelli.smart_campus_operations_hub.dto.response.AuthResponse;
import com.nelli.smart_campus_operations_hub.dto.response.UserResponse;
import com.nelli.smart_campus_operations_hub.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Handles authentication lifecycle endpoints including registration, login, OAuth exchange,
 * token refresh, and current-user resolution.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register new user", description = "Create a new user account with email and password")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "User registered successfully")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Email already exists")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Registration attempt for email={}", request.getEmail());
        try {
            AuthResponse response = authService.register(request);
            log.info("Registration success for email={}", request.getEmail());
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response, "User registered successfully"));
        } catch (RuntimeException ex) {
            log.warn("Registration failed for email={}", request.getEmail());
            throw ex;
        }
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Login successful")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Invalid credentials")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login attempt for email={}", request.getEmail());
        try {
            AuthResponse response = authService.login(request);
            log.info("Login success for email={}", request.getEmail());
            return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
        } catch (RuntimeException ex) {
            log.warn("Login failed for email={}", request.getEmail());
            throw ex;
        }
    }

    @PostMapping("/google")
    @Operation(summary = "Authenticate with Google OAuth2", description = "Exchange Google OAuth ID token for JWT")
    public ResponseEntity<ApiResponse<AuthResponse>> authenticateWithGoogle(@RequestBody Map<String, String> payload) {
        String idToken = payload.get("idToken");
        if (idToken == null) {
            idToken = payload.get("token");
        }
        if (idToken == null || idToken.isBlank()) {
            log.warn("Google auth failed: missing idToken in request body");
            throw new IllegalArgumentException("Missing Google ID token");
        }
        log.info("Google auth attempt with idToken");
        try {
            AuthResponse response = authService.authenticateWithGoogleToken(idToken);
            log.info("Google auth success");
            return ResponseEntity.ok(ApiResponse.success(response, "Google authentication successful"));
        } catch (RuntimeException ex) {
            log.warn("Google auth failed: {}", ex.getMessage());
            throw ex;
        }
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh access token", description = "Get new access token using refresh token")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Token refreshed")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Invalid refresh token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        log.info("Refresh token attempt");
        try {
            AuthResponse response = authService.refreshToken(request);
            log.info("Refresh token success");
            return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed"));
        } catch (RuntimeException ex) {
            log.warn("Refresh token failed");
            throw ex;
        }
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user details", description = "Returns authenticated user information")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "User details retrieved")
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Not authenticated")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        UserResponse response = authService.getCurrentUser(email);
        log.info("Current user fetched for email={}", email);
        return ResponseEntity.ok(ApiResponse.success(response, "Current user retrieved"));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Invalidate current session")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> logout() {
        log.info("Logout endpoint called");
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", "Logout successful"));
    }
}
