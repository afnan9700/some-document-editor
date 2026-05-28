package com.somedomain.collab_editor.auth;

import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.KeyFactory;

import java.util.Date;
import java.util.Map;
import java.util.function.Function;

import org.springframework.beans.factory.annotation.Value;
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
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public JwtService(
            // Change this property name to reflect it's now a private key
            @Value("${jwt.private-key}") String privateKeyPem, 
            @Value("${jwt.access-token-expiration-ms}") long accessTokenExpirationMs,
            @Value("${jwt.refresh-token-expiration-ms}") long refreshTokenExpirationMs) {
        this.privateKeyPem = privateKeyPem;
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

    public String generateAccessToken(UserDetails userDetails) {
        return buildToken(Map.of("tokenType", "access"), userDetails, accessTokenExpirationMs);
    }

    public String generateRefreshToken(UserDetails userDetails)  {
        return buildToken(Map.of("tokenType", "refresh"), userDetails, refreshTokenExpirationMs);
    }

    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails, long expirationMs) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
            .setClaims(extraClaims)
            .setSubject(userDetails.getUsername())
            .setIssuedAt(new Date(now))
            .setExpiration(new Date(now + expirationMs))
            .signWith(getPrivateKey(), SignatureAlgorithm.RS256) 
            .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractTokenType(String token) {
        return extractAllClaims(token).get("tokenType", String.class);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public long getRefreshTokenExpirationMs() {
        return refreshTokenExpirationMs;
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
            .setSigningKey(getPrivateKey())
            .build()
            .parseClaimsJws(token)
            .getBody();
    }
}
