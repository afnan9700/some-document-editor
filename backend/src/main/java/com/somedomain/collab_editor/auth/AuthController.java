package com.somedomain.collab_editor.auth;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService service) {
        this.authService = service;
    }

    record SignupRequest(String username, String password) {}
    record LoginRequest(String username, String password) {}
    record RefreshRequest(String refreshToken) {}

    @PostMapping("/signup")
    public AuthService.AuthResponse signup(@RequestBody SignupRequest req) {
        return authService.signup(req.username(), req.password());
    }

    @PostMapping("/login")
    public AuthService.AuthResponse login(@RequestBody LoginRequest req) {
        return authService.login(req.username(), req.password());
    }

    @PostMapping("/refresh")
    public AuthService.AuthResponse refresh(@RequestBody RefreshRequest req) {
        return authService.refresh(req.refreshToken());
    }
}
