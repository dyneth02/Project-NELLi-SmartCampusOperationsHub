package com.nelli.smart_campus_operations_hub.dto.response;

import com.nelli.smart_campus_operations_hub.enums.AuthProvider;
import com.nelli.smart_campus_operations_hub.enums.Role;
import java.time.LocalDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private UUID id;
    private String email;
    private String name;
    private String phone;
    private Role role;
    private AuthProvider authProvider;
    private LocalDateTime createdAt;
    private String status;
}
