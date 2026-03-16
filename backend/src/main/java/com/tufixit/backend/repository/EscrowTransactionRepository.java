package com.tufixit.backend.repository;

import com.tufixit.backend.entity.EscrowTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EscrowTransactionRepository extends JpaRepository<EscrowTransaction, Long> {
    
    Optional<EscrowTransaction> findByJobId(Long jobId);
    
    List<EscrowTransaction> findByJobClientId(Long clientId);
    
    List<EscrowTransaction> findByJobAssignedWorkerId(Long workerId);
    
    Optional<EscrowTransaction> findByMpesaTransactionId(String mpesaTransactionId);
}
