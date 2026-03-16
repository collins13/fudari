package com.tufixit.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "escrow_transactions")
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EscrowTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Column
    private BigDecimal materialCost;

    @Column
    private BigDecimal laborCost;

    @Column
    private BigDecimal platformFee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status;

    @Column
    private String mpesaTransactionId;

    @Column
    private String mpesaReceiptNumber;

    @Column
    private String mpesaPhone;

    @Enumerated(EnumType.STRING)
    @Column
    private PaymentType paymentType;

    @Column
    private Boolean materialReleased = false;

    @Column
    private Boolean laborReleased = false;

    @Column
    private LocalDateTime materialReleaseTime;

    @Column
    private LocalDateTime laborReleaseTime;

    @Column
    private String notes;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum TransactionStatus {
        PENDING, DEPOSITED, MATERIAL_RELEASED, COMPLETED, REFUNDED, DISPUTED
    }

    public enum PaymentType {
        MPESA, BANK_TRANSFER, CASH
    }
}
