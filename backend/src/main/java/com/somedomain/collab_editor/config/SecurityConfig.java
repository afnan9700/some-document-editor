package com.somedomain.collab_editor.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.somedomain.collab_editor.auth.JwtAuthFilter;
import com.somedomain.collab_editor.auth.JwtAuthenticationEntryPoint;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint unauthorizedHandler;
    private final JwtAuthFilter jwtAuthFilter;
    // private final CustomUserDetailsService customUserDetailsService;
    // private final PasswordEncoder passwordEncoder;

    public SecurityConfig(JwtAuthenticationEntryPoint unauthorizedHandler, JwtAuthFilter jwtAuthFilter) {
        this.unauthorizedHandler = unauthorizedHandler;
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(ex -> ex.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // @Bean
    // public UserDetailsService userDetailsService() {
    //     return customUserDetailsService;
    // }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        // This automatically uses the UserDetailsService + PasswordEncoder beans
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 1. Specify the exact origins allowed. Do not use "*" in production.
        configuration.setAllowedOrigins(List.of("http://localhost:80", "http://localhost:4200", "http://localhost"));
        
        // 2. Explicitly allow the HTTP methods your API uses.
        // The OPTIONS method is mandatory for preflight requests to succeed.
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        
        // 3. Explicitly allow the headers the frontend will send.
        // Because you use JWTs, "Authorization" MUST be in this list.
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        configuration.setAllowCredentials(true);
        
        // 4. Map this configuration to all endpoints in the application.
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
