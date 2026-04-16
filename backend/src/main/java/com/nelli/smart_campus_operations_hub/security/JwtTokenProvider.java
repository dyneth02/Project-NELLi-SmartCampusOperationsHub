package com.nelli.smart_campus_operations_hub.security;

import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import io.jsonwebtoken.security.WeakKeyException;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Objects;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Provides JWT generation, validation, and claims extraction operations for authentication flows.
 */
@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private Long jwtExpiration;

    @Value("${jwt.refresh-expiration}")
    private Long jwtRefreshExpiration;

    /**
     * Generates a signed access token from an authenticated Spring Security principal.
     *
     * @param authentication authenticated security context
     * @return signed JWT access token string
     */
    public String generateAccessToken(Authentication authentication) {
        Object principal = authentication.getPrincipal();
        String email;
        Role role;

        if (principal instanceof User user) {
            email = user.getEmail();
            role = user.getRole();
        } else if (principal instanceof UserDetails userDetails) {
            email = userDetails.getUsername();
            role = extractRoleFromAuthorities(userDetails);
        } else {
            email = Objects.toString(principal, null);
            role = Role.USER;
        }
        return generateAccessToken(email, role);
    }

    /**
     * Generates a signed access token using explicit OAuth2 flow parameters.
     *
     * @param email authenticated user email
     * @param role authenticated user role
     * @return signed JWT access token string
     */
    public String generateAccessToken(String email, Role role) {
        Date issuedAt = new Date();
        Date expiration = new Date(issuedAt.getTime() + jwtExpiration);
        return Jwts.builder()
                .subject(email)
                .claim("role", role.name())
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith((SecretKey) getSigningKey(), Jwts.SIG.HS512)
                .compact();
    }

    /**
     * Generates a signed refresh token with minimal payload.
     *
     * @param email authenticated user email
     * @return signed JWT refresh token string
     */
    public String generateRefreshToken(String email) {
        Date issuedAt = new Date();
        Date expiration = new Date(issuedAt.getTime() + jwtRefreshExpiration);
        return Jwts.builder()
                .subject(email)
                .issuedAt(issuedAt)
                .expiration(expiration)
                .signWith((SecretKey) getSigningKey(), Jwts.SIG.HS512)
                .compact();
    }

    /**
     * Validates a JWT token signature, structure, and expiration.
     *
     * @param token token string to validate
     * @return {@code true} when token is valid and trusted
     */
    public boolean validateToken(String token) {
        try {
            getClaimsFromToken(token);
            return true;
        } catch (ExpiredJwtException ex) {
            log.warn("JWT token expired: {}", ex.getMessage());
        } catch (MalformedJwtException ex) {
            log.warn("Malformed JWT token: {}", ex.getMessage());
        } catch (UnsupportedJwtException ex) {
            log.warn("Unsupported JWT token: {}", ex.getMessage());
        } catch (SecurityException ex) {
            log.warn("Invalid JWT signature: {}", ex.getMessage());
        } catch (IllegalArgumentException ex) {
            log.warn("JWT token compact string is empty or invalid.");
        } catch (JwtTokenException ex) {
            log.warn("JWT validation error: {}", ex.getMessage());
        }
        return false;
    }

    /**
     * Extracts email subject from a JWT token.
     *
     * @param token token string
     * @return email subject or {@code null} when token is invalid
     */
    public String getEmailFromToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            return claims.getSubject();
        } catch (RuntimeException ex) {
            log.warn("Failed to extract email from token: {}", ex.getMessage());
            return null;
        }
    }

    /**
     * Parses and returns all JWT claims from a token.
     *
     * @param token token string
     * @return all parsed claims
     */
    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Creates the cryptographic signing key from configured secret text.
     *
     * @return HMAC signing key
     */
    private Key getSigningKey() {
        try {
            return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        } catch (WeakKeyException ex) {
            throw new JwtTokenException("JWT secret key is too weak for HS512.", ex);
        }
    }

    private Role extractRoleFromAuthorities(UserDetails userDetails) {
        for (GrantedAuthority authority : userDetails.getAuthorities()) {
            String value = authority.getAuthority();
            if (value != null && value.startsWith("ROLE_")) {
                return Role.valueOf(value.substring("ROLE_".length()));
            }
        }
        return Role.USER;
    }

    private static class JwtTokenException extends RuntimeException {
        private JwtTokenException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
