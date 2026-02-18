package com.somedomain.collab_editor.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import com.somedomain.collab_editor.common.exceptions.AppException;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiError> handleAppException(AppException ex) {
        log.warn("App error: {}", ex.getMessage());
        return new ResponseEntity<>(
            new ApiError(ex.getMessage(), ex.getStatus()),
            HttpStatus.valueOf(ex.getStatus())
        );
    }

    @ExceptionHandler(ExpiredJwtException.class)
    public ResponseEntity<ApiError> handleExpiredJwt(ExpiredJwtException ex) {
        log.warn("Expired JWT: {}", ex.getMessage());
        return new ResponseEntity<>(
            new ApiError("Token expired", 401),
            HttpStatus.UNAUTHORIZED
        );
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ApiError> handleJwtError(JwtException ex) {
        log.warn("JWT error: {}", ex.getMessage());
        return new ResponseEntity<>(
            new ApiError("Invalid token", 401),
            HttpStatus.UNAUTHORIZED
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        ApiError error = new ApiError(
            "Internal server error",
            500
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

