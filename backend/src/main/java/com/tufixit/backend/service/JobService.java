package com.tufixit.backend.service;

import com.tufixit.backend.dto.JobDTO;
import com.tufixit.backend.entity.*;
import com.tufixit.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final BidRepository bidRepository;
    private final ReviewRepository reviewRepository;
    private final EscrowTransactionRepository escrowRepository;

    private final SecureRandom random = new SecureRandom();

    @Transactional
    public JobDTO.JobResponse createJob(JobDTO.CreateJobRequest request) {
        User client = getCurrentUser();

        Job job = Job.builder()
                .client(client)
                .title(request.getTitle())
                .description(request.getDescription())
                .skillType(request.getSkillType())
                .status(Job.JobStatus.PENDING)
                .beforeImages(request.getBeforeImages())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .locationName(request.getLocationName())
                .preferredTime(request.getPreferredTime())
                .isUrgent(request.getIsUrgent())
                .estimatedDurationHours(request.getEstimatedDurationHours())
                .allowBidding(request.getAllowBidding())
                .budgetMin(request.getBudgetMin())
                .budgetMax(request.getBudgetMax())
                .build();

        job = jobRepository.save(job);

        return mapToJobResponse(job);
    }

    public JobDTO.JobResponse getJobById(Long jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));
        return mapToJobResponse(job);
    }

    public Page<JobDTO.JobResponse> getClientJobs(Pageable pageable) {
        User client = getCurrentUser();
        return jobRepository.findByClientId(client.getId(), pageable)
                .map(this::mapToJobResponse);
    }

    public Page<JobDTO.JobResponse> getWorkerJobs(Pageable pageable) {
        User worker = getCurrentUser();
        return jobRepository.findByAssignedWorkerId(worker.getId(), pageable)
                .map(this::mapToJobResponse);
    }

    public Page<JobDTO.JobResponse> getOpenJobs(Pageable pageable) {
        // Returns admin-approved (BIDDING) listings visible to public
        return jobRepository.findByStatus(Job.JobStatus.BIDDING, pageable)
                .map(this::mapToJobResponse);
    }

    public Page<JobDTO.JobResponse> getAdminPendingJobs(Pageable pageable) {
        return jobRepository.findByStatus(Job.JobStatus.PENDING, pageable)
                .map(this::mapToJobResponse);
    }

    public Page<JobDTO.JobResponse> getAllJobsAdmin(Pageable pageable) {
        return jobRepository.findAll(pageable)
                .map(this::mapToJobResponse);
    }

    public List<JobDTO.JobResponse> getNearbyJobs(Double latitude, Double longitude, Double radiusKm) {
        return jobRepository.findNearbyJobs(latitude, longitude, radiusKm)
                .stream()
                .map(this::mapToJobResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public JobDTO.BidResponse placeBid(Long jobId, JobDTO.BidRequest request) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (!job.getAllowBidding()) {
            throw new RuntimeException("Bidding is not allowed for this job");
        }

        User worker = getCurrentUser();

        if (bidRepository.existsByJobIdAndWorkerId(jobId, worker.getId())) {
            throw new RuntimeException("You have already placed a bid on this job");
        }

        Bid bid = Bid.builder()
                .job(job)
                .worker(worker)
                .bidAmount(request.getBidAmount())
                .proposal(request.getProposal())
                .estimatedDays(request.getEstimatedDays())
                .status(Bid.BidStatus.PENDING)
                .isWinning(false)
                .build();

        bid = bidRepository.save(bid);

        // Update job status to bidding if still pending
        if (job.getStatus() == Job.JobStatus.PENDING) {
            job.setStatus(Job.JobStatus.BIDDING);
            jobRepository.save(job);
        }

        return mapToBidResponse(bid);
    }

    public List<JobDTO.BidResponse> getJobBids(Long jobId) {
        return bidRepository.findByJobId(jobId)
                .stream()
                .map(this::mapToBidResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public JobDTO.JobResponse acceptBid(Long jobId, Long bidId, JobDTO.AcceptBidRequest request) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        User client = getCurrentUser();
        if (!job.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("You are not authorized to accept bids for this job");
        }

        Bid bid = bidRepository.findById(bidId)
                .orElseThrow(() -> new RuntimeException("Bid not found"));

        // Update bid status
        bid.setStatus(Bid.BidStatus.ACCEPTED);
        bid.setIsWinning(true);
        bidRepository.save(bid);

        // Update other bids as rejected
        bidRepository.findByJobId(jobId).forEach(b -> {
            if (!b.getId().equals(bidId)) {
                b.setStatus(Bid.BidStatus.REJECTED);
                bidRepository.save(b);
            }
        });

        // Generate PINs
        String startPin = String.format("%04d", random.nextInt(10000));
        String completionPin = String.format("%04d", random.nextInt(10000));

        // Update job
        job.setAssignedWorker(bid.getWorker());
        job.setStatus(Job.JobStatus.ACCEPTED);
        job.setAgreedPrice(request.getAgreedPrice());
        job.setMaterialCost(request.getMaterialCost());
        job.setLaborCost(request.getLaborCost());
        job.setStartPin(startPin);
        job.setCompletionPin(completionPin);

        job = jobRepository.save(job);

        return mapToJobResponse(job);
    }

    @Transactional
    public JobDTO.JobResponse startJob(Long jobId, JobDTO.StartJobRequest request) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        User worker = getCurrentUser();
        if (!job.getAssignedWorker().getId().equals(worker.getId())) {
            throw new RuntimeException("You are not authorized to start this job");
        }

        // Verify start PIN
        if (!request.getStartPin().equals(job.getStartPin())) {
            throw new RuntimeException("Invalid start PIN");
        }

        job.setStatus(Job.JobStatus.IN_PROGRESS);
        job.setStartTime(java.time.LocalDateTime.now());
        job.setStartLatitude(request.getLatitude());
        job.setStartLongitude(request.getLongitude());

        job = jobRepository.save(job);

        return mapToJobResponse(job);
    }

    @Transactional
    public JobDTO.JobResponse completeJob(Long jobId, JobDTO.CompleteJobRequest request) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        User worker = getCurrentUser();
        if (!job.getAssignedWorker().getId().equals(worker.getId())) {
            throw new RuntimeException("You are not authorized to complete this job");
        }

        // Verify completion PIN
        if (!request.getCompletionPin().equals(job.getCompletionPin())) {
            throw new RuntimeException("Invalid completion PIN");
        }

        job.setStatus(Job.JobStatus.COMPLETED);
        job.setCompletionTime(java.time.LocalDateTime.now());
        job.setAfterImages(request.getAfterImages());

        // Update worker stats
        worker.setTotalJobsCompleted(worker.getTotalJobsCompleted() + 1);
        userRepository.save(worker);

        job = jobRepository.save(job);

        // Update escrow status
        escrowRepository.findByJobId(jobId).ifPresent(escrow -> {
            escrow.setStatus(EscrowTransaction.TransactionStatus.COMPLETED);
            escrowRepository.save(escrow);
        });

        return mapToJobResponse(job);
    }

    @Transactional
    public JobDTO.JobResponse addReview(Long jobId, JobDTO.ReviewRequest request) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (job.getStatus() != Job.JobStatus.COMPLETED) {
            throw new RuntimeException("Job must be completed before leaving a review");
        }

        User reviewer = getCurrentUser();
        User reviewedUser;

        if (request.getIsClientReview()) {
            // Client reviewing worker
            if (!job.getClient().getId().equals(reviewer.getId())) {
                throw new RuntimeException("Only the client can leave a client review");
            }
            reviewedUser = job.getAssignedWorker();
        } else {
            // Worker reviewing client
            if (!job.getAssignedWorker().getId().equals(reviewer.getId())) {
                throw new RuntimeException("Only the worker can leave a worker review");
            }
            reviewedUser = job.getClient();
        }

        Review review = Review.builder()
                .job(job)
                .reviewer(reviewer)
                .reviewedUser(reviewedUser)
                .rating(request.getRating())
                .comment(request.getComment())
                .isClientReview(request.getIsClientReview())
                .build();

        reviewRepository.save(review);

        // Update user trust score
        updateTrustScore(reviewedUser.getId());

        return mapToJobResponse(job);
    }

    @Transactional
    public JobDTO.JobResponse updateJobStatus(Long jobId, String statusStr) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));
        try {
            Job.JobStatus newStatus = Job.JobStatus.valueOf(statusStr.toUpperCase());
            job.setStatus(newStatus);
            job = jobRepository.save(job);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + statusStr);
        }
        return mapToJobResponse(job);
    }

    private void updateTrustScore(Long userId) {
        Double avgRating = reviewRepository.getAverageRatingByUserId(userId);
        Integer reviewCount = reviewRepository.getReviewCountByUserId(userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setTrustScore(avgRating != null ? avgRating : 0.0);
        user.setTotalReviews(reviewCount != null ? reviewCount : 0);

        userRepository.save(user);
    }

    private User getCurrentUser() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(principal)
                .orElseGet(() -> userRepository.findByPhoneNumber(principal)
                        .orElseThrow(() -> new RuntimeException("User not found")));
    }

    private JobDTO.JobResponse mapToJobResponse(Job job) {
        List<Bid> bids = bidRepository.findByJobId(job.getId());
        
        return JobDTO.JobResponse.builder()
                .id(job.getId())
                .clientId(job.getClient().getId())
                .clientName(job.getClient().getFirstName() + " " + job.getClient().getLastName())
                .clientPhone(job.getClient().getPhoneNumber())
                .title(job.getTitle())
                .description(job.getDescription())
                .skillType(job.getSkillType())
                .status(job.getStatus())
                .beforeImages(job.getBeforeImages())
                .address(job.getAddress())
                .latitude(job.getLatitude())
                .longitude(job.getLongitude())
                .locationName(job.getLocationName())
                .preferredTime(job.getPreferredTime())
                .isUrgent(job.getIsUrgent())
                .estimatedDurationHours(job.getEstimatedDurationHours())
                .allowBidding(job.getAllowBidding())
                .budgetMin(job.getBudgetMin())
                .budgetMax(job.getBudgetMax())
                .assignedWorkerId(job.getAssignedWorker() != null ? job.getAssignedWorker().getId() : null)
                .assignedWorkerName(job.getAssignedWorker() != null ? 
                        job.getAssignedWorker().getFirstName() + " " + job.getAssignedWorker().getLastName() : null)
                .agreedPrice(job.getAgreedPrice())
                .materialCost(job.getMaterialCost())
                .laborCost(job.getLaborCost())
                .startPin(job.getStartPin())
                .completionPin(job.getCompletionPin())
                .startTime(job.getStartTime())
                .completionTime(job.getCompletionTime())
                .afterImages(job.getAfterImages())
                .createdAt(job.getCreatedAt())
                .bids(bids.stream().map(this::mapToBidResponse).collect(Collectors.toList()))
                .build();
    }

    private JobDTO.BidResponse mapToBidResponse(Bid bid) {
        return JobDTO.BidResponse.builder()
                .id(bid.getId())
                .jobId(bid.getJob().getId())
                .workerId(bid.getWorker().getId())
                .workerName(bid.getWorker().getFirstName() + " " + bid.getWorker().getLastName())
                .workerProfileImage(bid.getWorker().getProfileImage())
                .workerTrustScore(bid.getWorker().getTrustScore())
                .workerTotalJobs(bid.getWorker().getTotalJobsCompleted())
                .bidAmount(bid.getBidAmount())
                .proposal(bid.getProposal())
                .estimatedDays(bid.getEstimatedDays())
                .status(bid.getStatus())
                .isWinning(bid.getIsWinning())
                .createdAt(bid.getCreatedAt())
                .build();
    }
}
