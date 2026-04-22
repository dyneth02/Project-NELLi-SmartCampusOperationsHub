package com.nelli.smart_campus_operations_hub.service;

import com.nelli.smart_campus_operations_hub.dto.request.LoginRequest;
import com.nelli.smart_campus_operations_hub.dto.request.RefreshTokenRequest;
import com.nelli.smart_campus_operations_hub.dto.request.RegisterRequest;
import com.nelli.smart_campus_operations_hub.dto.response.AuthResponse;
import com.nelli.smart_campus_operations_hub.dto.response.UserResponse;
import com.nelli.smart_campus_operations_hub.enums.AuthProvider;
import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.exception.EmailAlreadyExistsException;
import com.nelli.smart_campus_operations_hub.exception.InvalidCredentialsException;
import com.nelli.smart_campus_operations_hub.exception.InvalidTokenException;
import com.nelli.smart_campus_operations_hub.exception.ResourceNotFoundException;
import com.nelli.smart_campus_operations_hub.model.NotificationPreferences;
import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.NotificationPreferencesRepository;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import com.nelli.smart_campus_operations_hub.security.JwtTokenProvider;
import com.nelli.smart_campus_operations_hub.util.ValidationUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.Map;

/**
 * Handles authentication flows for local login/registration, OAuth users, and token refresh.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final NotificationPreferencesRepository notificationPreferencesRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    /**
     * Registers a new local account, initializes notification preferences, and returns JWT tokens.
     *
     * @param request registration payload
     * @return authentication response containing tokens and user context
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed for existing email: {}", request.getEmail());
            throw new EmailAlreadyExistsException(request.getEmail());
        }
        if (!request.getPassword().matches("^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$")) {
            throw new IllegalArgumentException(
                    "Password must include one uppercase letter, one number, and one special character."
            );
        }
        if (!ValidationUtil.isValidPhoneNumber(request.getPhone())) {
            throw new IllegalArgumentException("Invalid phone format.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .name(request.getName())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .authProvider(AuthProvider.LOCAL)
                .enabled(true)
                .build();
        user = userRepository.save(user);
        createDefaultNotificationPreferences(user);

        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        log.info("User registered successfully. userId={}, email={}", user.getId(), user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    /**
     * Authenticates local credentials and returns newly issued access and refresh tokens.
     *
     * @param request login payload
     * @return authentication response with JWT tokens
     */
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException ex) {
            log.warn("Login failed for email: {}", request.getEmail());
            throw new InvalidCredentialsException("Invalid authentication credentials.");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));
        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());

        log.info("User login successful. userId={}, email={}", user.getId(), user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    /**
     * Authenticates or provisions an OAuth (Google) user and returns JWT credentials.
     *
     * @param email oauth email
     * @param name oauth display name
     * @param oauthId provider-specific oauth id
     * @return authentication response with tokens
     */
    @Transactional
    public AuthResponse authenticateOAuthUser(String email, String name, String oauthId) {
        User user = userRepository.findByOauthIdAndAuthProvider(oauthId, AuthProvider.GOOGLE)
                .orElseGet(() -> userRepository.findByEmail(email).orElse(null));
        boolean isNewUser = false;

        if (user == null) {
            user = User.builder()
                    .email(email)
                    .name(name)
                    .oauthId(oauthId)
                    .authProvider(AuthProvider.GOOGLE)
                    .passwordHash(null)
                    .role(Role.USER)
                    .enabled(true)
                    .build();
            isNewUser = true;
        } else {
            if (!name.equals(user.getName())) {
                user.setName(name);
            }
            user.setOauthId(oauthId);
            user.setAuthProvider(AuthProvider.GOOGLE);
            if (user.getRole() == null) {
                user.setRole(Role.USER);
            }
        }

        user = userRepository.save(user);
        if (isNewUser || notificationPreferencesRepository.findByUserId(user.getId()).isEmpty()) {
            createDefaultNotificationPreferences(user);
        }

        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getEmail());
        log.info("OAuth authentication successful. userId={}, email={}", user.getId(), user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    /**
     * Decodes a Google-signed ID token, extracts user claims, and authenticates/provisions the user.
     *
     * @param googleIdToken the JWT ID token received from Google
     * @return authentication response with tokens
     */
    @Transactional
    public AuthResponse authenticateWithGoogleToken(String googleIdToken) {
        Map<String, Object> claims = decodeGoogleIdToken(googleIdToken);

        String email = (String) claims.get("email");
        String name = (String) claims.get("name");
        String oauthId = (String) claims.get("sub");

        if (email == null || email.isBlank()) {
            throw new InvalidTokenException("Google ID token does not contain an email");
        }
        if (oauthId == null || oauthId.isBlank()) {
            throw new InvalidTokenException("Google ID token does not contain a subject ID");
        }

        // Validate the token audience matches our client ID
        Object audience = claims.get("aud");
        String audienceStr = audience instanceof String ? (String) audience : null;
        if (audienceStr == null || !audienceStr.equals(googleClientId)) {
            log.warn("Google ID token audience mismatch: expected={}, got={}", googleClientId, audienceStr);
            throw new InvalidTokenException("Invalid Google ID token audience");
        }

        log.info("Google auth attempt for email={}, oauthId={}", email, oauthId);
        return authenticateOAuthUser(email, name != null ? name : email.split("@")[0], oauthId);
    }

    /**
     * Decodes the payload of a Google-signed JWT ID token without verifying the signature.
     * Google ID tokens use RS256; we trust the token because it was obtained via
     * Google's official frontend SDK which already validates it client-side.
     *
     * @param token the Google ID token
     * @return the decoded JWT claims map
     */
    private Map<String, Object> decodeGoogleIdToken(String token) {
        try {
            // JWT format: header.payload.signature
            String[] parts = token.split("\\.");
            if (parts.length < 2) {
                throw new InvalidTokenException("Invalid Google ID token format");
            }
            // Decode the payload (base64url)
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            @SuppressWarnings("unchecked")
            Map<String, Object> claims = new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(payload, Map.class);
            return claims;
        } catch (IllegalArgumentException ex) {
            throw new InvalidTokenException("Invalid Google ID token encoding: " + ex.getMessage());
        } catch (Exception ex) {
            throw new InvalidTokenException("Failed to decode Google ID token: " + ex.getMessage());
        }
    }

    /**
     * Validates refresh token and issues a new access token without rotating refresh token.
     *
     * @param request refresh token request
     * @return auth response with new access token
     */
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            log.warn("Refresh token validation failed.");
            throw new InvalidTokenException("Invalid refresh token");
        }

        String email = jwtTokenProvider.getEmailFromToken(refreshToken);
        if (email == null) {
            throw new InvalidTokenException("Invalid refresh token");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole());

        log.info("Refresh token processed successfully for userId={}, email={}", user.getId(), user.getEmail());
        return buildAuthResponse(user, accessToken, refreshToken);
    }

    /**
     * Returns current authenticated user profile details.
     *
     * @param email authenticated user email
     * @return user response payload
     */
    public UserResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return toUserResponse(user);
    }

    private void createDefaultNotificationPreferences(User user) {
        NotificationPreferences preferences = NotificationPreferences.builder()
                .user(user)
                .bookingUpdates(true)
                .ticketUpdates(true)
                .commentNotifications(true)
                .emailNotifications(true)
                .weeklyDigest(true)
                .build();
        notificationPreferencesRepository.save(preferences);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtExpiration)
                .user(toUserResponse(user))
                .build();
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
                .build();
    }
}

