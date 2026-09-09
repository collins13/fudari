package com.tufixit.backend.service;

import com.tufixit.backend.dto.PaymentDTO;
import com.tufixit.backend.entity.EscrowTransaction;
import com.tufixit.backend.entity.Job;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final EscrowTransactionRepository escrowRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final MpesaDarajaService mpesaService;

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

        // Trigger M-Pesa STK Push to worker for material cost
        if (escrow.getJob().getAssignedWorker() != null) {
            String workerPhone = escrow.getJob().getAssignedWorker().getPhoneNumber();
            int amount = escrow.getMaterialCost().intValue();
            try {
                MpesaDarajaService.StkPushResult result = mpesaService.initiateSTKPush(
                        workerPhone, amount,
                        "TUF-MAT-" + escrow.getJob().getId(),
                        "Fudari material cost release");
                log.info("[Payment] Material release STK Push sent: {}", result.checkoutRequestId());
            } catch (Exception e) {
                log.error("[Payment] Material release STK Push failed for job {}: {}",
                        jobId, e.getMessage());
            }
        }

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

        // Trigger M-Pesa STK Push to worker for labor cost minus platform fee
        if (escrow.getJob().getAssignedWorker() != null) {
            String workerPhone = escrow.getJob().getAssignedWorker().getPhoneNumber();
            BigDecimal laborMinusFee = escrow.getLaborCost().subtract(
                    escrow.getPlatformFee() != null ? escrow.getPlatformFee() : BigDecimal.ZERO);
            int amount = laborMinusFee.max(BigDecimal.ZERO).intValue();
            try {
                MpesaDarajaService.StkPushResult result = mpesaService.initiateSTKPush(
                        workerPhone, amount,
                        "TUF-LAB-" + escrow.getJob().getId(),
                        "Fudari labor payment");
                log.info("[Payment] Labor release STK Push sent: {}", result.checkoutRequestId());
            } catch (Exception e) {
                log.error("[Payment] Labor release STK Push failed for job {}: {}",
                        jobId, e.getMessage());
            }
        }

        escrow = escrowRepository.save(escrow);

        return mapToEscrowResponse(escrow);
    }

    /**
     * Processes a verified M-Pesa STK callback (called AFTER HMAC verification).
     */
    @Transactional
    public PaymentDTO.EscrowResponse processStkCallback(MpesaDarajaService.StkCallbackData data) {
        log.info("[M-Pesa] Processing STK callback: checkoutId={}, resultCode={}, receipt={}",
                data.checkoutRequestId(), data.resultCode(), data.mpesaReceiptNumber());

        if (!data.isSuccess()) {
            log.warn("[M-Pesa] STK Push failed: {} — {}", data.resultCode(), data.resultDesc());
            return null;
        }

        EscrowTransaction escrow = escrowRepository.findByMpesaTransactionId(data.checkoutRequestId())
                .orElse(null);

        if (escrow != null) {
            if (escrow.getStatus() == EscrowTransaction.TransactionStatus.DEPOSITED) {
                log.info("[M-Pesa] Duplicate callback for {} — already deposited", data.checkoutRequestId());
                return mapToEscrowResponse(escrow);
            }
            escrow.setMpesaReceiptNumber(data.mpesaReceiptNumber());
            escrow.setStatus(EscrowTransaction.TransactionStatus.DEPOSITED);
            escrow = escrowRepository.save(escrow);

            Job job = escrow.getJob();
            job.setStatus(Job.JobStatus.ACCEPTED);
            jobRepository.save(job);
        } else {
            log.warn("[M-Pesa] No escrow found for checkoutRequestId: {}", data.checkoutRequestId());
        }

        return escrow != null ? mapToEscrowResponse(escrow) : null;
    }

    @Transactional
    public PaymentDTO.EscrowResponse processMpesaCallback(PaymentDTO.MpesaCallbackRequest callback) {
        log.info("Processing M-Pesa callback: {}", callback);

        if (callback.getTransactionId() == null || callback.getTransactionId().isBlank()) {
            log.warn("[M-Pesa] Callback rejected: missing transactionId");
            return null;
        }

        EscrowTransaction escrow = escrowRepository.findByMpesaTransactionId(callback.getTransactionId())
                .orElse(null);

        if (escrow != null) {
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

    /**
     * Initiates an M-Pesa STK Push for escrow payment.
     */
    public PaymentDTO.StkPushResponse initiatePayment(PaymentDTO.InitiatePaymentRequest request) {
        log.info("Initiating M-Pesa STK Push: phone={}, amount={}", request.getPhoneNumber(), request.getAmount());

        try {
            MpesaDarajaService.StkPushResult result = mpesaService.initiateSTKPush(
                    request.getPhoneNumber(),
                    request.getAmount().intValue(),
                    request.getAccountReference() != null ? request.getAccountReference() : "FUDARI",
                    request.getTransactionDesc());

            return PaymentDTO.StkPushResponse.builder()
                    .checkoutRequestId(result.checkoutRequestId())
                    .merchantRequestId(result.merchantRequestId())
                    .responseCode(result.responseCode())
                    .responseDescription(result.responseDescription())
                    .build();
        } catch (Exception e) {
            log.error("[M-Pesa] STK Push initiation failed", e);
            throw new RuntimeException("M-Pesa payment initiation failed: " + e.getMessage());
        }
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
