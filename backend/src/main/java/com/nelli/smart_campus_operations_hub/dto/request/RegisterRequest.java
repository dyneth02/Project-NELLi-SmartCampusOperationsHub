package com.nelli.smart_campus_operations_hub.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Registration payload.
 * Password must be at least 8 characters and include at least one uppercase letter,
 * one number, and one special character.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank
    @Email
    @Size(max = 100)
    private String email;

    @NotBlank
    @Size(min = 8, max = 100)
    @Pattern(
            regexp = "^(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$",
            message = "Password must include one uppercase letter, one number, and one special character."
    )
    private String password;

    @NotBlank
    @Size(max = 100)
    private String name;

    @Pattern(regexp = "^$|^\\+?[1-9]\\d{1,14}$", message = "Invalid phone format.")
    private String phone;
}
