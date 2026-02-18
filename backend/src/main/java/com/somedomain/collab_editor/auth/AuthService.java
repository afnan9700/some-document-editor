package com.somedomain.collab_editor.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.somedomain.collab_editor.common.exceptions.AppException;
import com.somedomain.collab_editor.common.exceptions.InvalidCredentialsException;
import com.somedomain.collab_editor.common.exceptions.NotFoundException;
import com.somedomain.collab_editor.common.exceptions.UserAlreadyExistsException;

@Service
public class AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository repo, PasswordEncoder encoder, JwtService jwtService) {
        this.userRepository = repo;
        this.passwordEncoder = encoder;
        this.jwtService = jwtService;
    }

    public AuthResponse signup(String username, String password) {
        log.info("Signup attempt for username='{}'", username);

        if (userRepository.existsByUsername(username)) {
            log.warn("Signup failed: username already exists: '{}'", username);
            throw new UserAlreadyExistsException(username);
        }

        String hash = passwordEncoder.encode(password);
        User user = new User(username, hash);
        userRepository.save(user);

        log.info("User signup successful: username='{}', userId={}", username, user.getId());

        // auto-login on signup
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        System.out.println("Tokens: " + accessToken + ", " + refreshToken);

        return new AuthResponse(accessToken, refreshToken);
    }

    public AuthResponse login(String username, String password) {
        log.info("Login attempt for username='{}'", username);

        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> {
                log.warn("Login failed: user not found: '{}'", username);
                return new NotFoundException("Username '" + username + "' not found");
            });

        if (!passwordEncoder.matches(password, user.getPassword())) {
            log.warn("Login failed: invalid password for username='{}'", username);
            throw new InvalidCredentialsException();
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        log.info("Login successful: username='{}', userId={}", username, user.getId());

        return new AuthResponse(accessToken, refreshToken);
    }

    public AuthResponse refresh(String refreshToken) {
        log.info("Refresh token request received");

        // validate refresh token, ensure correct type, not expired
        String tokenType = jwtService.extractTokenType(refreshToken);
        if (!"refresh".equals(tokenType) || jwtService.isTokenExpired(refreshToken)) {
            log.warn("Invalid or expired refresh token");
            throw new AppException("Invalid refresh token", 401);
        }

        String username = jwtService.extractUsername(refreshToken);
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> {
                log.warn("Refresh failed: user not found for token subject '{}'", username);
                return new NotFoundException("Username '" + username + "' not found");
            });

        // issue new pair of tokens
        String newAccessToken = jwtService.generateAccessToken(user);
        String newRefreshToken = jwtService.generateRefreshToken(user);

        log.info("Refresh token successful for username='{}'", username);

        return new AuthResponse(newAccessToken, newRefreshToken);
    }

    public record AuthResponse(String accessToken, String refreshToken) {}
}
