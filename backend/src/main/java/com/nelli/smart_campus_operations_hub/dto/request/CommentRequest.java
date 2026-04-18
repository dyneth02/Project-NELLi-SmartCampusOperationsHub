package com.nelli.smart_campus_operations_hub.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommentRequest {

    @NotBlank
    @Size(min = 1, max = 2000)
    private String content;
}
