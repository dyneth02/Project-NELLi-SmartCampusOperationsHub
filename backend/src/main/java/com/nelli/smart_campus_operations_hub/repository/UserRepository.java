package com.nelli.smart_campus_operations_hub.repository;

import com.nelli.smart_campus_operations_hub.enums.AuthProvider;
import com.nelli.smart_campus_operations_hub.enums.Role;
import com.nelli.smart_campus_operations_hub.model.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Data access operations for {@link User} accounts.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Finds a user by email for authentication and account lookup flows.
     *
     * @param email user email address
     * @return matching user when present
     */
    Optional<User> findByEmail(String email);

    /**
     * Checks whether an account already exists for the given email.
     *
     * @param email user email address
     * @return {@code true} when email is already registered
     */
    boolean existsByEmail(String email);

    /**
     * Finds an OAuth user by provider-specific user id and authentication provider.
     *
     * @param oauthId provider user id
     * @param authProvider authentication provider
     * @return matching OAuth user when present
     */
    Optional<User> findByOauthIdAndAuthProvider(String oauthId, AuthProvider authProvider);

    /**
     * Retrieves all users assigned to a specific role.
     *
     * @param role target role
     * @return users with the given role
     */
    List<User> findByRole(Role role);

    /**
     * Retrieves enabled users for a role, useful for role-targeted notifications.
     *
     * @param role target role
     * @return active users with the given role
     */
    @Query("SELECT u FROM User u WHERE u.role = :role AND u.enabled = true")
    List<User> findActiveUsersByRole(@Param("role") Role role);
}
