package com.tufixit.backend.dto;

import com.tufixit.backend.entity.EscrowTransaction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateEscrowRequest {
        @NotNull(message = "Job ID is required")
        private Long jobId;
        
        @NotNull(message = "Total amount is required")
        private BigDecimal totalAmount;
        
        private BigDecimal materialCost;
        private BigDecimal laborCost;
        
        @NotBlank(message = "Payment type is required")
        private EscrowTransaction.PaymentType paymentType;
        
        private String mpesaPhone;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class EscrowResponse {
        private Long id;
        private Long jobId;
        private BigDecimal totalAmount;
        private BigDecimal materialCost;
        private BigDecimal laborCost;
        private BigDecimal platformFee;
        private EscrowTransaction.TransactionStatus status;
        private String mpesaTransactionId;
        private String mpesaReceiptNumber;
        private Boolean materialReleased;
        private Boolean laborReleased;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MpesaCallbackRequest {
        private String transactionType;
        private String transactionId;
        private String transAmount;
        private String billRefNumber;
        private String invoiceNumber;
        private String orgAccountBalance;
        private String thirdPartyConversationId;
        private String msisdn;
        private String firstName;
        private String middleName;
        private String lastName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReleaseMaterialRequest {
        @NotNull(message = "Job ID is required")
        private Long jobId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReleaseLaborRequest {
        @NotNull(message = "Job ID is required")
        private Long jobId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InitiatePaymentRequest {
        @NotNull(message = "Amount is required")
        private BigDecimal amount;
        
        @NotBlank(message = "Phone number is required")
        private String phoneNumber;
        
        private String accountReference;
        
        private String transactionDesc;
    }
}
