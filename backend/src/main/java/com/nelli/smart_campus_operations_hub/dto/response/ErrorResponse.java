package com.nelli.smart_campus_operations_hub.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ErrorResponse {

    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private List<FieldError> errors;

    @Data
    @Builder
    public static class FieldError {
        private String field;
        private Object rejectedValue;
        private String message;
    }
}
