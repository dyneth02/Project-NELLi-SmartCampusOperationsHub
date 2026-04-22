package com.nelli.smart_campus_operations_hub.security;

import com.nelli.smart_campus_operations_hub.enums.AuthProvider;
import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.model.NotificationPreferences;
import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.NotificationPreferencesRepository;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/**
 * Handles successful OAuth2 authentication by provisioning/updating user state,
 * issuing JWT credentials and redirecting client to frontend callback route.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final NotificationPreferencesRepository notificationPreferencesRepository;

    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String oauthId = oauth2User.getAttribute("sub");

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = User.builder()
                    .email(email)
                    .name(name)
                    .oauthId(oauthId)
                    .authProvider(AuthProvider.GOOGLE)
                    .role(Role.USER)
                    .enabled(true)
                    .passwordHash(null)
                    .build();
            user = userRepository.save(user);
            NotificationPreferences preferences = NotificationPreferences.builder()
                    .user(user)
                    .bookingUpdates(true)
                    .ticketUpdates(true)
                    .commentNotifications(true)
                    .emailNotifications(true)
                    .weeklyDigest(true)
                    .build();
            notificationPreferencesRepository.save(preferences);
        } else {
            boolean changed = false;
            if (name != null && !name.equals(user.getName())) {
                user.setName(name);
                changed = true;
            }
            if (oauthId != null && !oauthId.equals(user.getOauthId())) {
                user.setOauthId(oauthId);
                changed = true;
            }
            if (user.getAuthProvider() != AuthProvider.GOOGLE) {
                user.setAuthProvider(AuthProvider.GOOGLE);
                changed = true;
            }
            if (changed) {
                user = userRepository.save(user);
            }
        }

        String accessToken = jwtTokenProvider.generateAccessToken(email, user.getRole());
        String refreshToken = jwtTokenProvider.generateRefreshToken(email);

        String redirectUrl = frontendUrl
                + "/auth/callback?token=" + URLEncoder.encode(accessToken, StandardCharsets.UTF_8)
                + "&refreshToken=" + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8);

        log.info("OAuth2 authentication success for email={}", email);
        response.sendRedirect(redirectUrl);
    }
}
