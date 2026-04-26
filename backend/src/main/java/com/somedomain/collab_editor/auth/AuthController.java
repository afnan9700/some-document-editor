package com.somedomain.collab_editor.auth;

import java.time.Duration;

import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService service, JwtService jwtService) {
        this.authService = service;
        this.jwtService = jwtService;
    }

    record SignupRequest(String username, String password) {
    }

    record LoginRequest(String username, String password) {
    }

    record RefreshRequest(String refreshToken) {
    }

    public record ClientAuthResponse(String accessToken) {
    }

    public record UserInfoResponse(Long id, String username) {
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Duration duration = Duration.ofMillis(jwtService.getRefreshTokenExpirationMs());

        ResponseCookie cookie = ResponseCookie
                .from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(duration)
                .sameSite("Strict")
                .build();

        response.addHeader("Set-Cookie", cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie
                .from("refreshToken", "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0) // key part
                .sameSite("Strict")
                .build();

        response.addHeader("Set-Cookie", cookie.toString());
    }

    @PostMapping("/signup")
    public ClientAuthResponse signup(@RequestBody SignupRequest req, HttpServletResponse response) {
        AuthService.AuthResponse auth = authService.signup(req.username(), req.password());
        setRefreshTokenCookie(response, auth.refreshToken());
        return new ClientAuthResponse(auth.accessToken());
    }

    @PostMapping("/login")
    public ClientAuthResponse login(@RequestBody LoginRequest req, HttpServletResponse response) {
        AuthService.AuthResponse auth = authService.login(req.username(), req.password());
        setRefreshTokenCookie(response, auth.refreshToken());
        return new ClientAuthResponse(auth.accessToken());
    }

    @PostMapping("/refresh")
    public ClientAuthResponse refresh(@RequestBody(required = false) RefreshRequest req,
            @CookieValue(value = "refreshToken", required = false) String cookieToken,
            HttpServletResponse response) {
        String token = (req != null && req.refreshToken() != null) ? req.refreshToken() : cookieToken;
        if (token == null) {
            throw new com.somedomain.collab_editor.common.exceptions.AppException("Missing refresh token", 401);
        }

        AuthService.AuthResponse auth = authService.refresh(token);
        setRefreshTokenCookie(response, auth.refreshToken());
        return new ClientAuthResponse(auth.accessToken());
    }

    @PostMapping("/logout")
    public void logout(HttpServletResponse response) {
        clearRefreshTokenCookie(response);
    }

    @GetMapping("/me")
    public UserInfoResponse me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new com.somedomain.collab_editor.common.exceptions.AppException(
                    "Missing or invalid authorization header", 401);
        }

        String token = authHeader.substring(7);
        String username = jwtService.extractUsername(token);

        User user = authService.getUserRepository().findByUsername(username)
                .orElseThrow(
                        () -> new com.somedomain.collab_editor.common.exceptions.NotFoundException("User not found"));

        return new UserInfoResponse(user.getId(), user.getUsername());
    }
}
