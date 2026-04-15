package com.tufixit.backend.service;

import com.tufixit.backend.dto.PaymentDTO;
import com.tufixit.backend.entity.EscrowTransaction;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.EscrowTransactionRepository;
import com.tufixit.backend.repository.JobRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final EscrowTransactionRepository escrowRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;

    @Value("${platform.fee.percentage:0.05}")
    private Double platformFeePercentage;

    @Transactional
    public PaymentDTO.EscrowResponse createEscrow(PaymentDTO.CreateEscrowRequest request) {
        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (job.getAssignedWorker() == null) {
            throw new RuntimeException("No worker assigned to this job");
        }

        // Calculate platform fee
        BigDecimal totalAmount = request.getTotalAmount();
        BigDecimal platformFee = totalAmount.multiply(BigDecimal.valueOf(platformFeePercentage));

        EscrowTransaction escrow = EscrowTransaction.builder()
                .job(job)
                .totalAmount(totalAmount)
                .materialCost(request.getMaterialCost())
                .laborCost(request.getLaborCost())
                .platformFee(platformFee)
                .status(EscrowTransaction.TransactionStatus.PENDING)
                .paymentType(request.getPaymentType())
                .mpesaPhone(request.getMpesaPhone())
                .materialReleased(false)
                .laborReleased(false)
                .build();

        escrow = escrowRepository.save(escrow);

        return mapToEscrowResponse(escrow);
    }

    public PaymentDTO.EscrowResponse getEscrowByJobId(Long jobId) {
        EscrowTransaction escrow = escrowRepository.findByJobId(jobId)
                .orElseThrow(() -> new RuntimeException("Escrow not found"));
        return mapToEscrowResponse(escrow);
    }

    public List<PaymentDTO.EscrowResponse> getClientEscrows(Long clientId) {
        return escrowRepository.findByJobClientId(clientId)
                .stream()
                .map(this::mapToEscrowResponse)
                .collect(Collectors.toList());
    }

    public List<PaymentDTO.EscrowResponse> getWorkerEscrows(Long workerId) {
        return escrowRepository.findByJobAssignedWorkerId(workerId)
                .stream()
                .map(this::mapToEscrowResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public PaymentDTO.EscrowResponse confirmDeposit(Long jobId, String mpesaTransactionId) {
        EscrowTransaction escrow = escrowRepository.findByJobId(jobId)
                .orElseThrow(() -> new RuntimeException("Escrow not found"));

        escrow.setStatus(EscrowTransaction.TransactionStatus.DEPOSITED);
        escrow.setMpesaTransactionId(mpesaTransactionId);

        escrow = escrowRepository.save(escrow);

        // Update job status
        Job job = escrow.getJob();
        job.setStatus(com.tufixit.backend.entity.Job.JobStatus.ACCEPTED);
        jobRepository.save(job);

        return mapToEscrowResponse(escrow);
    }

    @Transactional
    public PaymentDTO.EscrowResponse releaseMaterial(Long jobId) {
        EscrowTransaction escrow = escrowRepository.findByJobId(jobId)
                .orElseThrow(() -> new RuntimeException("Escrow not found"));

        if (escrow.getMaterialCost() == null || escrow.getMaterialCost().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("No material cost to release");
        }

        escrow.setMaterialReleased(true);
        escrow.setMaterialReleaseTime(LocalDateTime.now());
        escrow.setStatus(EscrowTransaction.TransactionStatus.MATERIAL_RELEASED);

        // TODO: Trigger M-Pesa STK Push to worker

        escrow = escrowRepository.save(escrow);

        return mapToEscrowResponse(escrow);
    }

    @Transactional
    public PaymentDTO.EscrowResponse releaseLabor(Long jobId) {
        EscrowTransaction escrow = escrowRepository.findByJobId(jobId)
                .orElseThrow(() -> new RuntimeException("Escrow not found"));

        boolean hasMaterialCost = escrow.getMaterialCost() != null
                && escrow.getMaterialCost().compareTo(BigDecimal.ZERO) > 0;
        if (hasMaterialCost && !escrow.getMaterialReleased()) {
            throw new RuntimeException("Material cost must be released before labor");
        }

        escrow.setLaborReleased(true);
        escrow.setLaborReleaseTime(LocalDateTime.now());
        escrow.setStatus(EscrowTransaction.TransactionStatus.COMPLETED);

        // TODO: Trigger M-Pesa STK Push to worker with labor cost minus platform fee

        escrow = escrowRepository.save(escrow);

        return mapToEscrowResponse(escrow);
    }

    @Transactional
    public PaymentDTO.EscrowResponse processMpesaCallback(PaymentDTO.MpesaCallbackRequest callback) {
        log.info("Processing M-Pesa callback: {}", callback);

        // Validate callback has required fields
        if (callback.getTransactionId() == null || callback.getTransactionId().isBlank()) {
            log.warn("[M-Pesa] Callback rejected: missing transactionId");
            return null;
        }

        // TODO: Verify callback authenticity via M-Pesa HMAC signature
        // In production, validate: HMAC-SHA256(body, MPESA_PASSKEY) == X-Signature header
        // Reject all callbacks that fail signature verification to prevent spoofing

        EscrowTransaction escrow = escrowRepository.findByMpesaTransactionId(callback.getTransactionId())
                .orElse(null);

        if (escrow != null) {
            // Idempotency: skip if already deposited
            if (escrow.getStatus() == EscrowTransaction.TransactionStatus.DEPOSITED) {
                log.info("[M-Pesa] Duplicate callback for txn {} — already deposited", callback.getTransactionId());
                return mapToEscrowResponse(escrow);
            }
            escrow.setMpesaReceiptNumber(callback.getBillRefNumber());
            escrow.setStatus(EscrowTransaction.TransactionStatus.DEPOSITED);
            escrow = escrowRepository.save(escrow);
        } else {
            log.warn("[M-Pesa] No escrow found for transactionId: {}", callback.getTransactionId());
        }

        return escrow != null ? mapToEscrowResponse(escrow) : null;
    }

    @Transactional
    public PaymentDTO.EscrowResponse initiatePayment(PaymentDTO.InitiatePaymentRequest request) {
        // Mock M-Pesa STK Push initiation
        String transactionId = UUID.randomUUID().toString();
        
        log.info("Initiating M-Pesa payment: phone={}, amount={}", request.getPhoneNumber(), request.getAmount());

        // In production, this would call the M-Pesa API
        // For now, return a mock response
        return PaymentDTO.EscrowResponse.builder()
                .id(0L)
                .totalAmount(request.getAmount())
                .status(EscrowTransaction.TransactionStatus.PENDING)
                .mpesaTransactionId(transactionId)
                .build();
    }

    private PaymentDTO.EscrowResponse mapToEscrowResponse(EscrowTransaction escrow) {
        return PaymentDTO.EscrowResponse.builder()
                .id(escrow.getId())
                .jobId(escrow.getJob().getId())
                .totalAmount(escrow.getTotalAmount())
                .materialCost(escrow.getMaterialCost())
                .laborCost(escrow.getLaborCost())
                .platformFee(escrow.getPlatformFee())
                .status(escrow.getStatus())
                .mpesaTransactionId(escrow.getMpesaTransactionId())
                .mpesaReceiptNumber(escrow.getMpesaReceiptNumber())
                .materialReleased(escrow.getMaterialReleased())
                .laborReleased(escrow.getLaborReleased())
                .createdAt(escrow.getCreatedAt())
                .build();
    }
}
