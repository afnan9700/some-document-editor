package com.somedomain.collab_editor.collaborationstateworkerclient;

import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

// generic response from worker
public record ProxyResponse(HttpStatusCode statusCode, byte[] body) {
    // to convert the proxy response directly into spring's response object
    public ResponseEntity<byte[]> toResponseEntity() {
        byte[] safeBody = body != null ? body : new byte[0];  // cuz it may otherwise cause lead to errors during serialization
        return ResponseEntity.status(statusCode)
                .contentType(MediaType.APPLICATION_JSON)
                .body(safeBody);
    }
}