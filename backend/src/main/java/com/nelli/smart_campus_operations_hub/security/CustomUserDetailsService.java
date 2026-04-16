package com.nelli.smart_campus_operations_hub.security;

import com.nelli.smart_campus_operations_hub.model.User;
import com.nelli.smart_campus_operations_hub.repository.UserRepository;
import java.util.Collections;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Bridges application {@link User} entities to Spring Security {@link UserDetails}.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        log.info("Authentication attempt for email: {}", email);
        User user = userRepository.findByEmail(email).orElseThrow(() -> {
            log.warn("Authentication failed, user not found for email: {}", email);
            return new UsernameNotFoundException("User not found with email: " + email);
        });
        log.info("Authentication principal loaded successfully for email: {}", email);
        return buildUserDetails(user);
    }

    /**
     * Converts application user model into Spring Security user details.
     *
     * @param user application user entity
     * @return Spring Security user details
     */
    public UserDetails buildUserDetails(User user) {
        GrantedAuthority authority =
                new SimpleGrantedAuthority("ROLE_" + user.getRole().name());
        String password = user.getPasswordHash() == null ? "" : user.getPasswordHash();
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(password)
                .authorities(Collections.singleton(authority))
                .accountExpired(false)
                .accountLocked(user.isAccountLocked())
                .credentialsExpired(false)
                .disabled(!user.isEnabled())
                .build();
    }
}
