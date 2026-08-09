package com.somedomain.collab_editor.auth;

import java.io.IOException;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class InternalAuthFilter extends OncePerRequestFilter {

    private final String internalToken;
    private static final Logger log = LoggerFactory.getLogger(InternalAuthFilter.class);

    // there could be some confusion regarding token naming here, but please tolerate    
    public InternalAuthFilter(@Value("${spring.application.springboot-bearer-token}") String internalToken) {
        this.internalToken = internalToken;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (internalToken.equals(token)) {
                log.debug("Token authentication successful for 'internal-worker'");
                var auth = new UsernamePasswordAuthenticationToken(
                    "internal-worker",
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_WORKER"))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
            else {
                log.warn("Invalid token for 'internal-worker'");
            }
        }

        filterChain.doFilter(request, response);
    }
}