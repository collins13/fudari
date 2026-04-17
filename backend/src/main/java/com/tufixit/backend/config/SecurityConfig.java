package com.tufixit.backend.config;

import com.tufixit.backend.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.beans.factory.annotation.Value;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private UserDetailsService userDetailsService;
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    public void setDependencies(UserDetailsService userDetailsService, JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    /** Comma-separated allowed origins — set via CORS_ALLOWED_ORIGINS env var */
    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOriginsRaw;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Auth endpoints - public
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/artisan/**").permitAll()

                        // PUBLIC: listings browsing (customers no login)
                        .requestMatchers("/api/listings").permitAll()
                        .requestMatchers("/api/listings/{id:[0-9]+}").permitAll()
                        .requestMatchers("/api/listings/{id:[0-9]+}/view").permitAll()

                        // PUBLIC: categories
                        .requestMatchers("/api/categories").permitAll()
                        .requestMatchers("/api/categories/stats").permitAll()
                        .requestMatchers("/api/categories/platform-stats").permitAll()

                        // PUBLIC: workers/artisan profiles
                        .requestMatchers("/api/workers/search").permitAll()
                        .requestMatchers("/api/workers/*/reviews").permitAll()
                        .requestMatchers("/api/workers/*/rating").permitAll()
                        .requestMatchers("/api/workers/*").permitAll()
                        .requestMatchers("/api/workers/*/skills").permitAll()

                        // PUBLIC: jobs browsing
                        .requestMatchers("/api/jobs/open").permitAll()
                        .requestMatchers("/api/jobs/search").permitAll()
                        .requestMatchers("/api/jobs/nearby").permitAll()
                        .requestMatchers("/api/jobs/{id:[0-9]+}").permitAll()

                        // PUBLIC: reviews (no auth)
                        .requestMatchers("/api/reviews/public/**").permitAll()

                        // PUBLIC: lead tracking
                        .requestMatchers("/api/leads/view/**").permitAll()
                        .requestMatchers("/api/leads/call/**").permitAll()
                        .requestMatchers("/api/leads/whatsapp/**").permitAll()

                        // PUBLIC: subscription plans view
                        .requestMatchers("/api/subscriptions/plans").permitAll()
                        .requestMatchers("/api/subscriptions/artisan/**").permitAll()

                        // PUBLIC: reports (anyone can report)
                        .requestMatchers("/api/reports").permitAll()

                        // PUBLIC: Booking (no-login customer endpoints)
                        .requestMatchers("/api/bookings/public").permitAll()
                        .requestMatchers("/api/bookings/track/**").permitAll()
                        .requestMatchers("/api/bookings/*/cancel").permitAll()
                        .requestMatchers("/api/bookings/*/rate").permitAll()
                        .requestMatchers("/api/bookings/*/report").permitAll()
                        .requestMatchers("/api/bookings/*/accept-counter").permitAll()
                        .requestMatchers("/api/bookings/*/reject-counter").permitAll()

                        // PUBLIC: AI endpoints (no auth required — called from booking form)
                        .requestMatchers("/api/ai/**").permitAll()

                        // PUBLIC: ranking scores (artisan profiles)
                        .requestMatchers("/api/ranking/{artisanId:[0-9]+}").permitAll()

                        // PUBLIC: WebSocket handshake (JWT auth is handled inside WebSocketConfig)
                        .requestMatchers("/ws/**").permitAll()

                        // PUBLIC: M-Pesa callbacks
                        .requestMatchers("/api/mpesa/**").permitAll()
                        .requestMatchers("/api/payments/mpesa/**").permitAll()

                        // PUBLIC: WhatsApp webhook (Meta verifies via GET, delivers via POST)
                        .requestMatchers("/api/whatsapp/webhook").permitAll()
                        // PUBLIC: Twilio WhatsApp webhooks
                        .requestMatchers("/api/whatsapp/twilio/**").permitAll()

                        // PUBLIC: Estate slug resolution (branded booking pages)
                        .requestMatchers("/api/estates/resolve/**").permitAll()

                        // PUBLIC: Health check
                        .requestMatchers("/api/health").permitAll()

                        // ADMIN only
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/jobs/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/categories/all").hasRole("ADMIN")
                        .requestMatchers("/api/reports/admin/**").hasRole("ADMIN")

                        // Everything else requires auth
                        .anyRequest().authenticated()
                );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Read allowed origins from environment variable — no more hardcoding
        List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
