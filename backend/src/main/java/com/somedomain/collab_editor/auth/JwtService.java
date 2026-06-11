package com.somedomain.collab_editor.auth;

import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.security.KeyFactory;

import java.util.Date;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.somedomain.collab_editor.common.exceptions.AppException;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;

@Service
public class JwtService {

    private final String privateKeyPem;
    private final String publicKeyPem;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtService(
            @Value("${jwt.private-key}") String privateKeyPem, 
            @Value("${jwt.public-key}") String publicKeyPem,
            @Value("${jwt.access-token-expiration-ms}") long accessTokenExpirationMs,
            @Value("${jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs) {
        this.privateKeyPem = privateKeyPem;
        this.publicKeyPem = publicKeyPem;
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    private PrivateKey getPrivateKey() {
        try {
            // 1. Decode the Base64 private key string
            byte[] keyBytes = Decoders.BASE64.decode(privateKeyPem);
            
            // 2. Convert the bytes into a Java PrivateKey object
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePrivate(spec);
        } catch (Exception e) {
            throw new AppException("Failed to load RSA private key", 500);
        }
    }

    private PublicKey getPublicKey() {
        try {
            // 1. Decode the Base64 public key string
            byte[] keyBytes = Decoders.BASE64.decode(publicKeyPem);
            
            // 2. Convert the bytes into a Java PublicKey object
            X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePublic(spec);
        } catch (Exception e) {
            throw new AppException("Failed to load RSA public key", 500);
        }
    }

    public String generateAccessToken(UserDetails userDetails) {
        return buildToken(Map.of("tokenType", "access"), userDetails, accessTokenExpirationMs);
    }

    public String generateRefreshToken(UserDetails userDetails)  {
        return buildToken(Map.of("tokenType", "refresh"), userDetails, refreshTokenExpirationMs);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expirationMs) {
        long now = System.currentTimeMillis();

        List<String> authorities = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .claim("userId", extractUserId(userDetails))
                .claim("roles", authorities)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMs))
                .signWith(getPrivateKey(), SignatureAlgorithm.RS256)
                .compact();
    }

    private Long extractUserId(UserDetails userDetails) {
        if (userDetails instanceof User user) {
            return user.getId();
        }
        throw new IllegalArgumentException("UserDetails must be an instance of User to generate token");
    }

    public User extractUser(String token) {
        Claims claims = extractAllClaims(token);

        Long userId = claims.get("userId", Number.class).longValue();
        String username = claims.getSubject();

        return User.jwtPrincipal(userId, username);
    }


    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public List<SimpleGrantedAuthority> extractAuthorities(String token) {
        List<?> roles = extractAllClaims(token).get("roles", List.class);

        if (roles == null) {
            return List.of();
        }

        return roles.stream()
                .map(Object::toString)
                .map(SimpleGrantedAuthority::new)
                .toList();
    }

    public String extractTokenType(String token) {
        return extractAllClaims(token).get("tokenType", String.class);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    public boolean isAccessTokenValid(String token) {
        Claims claims = extractAllClaims(token);
        String tokenType = claims.get("tokenType", String.class);
        return "access".equals(tokenType) && !claims.getExpiration().before(new Date());
    }

    public boolean isRefreshTokenValid(String token) {
        Claims claims = extractAllClaims(token);
        String tokenType = claims.get("tokenType", String.class);
        return "refresh".equals(tokenType) && !claims.getExpiration().before(new Date());
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public long getRefreshTokenExpirationMs() {
        return refreshTokenExpirationMs;
    }

    private Claims extractAllClaims(String token) {
    return Jwts.parserBuilder()
            .setSigningKey(getPublicKey())   // use public key for validation
            .build()
            .parseClaimsJws(token)
            .getBody();
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    
}
