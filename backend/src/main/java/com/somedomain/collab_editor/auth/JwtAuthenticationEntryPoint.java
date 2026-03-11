package com.somedomain.collab_editor.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import java.io.IOException;

// to throw 401 when unauthenticated user tries to access protected resource
// because @ControllerAdvice doesn't catch Spring Security exceptions, we need this to handle auth errors globally
// otherwise Spring Security returns a 403 response
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        
        // This is called when a user tries to access a secured endpoint without being authenticated
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{ \"error\": \"Unauthorized\", \"message\": \"" + authException.getMessage() + "\" }");
    }
}