package com.nelli.smart_campus_operations_hub.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when an entity is asked to move between unsupported lifecycle states.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidStateTransitionException extends RuntimeException {

    public InvalidStateTransitionException(String entityType, String currentState, String targetState) {
        super("Cannot transition " + entityType + " from " + currentState + " to " + targetState);
    }
}
