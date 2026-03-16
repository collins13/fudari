package com.tufixit.backend.controller;

import com.tufixit.backend.dto.PaymentDTO;
import com.tufixit.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/escrow")
    public ResponseEntity<PaymentDTO.EscrowResponse> createEscrow(
            @Valid @RequestBody PaymentDTO.CreateEscrowRequest request) {
        return ResponseEntity.ok(paymentService.createEscrow(request));
    }

    @GetMapping("/escrow/job/{jobId}")
    public ResponseEntity<PaymentDTO.EscrowResponse> getEscrowByJobId(@PathVariable Long jobId) {
        return ResponseEntity.ok(paymentService.getEscrowByJobId(jobId));
    }

    @GetMapping("/escrow/client/{clientId}")
    public ResponseEntity<List<PaymentDTO.EscrowResponse>> getClientEscrows(@PathVariable Long clientId) {
        return ResponseEntity.ok(paymentService.getClientEscrows(clientId));
    }

    @GetMapping("/escrow/worker/{workerId}")
    public ResponseEntity<List<PaymentDTO.EscrowResponse>> getWorkerEscrows(@PathVariable Long workerId) {
        return ResponseEntity.ok(paymentService.getWorkerEscrows(workerId));
    }

    @PostMapping("/escrow/{jobId}/deposit")
    public ResponseEntity<PaymentDTO.EscrowResponse> confirmDeposit(
            @PathVariable Long jobId,
            @RequestBody Map<String, String> data) {
        String mpesaTransactionId = data.get("mpesaTransactionId");
        return ResponseEntity.ok(paymentService.confirmDeposit(jobId, mpesaTransactionId));
    }

    @PostMapping("/escrow/{jobId}/release-material")
    public ResponseEntity<PaymentDTO.EscrowResponse> releaseMaterial(@PathVariable Long jobId) {
        return ResponseEntity.ok(paymentService.releaseMaterial(jobId));
    }

    @PostMapping("/escrow/{jobId}/release-labor")
    public ResponseEntity<PaymentDTO.EscrowResponse> releaseLabor(@PathVariable Long jobId) {
        return ResponseEntity.ok(paymentService.releaseLabor(jobId));
    }

    @PostMapping("/initiate")
    public ResponseEntity<PaymentDTO.EscrowResponse> initiatePayment(
            @Valid @RequestBody PaymentDTO.InitiatePaymentRequest request) {
        return ResponseEntity.ok(paymentService.initiatePayment(request));
    }

    @PostMapping("/mpesa/callback")
    public ResponseEntity<String> mpesaCallback(@RequestBody PaymentDTO.MpesaCallbackRequest callback) {
        paymentService.processMpesaCallback(callback);
        return ResponseEntity.ok("OK");
    }
}
