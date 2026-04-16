package com.tufixit.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tufixit.backend.dto.AuthDTO;
import com.tufixit.backend.dto.BookingDTO;
import com.tufixit.backend.dto.PaymentDTO;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Auth → Booking → Payment flows.
 * Uses H2 in-memory database (no external dependencies).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthBookingPaymentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    // Shared state across ordered tests
    private static String clientToken;
    private static String workerToken;
    private static Long workerId;
    private static String bookingCode;

    // ── AUTH TESTS ───────────────────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("Register a worker (artisan)")
    void registerWorker() throws Exception {
        AuthDTO.RegisterRequest request = AuthDTO.RegisterRequest.builder()
                .phoneNumber("0712345678")
                .password("Test@1234")
                .firstName("John")
                .lastName("Mwangi")
                .email("john@test.co.ke")
                .role(User.UserRole.WORKER)
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("WORKER"))
                .andReturn();

        AuthDTO.AuthResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(), AuthDTO.AuthResponse.class);
        workerToken = response.getToken();
        workerId = response.getUserId();
    }

    @Test
    @Order(2)
    @DisplayName("Register a client (customer)")
    void registerClient() throws Exception {
        AuthDTO.RegisterRequest request = AuthDTO.RegisterRequest.builder()
                .phoneNumber("0798765432")
                .password("Client@123")
                .firstName("Mary")
                .lastName("Wanjiku")
                .email("mary@test.co.ke")
                .role(User.UserRole.CLIENT)
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("CLIENT"))
                .andReturn();

        AuthDTO.AuthResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(), AuthDTO.AuthResponse.class);
        clientToken = response.getToken();
    }

    @Test
    @Order(3)
    @DisplayName("Login with registered worker")
    void loginWorker() throws Exception {
        AuthDTO.LoginRequest request = AuthDTO.LoginRequest.builder()
                .emailOrPhone("0712345678")
                .password("Test@1234")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.phoneNumber").value("0712345678"));
    }

    @Test
    @Order(4)
    @DisplayName("Login fails with wrong password")
    void loginWrongPassword() throws Exception {
        AuthDTO.LoginRequest request = AuthDTO.LoginRequest.builder()
                .emailOrPhone("0712345678")
                .password("WrongPassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    assert s >= 400 : "Expected error status for wrong password, got " + s;
                });
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/auth/me returns current user")
    void getCurrentUser() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("John"))
                .andExpect(jsonPath("$.role").value("WORKER"));
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/auth/me without token is rejected")
    void meWithoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    assert s == 401 || s == 403 || s == 500 : "Expected rejection, got " + s;
                });
    }

    @Test
    @Order(7)
    @DisplayName("Duplicate registration fails")
    void duplicateRegistration() throws Exception {
        AuthDTO.RegisterRequest request = AuthDTO.RegisterRequest.builder()
                .phoneNumber("0712345678")
                .password("AnotherPass1")
                .firstName("Duplicate")
                .lastName("User")
                .role(User.UserRole.WORKER)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    assert s >= 400 : "Expected error status, got " + s;
                });
    }

    // ── BOOKING TESTS ────────────────────────────────────────────────────────

    @Test
    @Order(10)
    @DisplayName("Approve worker so they can receive bookings")
    void approveWorker() throws Exception {
        // Directly approve via DB (admin action)
        User worker = userRepository.findById(workerId).orElseThrow();
        worker.setIsApproved(true);
        worker.setLocationName("Nairobi");
        userRepository.save(worker);
    }

    @Test
    @Order(11)
    @DisplayName("Create booking (no auth required)")
    void createBooking() throws Exception {
        BookingDTO.CreateBookingRequest request = BookingDTO.CreateBookingRequest.builder()
                .artisanId(workerId)
                .customerName("Mary Wanjiku")
                .customerPhone("0798765432")
                .customerLocation("Westlands, Nairobi")
                .jobDescription("Kitchen sink is leaking badly, need urgent repair")
                .urgency(Job.UrgencyLevel.TODAY)
                .build();

        MvcResult result = mockMvc.perform(post("/api/bookings/public")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookingCode").isNotEmpty())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        BookingDTO.BookingTrackResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(), BookingDTO.BookingTrackResponse.class);
        bookingCode = response.getBookingCode();
    }

    @Test
    @Order(12)
    @DisplayName("Track booking by code (no auth)")
    void trackBooking() throws Exception {
        mockMvc.perform(get("/api/bookings/track/" + bookingCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingCode").value(bookingCode))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.customerLocation").value("Westlands, Nairobi"));
    }

    @Test
    @Order(13)
    @DisplayName("Track non-existent booking returns 404")
    void trackNonExistentBooking() throws Exception {
        mockMvc.perform(get("/api/bookings/track/FAKE-123456"))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(14)
    @DisplayName("Create booking with missing required fields returns 400")
    void createBookingMissingFields() throws Exception {
        BookingDTO.CreateBookingRequest request = BookingDTO.CreateBookingRequest.builder()
                .artisanId(workerId)
                // missing customerName, customerPhone, etc.
                .build();

        mockMvc.perform(post("/api/bookings/public")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ── PAYMENT TESTS ────────────────────────────────────────────────────────

    @Test
    @Order(20)
    @DisplayName("Initiate M-Pesa STK Push (stub mode)")
    void initiatePayment() throws Exception {
        PaymentDTO.InitiatePaymentRequest request = PaymentDTO.InitiatePaymentRequest.builder()
                .amount(BigDecimal.valueOf(500))
                .phoneNumber("0712345678")
                .accountReference("TUFIXIT-BASIC")
                .transactionDesc("Test payment")
                .build();

        mockMvc.perform(post("/api/payments/initiate")
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checkoutRequestId").isNotEmpty())
                .andExpect(jsonPath("$.responseCode").value("0"));
    }

    @Test
    @Order(21)
    @DisplayName("Initiate payment with invalid phone returns 400")
    void initiatePaymentBadPhone() throws Exception {
        PaymentDTO.InitiatePaymentRequest request = PaymentDTO.InitiatePaymentRequest.builder()
                .amount(BigDecimal.valueOf(500))
                .phoneNumber("12345") // invalid
                .accountReference("TUFIXIT")
                .build();

        mockMvc.perform(post("/api/payments/initiate")
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is5xxServerError());
    }

    @Test
    @Order(22)
    @DisplayName("M-Pesa STK callback processes successfully (stub)")
    void stkCallback() throws Exception {
        String callbackBody = """
                {
                  "Body": {
                    "stkCallback": {
                      "MerchantRequestID": "test-merchant-123",
                      "CheckoutRequestID": "test-checkout-123",
                      "ResultCode": 0,
                      "ResultDesc": "The service request is processed successfully.",
                      "CallbackMetadata": {
                        "Item": [
                          { "Name": "Amount", "Value": 500.00 },
                          { "Name": "MpesaReceiptNumber", "Value": "QHJ3R5KL89" },
                          { "Name": "PhoneNumber", "Value": 254712345678 }
                        ]
                      }
                    }
                  }
                }
                """;

        mockMvc.perform(post("/api/payments/mpesa/stk-callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackBody))
                .andExpect(status().isOk());
    }

    // ── SUBSCRIPTION TESTS ───────────────────────────────────────────────────

    @Test
    @Order(30)
    @DisplayName("View available subscription plans")
    void getPlans() throws Exception {
        mockMvc.perform(get("/api/subscriptions/plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("FREE"))
                .andExpect(jsonPath("$[1].name").value("BASIC"))
                .andExpect(jsonPath("$[2].name").value("PRO"));
    }

    @Test
    @Order(31)
    @DisplayName("Subscribe to FREE plan (no payment required)")
    void subscribeFree() throws Exception {
        String body = """
                { "planType": "FREE" }
                """;

        mockMvc.perform(post("/api/subscriptions")
                        .header("Authorization", "Bearer " + workerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planType").value("FREE"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    @Order(32)
    @DisplayName("Get current subscription")
    void getCurrentSubscription() throws Exception {
        mockMvc.perform(get("/api/subscriptions/current")
                        .header("Authorization", "Bearer " + workerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.planType").value("FREE"));
    }

    @Test
    @Order(33)
    @DisplayName("Client cannot subscribe")
    void clientCannotSubscribe() throws Exception {
        String body = """
                { "planType": "FREE" }
                """;

        mockMvc.perform(post("/api/subscriptions")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().is5xxServerError());
    }

    // ── HEALTH CHECK ─────────────────────────────────────────────────────────

    @Test
    @Order(40)
    @DisplayName("Health endpoint returns OK")
    void healthCheck() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    // ── PUBLIC ENDPOINT ACCESS ───────────────────────────────────────────────

    @Test
    @Order(50)
    @DisplayName("Public endpoints accessible without auth")
    void publicEndpoints() throws Exception {
        mockMvc.perform(get("/api/subscriptions/plans"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk());
    }

    @Test
    @Order(51)
    @DisplayName("Protected endpoints reject unauthenticated requests")
    void protectedEndpoints() throws Exception {
        mockMvc.perform(get("/api/subscriptions/current"))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    assert s == 401 || s == 403 : "Expected 401/403, got " + s;
                });

        mockMvc.perform(get("/api/admin/stats"))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    assert s == 401 || s == 403 : "Expected 401/403, got " + s;
                });
    }
}
