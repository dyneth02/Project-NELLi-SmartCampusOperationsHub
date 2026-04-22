package com.nelli.smart_campus_operations_hub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * JWT request filter that extracts bearer token, validates it, resolves user identity,
 * and initializes SecurityContext when token is trusted.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService customUserDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String authorizationHeader = request.getHeader("Authorization");
            String token = null;
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                token = authorizationHeader.substring(7);
            }

            if (token != null && !token.isBlank()) {
                log.debug("JWT validation attempt for path={}", request.getRequestURI());
                boolean valid = jwtTokenProvider.validateToken(token);
                if (valid) {
                    String email = jwtTokenProvider.getEmailFromToken(token);
                    if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities()
                                );
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.debug("JWT validation success for email={}", email);
                    }
                } else {
                    log.debug("JWT validation failed for path={}", request.getRequestURI());
                }
            }
        } catch (UsernameNotFoundException ex) {
            log.error("JWT auth failed, user not found: {}", ex.getMessage());
        } catch (Exception ex) {
            log.error("JWT authentication filter error: {}", ex.getMessage(), ex);
        }

        filterChain.doFilter(request, response);
    }
}
