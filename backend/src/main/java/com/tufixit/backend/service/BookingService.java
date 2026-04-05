package com.tufixit.backend.service;

import com.tufixit.backend.dto.BookingDTO;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.PublicReview;
import com.tufixit.backend.entity.Subscription;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.JobRepository;
import com.tufixit.backend.repository.PublicReviewRepository;
import com.tufixit.backend.repository.SubscriptionRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingService {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PublicReviewRepository publicReviewRepository;
    private final SmsService smsService;

    // ── Customer: Create booking (no login) ──────────────────────────────────

    @Transactional
    public BookingDTO.BookingTrackResponse createBooking(BookingDTO.CreateBookingRequest req) {

        // 1. Validate artisan exists and is active
        User artisan = userRepository.findById(req.getArtisanId())
                .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .orElseThrow(() -> new IllegalArgumentException("Artisan not found or inactive"));

        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new IllegalArgumentException("Selected user is not an artisan");
        }

        // 2. Validate scheduled time if urgency = SCHEDULED
        if (req.getUrgency() == Job.UrgencyLevel.SCHEDULED && req.getScheduledTime() == null) {
            throw new IllegalArgumentException("Scheduled time is required when urgency is SCHEDULED");
        }

        // 3. Duplicate-booking guard: same customer phone + same artisan within last 1 hour
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        List<Job> recentDuplicates = jobRepository.findRecentBookingsByCustomerAndArtisan(
                req.getCustomerPhone(), req.getArtisanId(), oneHourAgo);
        if (!recentDuplicates.isEmpty()) {
            throw new IllegalStateException("You already have an active booking with this artisan. Please wait or track your existing booking.");
        }

        // 4. Generate booking code + PINs
        String bookingCode = generateBookingCode();
        String startPin = generatePin();
        String completionPin = generatePin();

        // 5. Build job entity
        Job job = Job.builder()
                .title(req.getJobDescription().length() > 80
                        ? req.getJobDescription().substring(0, 80) : req.getJobDescription())
                .description(req.getJobDescription())
                .jobDescription(req.getJobDescription())
                .customerName(req.getCustomerName())
                .customerPhone(req.getCustomerPhone())
                .customerLocation(req.getCustomerLocation())
                .address(req.getCustomerLocation())
                .urgency(req.getUrgency())
                .scheduledTime(req.getScheduledTime())
                .customerBudget(req.getBudget())
                .bookingCode(bookingCode)
                .startPin(startPin)
                .completionPin(completionPin)
                .assignedWorker(artisan)
                .status(Job.JobStatus.PENDING)
                // Booking flow does not use the bidding mechanism
                .allowBidding(false)
                .isUrgent(req.getUrgency() == Job.UrgencyLevel.NOW)
                .skillType(artisan.getSkills() != null && !artisan.getSkills().isEmpty()
                        ? artisan.getSkills().get(0).getSkillType()
                        : com.tufixit.backend.entity.WorkerSkill.SkillType.OTHER)
                // client field is required NOT NULL — use a system user placeholder via artisan
                // We reuse the artisan as a placeholder; real client is tracked via customerPhone
                .client(artisan)
                .paymentRecorded(false)
                .build();

        job = jobRepository.save(job);

        // 6. SMS artisan about new request
        smsService.notifyArtisanNewBooking(artisan.getPhoneNumber(),
                req.getCustomerName(), bookingCode);

        return toTrackResponse(job, artisan, false);
    }

    // ── Customer: Track booking ───────────────────────────────────────────────

    public BookingDTO.BookingTrackResponse trackBooking(String bookingCode, boolean revealPhone) {
        Job job = findByCode(bookingCode);
        User artisan = job.getAssignedWorker();
        return toTrackResponse(job, artisan, revealPhone);
    }

    // ── Customer: Cancel booking ──────────────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse cancelBooking(String bookingCode,
                                                     BookingDTO.CancelBookingRequest req) {
        Job job = findByCode(bookingCode);

        if (job.getStatus() != Job.JobStatus.PENDING && job.getStatus() != Job.JobStatus.ACCEPTED) {
            throw new IllegalStateException("This booking cannot be cancelled in its current state.");
        }

        String reason = req.getReason() != null ? req.getReason() : "Cancelled by customer";

        // 15-minute free cancellation window
        boolean lateCancellation = job.getCreatedAt() != null &&
                ChronoUnit.MINUTES.between(job.getCreatedAt(), LocalDateTime.now()) > 15 &&
                job.getStatus() == Job.JobStatus.ACCEPTED;

        job.setStatus(Job.JobStatus.CANCELLED);
        job.setDeclineReason(reason);
        jobRepository.save(job);

        User artisan = job.getAssignedWorker();
        smsService.notifyCancellation(artisan.getPhoneNumber(), bookingCode, reason);
        smsService.notifyCancellation(job.getCustomerPhone(), bookingCode, reason);

        String msg = lateCancellation
                ? "Booking cancelled. Note: late cancellation fee of KES 100 is payable directly to artisan."
                : "Booking cancelled successfully.";
        return BookingDTO.BookingResponse.builder().success(true).message(msg).build();
    }

    // ── Customer: Rate after completion ──────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse rateBooking(String bookingCode,
                                                   BookingDTO.RateBookingRequest req) {
        Job job = findByCode(bookingCode);

        if (job.getStatus() != Job.JobStatus.COMPLETED) {
            throw new IllegalStateException("You can only rate a completed job.");
        }

        User artisan = job.getAssignedWorker();

        // Create a public review on the artisan
        PublicReview review = PublicReview.builder()
                .artisan(artisan)
                .rating(req.getRating())
                .comment(req.getComment())
                .reviewerName(job.getCustomerName())
                .reviewerPhone(job.getCustomerPhone())
                .isVerified(true) // verified because they have the booking code
                .build();

        publicReviewRepository.save(review);

        // Update artisan trust score
        Double avg = publicReviewRepository.getAverageRatingByArtisanId(artisan.getId());
        Integer count = publicReviewRepository.getReviewCountByArtisanId(artisan.getId());
        artisan.setTrustScore(avg != null ? avg : req.getRating().doubleValue());
        artisan.setTotalReviews(count != null ? count : 1);
        userRepository.save(artisan);

        return BookingDTO.BookingResponse.builder()
                .success(true)
                .message("Thank you for your review!")
                .build();
    }

    // ── Customer: Report issue ────────────────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse reportIssue(String bookingCode,
                                                   BookingDTO.ReportIssueRequest req) {
        Job job = findByCode(bookingCode);
        job.setStatus(Job.JobStatus.DISPUTED);
        jobRepository.save(job);

        log.info("[DISPUTE] Booking {} reported: {} - {}", bookingCode, req.getReason(),
                req.getDescription());

        return BookingDTO.BookingResponse.builder()
                .success(true)
                .message("Your report has been submitted. Our team will review it within 48 hours.")
                .build();
    }

    // ── Artisan: List pending jobs ────────────────────────────────────────────

    public List<BookingDTO.ArtisanJobSummary> getPendingJobs(String principal) {
        User artisan = resolveUser(principal);
        return jobRepository.findPendingJobsForArtisan(artisan.getId())
                .stream().map(this::toArtisanSummary).collect(Collectors.toList());
    }

    // ── Artisan: List active jobs ─────────────────────────────────────────────

    public List<BookingDTO.ArtisanJobSummary> getActiveJobs(String principal) {
        User artisan = resolveUser(principal);
        return jobRepository.findActiveJobsForArtisan(artisan.getId())
                .stream().map(this::toArtisanSummary).collect(Collectors.toList());
    }

    // ── Artisan: Job history ──────────────────────────────────────────────────

    public List<BookingDTO.ArtisanJobSummary> getJobHistory(String principal) {
        User artisan = resolveUser(principal);
        return jobRepository.findHistoryJobsForArtisan(artisan.getId())
                .stream().map(this::toArtisanSummary).collect(Collectors.toList());
    }

    // ── Artisan: Get job detail ───────────────────────────────────────────────

    public BookingDTO.ArtisanJobDetail getJobDetail(Long jobId, String principal) {
        User artisan = resolveUser(principal);
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));

        if (!job.getAssignedWorker().getId().equals(artisan.getId())) {
            throw new SecurityException("Access denied");
        }

        return toArtisanDetail(job);
    }

    // ── Artisan: Accept job ───────────────────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse acceptJob(Long jobId, BookingDTO.AcceptJobRequest req,
                                                 String principal) {
        User artisan = resolveUser(principal);
        Job job = getOwnJob(jobId, artisan);

        if (job.getStatus() != Job.JobStatus.PENDING) {
            throw new IllegalStateException("Only PENDING jobs can be accepted.");
        }

        job.setStatus(Job.JobStatus.ACCEPTED);
        job.setAgreedPrice(req.getPrice().toString());
        job.setAcceptedAt(LocalDateTime.now());
        jobRepository.save(job);

        smsService.notifyCustomerAccepted(job.getCustomerPhone(),
                artisan.getFirstName() + " " + artisan.getLastName(), job.getBookingCode());

        return BookingDTO.BookingResponse.builder()
                .success(true).message("Job accepted successfully.").build();
    }

    // ── Artisan: Decline job ──────────────────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse declineJob(Long jobId, BookingDTO.DeclineJobRequest req,
                                                  String principal) {
        User artisan = resolveUser(principal);
        Job job = getOwnJob(jobId, artisan);

        if (job.getStatus() != Job.JobStatus.PENDING) {
            throw new IllegalStateException("Only PENDING jobs can be declined.");
        }

        job.setStatus(Job.JobStatus.DECLINED);
        job.setDeclineReason(req.getReason());
        jobRepository.save(job);

        smsService.notifyCustomerDeclined(job.getCustomerPhone(),
                job.getBookingCode(), req.getReason());

        return BookingDTO.BookingResponse.builder()
                .success(true).message("Job declined.").build();
    }

    // ── Artisan: Counter-offer ────────────────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse counterOffer(Long jobId, BookingDTO.CounterOfferRequest req,
                                                    String principal) {
        User artisan = resolveUser(principal);
        Job job = getOwnJob(jobId, artisan);

        if (job.getStatus() != Job.JobStatus.PENDING) {
            throw new IllegalStateException("Can only counter-offer on PENDING jobs.");
        }

        job.setCounterPrice(req.getCounterPrice());
        // Keep status PENDING until customer acknowledges — for MVP we auto-accept at counter price
        job.setAgreedPrice(req.getCounterPrice().toString());
        job.setStatus(Job.JobStatus.ACCEPTED);
        job.setAcceptedAt(LocalDateTime.now());
        jobRepository.save(job);

        smsService.notifyCustomerAccepted(job.getCustomerPhone(),
                artisan.getFirstName() + " " + artisan.getLastName(), job.getBookingCode());

        return BookingDTO.BookingResponse.builder()
                .success(true)
                .message("Counter-offer sent and job accepted at KES " + req.getCounterPrice() + ".")
                .build();
    }

    // ── Artisan: Mark arrived ─────────────────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse markArrived(Long jobId, BookingDTO.ArriveRequest req,
                                                   String principal) {
        User artisan = resolveUser(principal);
        Job job = getOwnJob(jobId, artisan);

        if (job.getStatus() != Job.JobStatus.ACCEPTED) {
            throw new IllegalStateException("Job must be ACCEPTED before marking arrived.");
        }

        job.setStatus(Job.JobStatus.ARRIVED);
        job.setArrivedAt(LocalDateTime.now());
        if (req.getLatitude() != null) job.setStartLatitude(req.getLatitude());
        if (req.getLongitude() != null) job.setStartLongitude(req.getLongitude());
        jobRepository.save(job);

        // Send START PIN to customer
        smsService.notifyCustomerArtisanArrived(job.getCustomerPhone(),
                job.getStartPin(), job.getBookingCode());

        return BookingDTO.BookingResponse.builder()
                .success(true).message("Arrival recorded. START PIN sent to customer.").build();
    }

    // ── Artisan: Enter START PIN ──────────────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse startJob(Long jobId, BookingDTO.StartJobRequest req,
                                                String principal) {
        User artisan = resolveUser(principal);
        Job job = getOwnJob(jobId, artisan);

        if (job.getStatus() != Job.JobStatus.ARRIVED) {
            throw new IllegalStateException("Mark 'Arrived' before entering the START PIN.");
        }

        if (!job.getStartPin().equals(req.getStartPin())) {
            throw new IllegalArgumentException("Invalid START PIN. Please ask the customer for the correct PIN.");
        }

        job.setStatus(Job.JobStatus.IN_PROGRESS);
        job.setStartTime(LocalDateTime.now());
        jobRepository.save(job);

        return BookingDTO.BookingResponse.builder()
                .success(true).message("Job started. COMPLETION PIN will be given at the end.").build();
    }

    // ── Artisan: Complete job + record payment ────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse completeJob(Long jobId, BookingDTO.CompleteJobRequest req,
                                                   String principal) {
        User artisan = resolveUser(principal);
        Job job = getOwnJob(jobId, artisan);

        if (job.getStatus() != Job.JobStatus.IN_PROGRESS) {
            throw new IllegalStateException("Job must be IN_PROGRESS to complete.");
        }

        if (!job.getCompletionPin().equals(req.getCompletionPin())) {
            throw new IllegalArgumentException("Invalid COMPLETION PIN. Please ask the customer for the correct PIN.");
        }

        if (req.getPaymentMethod() == Job.PaymentMethod.MPESA &&
                (req.getTransactionId() == null || req.getTransactionId().isBlank())) {
            throw new IllegalArgumentException("M-Pesa transaction ID is required for M-Pesa payments.");
        }

        job.setStatus(Job.JobStatus.COMPLETED);
        job.setCompletionTime(LocalDateTime.now());
        job.setPaymentRecorded(true);
        job.setPaymentMethod(req.getPaymentMethod());
        job.setPaymentAmount(req.getAmountReceived());
        job.setPaymentTransactionId(req.getTransactionId());

        // Update artisan job count
        artisan.setTotalJobsCompleted(
                (artisan.getTotalJobsCompleted() != null ? artisan.getTotalJobsCompleted() : 0) + 1);
        userRepository.save(artisan);

        jobRepository.save(job);

        smsService.notifyCustomerJobCompleted(job.getCustomerPhone(),
                artisan.getFirstName() + " " + artisan.getLastName(), job.getBookingCode());

        return BookingDTO.BookingResponse.builder()
                .success(true).message("Job completed and payment recorded successfully.").build();
    }

    // ── Artisan: Payment records ──────────────────────────────────────────────

    public List<BookingDTO.PaymentRecord> getPaymentRecords(String principal) {
        User artisan = resolveUser(principal);
        return jobRepository.findCompletedPaymentsForArtisan(artisan.getId())
                .stream().map(this::toPaymentRecord).collect(Collectors.toList());
    }

    // ── Admin: List all jobs ──────────────────────────────────────────────────

    public Page<BookingDTO.AdminJobView> adminListJobs(Job.JobStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return jobRepository.findAllWithOptionalStatus(status, pageable)
                .map(this::toAdminView);
    }

    // ── Admin: Get job detail ─────────────────────────────────────────────────

    public BookingDTO.AdminJobView adminGetJob(Long jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));
        return toAdminView(job);
    }

    // ── Admin: Resolve dispute ────────────────────────────────────────────────

    @Transactional
    public BookingDTO.BookingResponse adminResolveDispute(Long jobId,
                                                           BookingDTO.ResolveDisputeRequest req) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));

        User artisan = job.getAssignedWorker();
        String action = req.getAction().toUpperCase();

        switch (action) {
            case "NO_ACTION" -> job.setStatus(Job.JobStatus.COMPLETED);
            case "WARN_ARTISAN" -> {
                job.setStatus(Job.JobStatus.COMPLETED);
                log.warn("[ADMIN] Warning issued to artisan {} for job {}",
                        artisan.getId(), job.getBookingCode());
            }
            case "SUSPEND_ARTISAN" -> {
                artisan.setIsActive(false);
                userRepository.save(artisan);
                job.setStatus(Job.JobStatus.DISPUTED);
            }
            case "REFUND_SUBSCRIPTION" -> {
                job.setStatus(Job.JobStatus.COMPLETED);
                log.info("[ADMIN] Subscription refund marked for artisan {} job {}",
                        artisan.getId(), job.getBookingCode());
            }
            default -> throw new IllegalArgumentException("Unknown action: " + action);
        }

        jobRepository.save(job);
        return BookingDTO.BookingResponse.builder()
                .success(true).message("Dispute resolved with action: " + action).build();
    }

    // ── Admin: Missing payments ───────────────────────────────────────────────

    public List<BookingDTO.AdminJobView> getMissingPayments() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(24);
        return jobRepository.findCompletedWithoutPayment(threshold)
                .stream().map(this::toAdminView).collect(Collectors.toList());
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private Job findByCode(String bookingCode) {
        return jobRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingCode));
    }

    private Job getOwnJob(Long jobId, User artisan) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found"));
        if (!job.getAssignedWorker().getId().equals(artisan.getId())) {
            throw new SecurityException("Access denied");
        }
        return job;
    }

    private User resolveUser(String principal) {
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByPhoneNumber(principal))
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + principal));
    }

    private String generateBookingCode() {
        String code;
        int attempts = 0;
        do {
            long num = 100000 + new Random().nextInt(900000);
            code = "TUF-" + num;
            attempts++;
            if (attempts > 20) throw new IllegalStateException("Could not generate unique booking code");
        } while (jobRepository.existsByBookingCode(code));
        return code;
    }

    private String generatePin() {
        int pin = new Random().nextInt(10000);
        return String.format("%04d", pin);
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────

    private BookingDTO.BookingTrackResponse toTrackResponse(Job job, User artisan, boolean revealPhone) {
        boolean isAccepted = job.getStatus() != Job.JobStatus.PENDING
                && job.getStatus() != Job.JobStatus.DECLINED;

        // Subscription tier label
        String subscriptionTier = "Bronze";
        try {
            List<Subscription> subs = subscriptionRepository.findByArtisanIdAndStatus(
                    artisan.getId(), Subscription.SubscriptionStatus.ACTIVE);
            if (!subs.isEmpty()) {
                subscriptionTier = switch (subs.get(0).getPlanType()) {
                    case PRO -> "Gold";
                    case BASIC -> "Silver";
                    default -> "Bronze";
                };
            }
        } catch (Exception ignored) {}

        return BookingDTO.BookingTrackResponse.builder()
                .jobId(job.getId())
                .bookingCode(job.getBookingCode())
                .status(job.getStatus())
                .statusLabel(statusLabel(job.getStatus()))
                .jobDescription(job.getJobDescription())
                .customerLocation(job.getCustomerLocation())
                .urgency(job.getUrgency() != null ? job.getUrgency().name() : null)
                .scheduledTime(job.getScheduledTime())
                .customerBudget(job.getCustomerBudget())
                // Artisan info — only reveal after acceptance
                .artisanName(isAccepted
                        ? artisan.getFirstName() + " " + artisan.getLastName() : null)
                .artisanPhone(isAccepted && revealPhone ? artisan.getPhoneNumber() : null)
                .artisanLocation(artisan.getLocationName())
                .artisanRating(artisan.getTrustScore())
                .agreedPrice(isAccepted && job.getAgreedPrice() != null
                        ? parseIntSafe(job.getAgreedPrice()) : null)
                // PINs — only when status requires them
                .startPin(job.getStatus() == Job.JobStatus.ARRIVED ? job.getStartPin() : null)
                .completionPin(job.getStatus() == Job.JobStatus.IN_PROGRESS ? job.getCompletionPin() : null)
                .createdAt(job.getCreatedAt())
                .acceptedAt(job.getAcceptedAt())
                .arrivedAt(job.getArrivedAt())
                .startedAt(job.getStartTime())
                .completedAt(job.getCompletionTime())
                .declineReason(job.getDeclineReason())
                .canCancel(job.getStatus() == Job.JobStatus.PENDING
                        || job.getStatus() == Job.JobStatus.ACCEPTED)
                .canRate(job.getStatus() == Job.JobStatus.COMPLETED)
                .build();
    }

    private BookingDTO.ArtisanJobSummary toArtisanSummary(Job job) {
        return BookingDTO.ArtisanJobSummary.builder()
                .id(job.getId())
                .bookingCode(job.getBookingCode())
                .customerName(job.getCustomerName())
                .customerLocation(job.getCustomerLocation())
                .jobDescription(job.getJobDescription() != null
                        ? (job.getJobDescription().length() > 100
                                ? job.getJobDescription().substring(0, 100) + "…"
                                : job.getJobDescription())
                        : job.getDescription())
                .status(job.getStatus())
                .statusLabel(statusLabel(job.getStatus()))
                .urgency(job.getUrgency())
                .scheduledTime(job.getScheduledTime())
                .customerBudget(job.getCustomerBudget())
                .agreedPrice(job.getAgreedPrice() != null ? parseIntSafe(job.getAgreedPrice()) : null)
                .createdAt(job.getCreatedAt())
                .acceptedAt(job.getAcceptedAt())
                .arrivedAt(job.getArrivedAt())
                .startedAt(job.getStartTime())
                .completedAt(job.getCompletionTime())
                .timeAgo(timeAgo(job.getCreatedAt()))
                .build();
    }

    private BookingDTO.ArtisanJobDetail toArtisanDetail(Job job) {
        return BookingDTO.ArtisanJobDetail.builder()
                .id(job.getId())
                .bookingCode(job.getBookingCode())
                .customerName(job.getCustomerName())
                .customerPhone(job.getCustomerPhone())  // artisan always sees phone
                .customerLocation(job.getCustomerLocation())
                .jobDescription(job.getJobDescription())
                .status(job.getStatus())
                .statusLabel(statusLabel(job.getStatus()))
                .urgency(job.getUrgency())
                .scheduledTime(job.getScheduledTime())
                .customerBudget(job.getCustomerBudget())
                .agreedPrice(job.getAgreedPrice() != null ? parseIntSafe(job.getAgreedPrice()) : null)
                .paymentRecorded(Boolean.TRUE.equals(job.getPaymentRecorded()))
                .paymentMethod(job.getPaymentMethod())
                .paymentTransactionId(job.getPaymentTransactionId())
                .paymentAmount(job.getPaymentAmount())
                .declineReason(job.getDeclineReason())
                .startPin(job.getStartPin())
                .completionPin(job.getCompletionPin())
                .createdAt(job.getCreatedAt())
                .acceptedAt(job.getAcceptedAt())
                .arrivedAt(job.getArrivedAt())
                .startedAt(job.getStartTime())
                .completedAt(job.getCompletionTime())
                .build();
    }

    private BookingDTO.PaymentRecord toPaymentRecord(Job job) {
        return BookingDTO.PaymentRecord.builder()
                .jobId(job.getId())
                .bookingCode(job.getBookingCode())
                .customerName(job.getCustomerName())
                .amountReceived(job.getPaymentAmount())
                .paymentMethod(job.getPaymentMethod())
                .transactionId(job.getPaymentTransactionId())
                .completedAt(job.getCompletionTime())
                .paymentRecorded(Boolean.TRUE.equals(job.getPaymentRecorded()))
                .build();
    }

    private BookingDTO.AdminJobView toAdminView(Job job) {
        User artisan = job.getAssignedWorker();
        String tier = "Bronze";
        try {
            List<Subscription> subs = subscriptionRepository.findByArtisanIdAndStatus(
                    artisan.getId(), Subscription.SubscriptionStatus.ACTIVE);
            if (!subs.isEmpty()) {
                tier = switch (subs.get(0).getPlanType()) {
                    case PRO -> "Gold";
                    case BASIC -> "Silver";
                    default -> "Bronze";
                };
            }
        } catch (Exception ignored) {}

        return BookingDTO.AdminJobView.builder()
                .id(job.getId())
                .bookingCode(job.getBookingCode())
                .customerName(job.getCustomerName())
                .customerPhone(job.getCustomerPhone())
                .customerLocation(job.getCustomerLocation())
                .jobDescription(job.getJobDescription())
                .status(job.getStatus())
                .statusLabel(statusLabel(job.getStatus()))
                .urgency(job.getUrgency())
                .scheduledTime(job.getScheduledTime())
                .customerBudget(job.getCustomerBudget())
                .agreedPrice(job.getAgreedPrice() != null ? parseIntSafe(job.getAgreedPrice()) : null)
                .artisanId(artisan.getId())
                .artisanName(artisan.getFirstName() + " " + artisan.getLastName())
                .artisanPhone(artisan.getPhoneNumber())
                .artisanSubscriptionTier(tier)
                .paymentRecorded(Boolean.TRUE.equals(job.getPaymentRecorded()))
                .paymentMethod(job.getPaymentMethod())
                .paymentTransactionId(job.getPaymentTransactionId())
                .paymentAmount(job.getPaymentAmount())
                .createdAt(job.getCreatedAt())
                .acceptedAt(job.getAcceptedAt())
                .arrivedAt(job.getArrivedAt())
                .startedAt(job.getStartTime())
                .completedAt(job.getCompletionTime())
                .declineReason(job.getDeclineReason())
                .build();
    }

    private String statusLabel(Job.JobStatus status) {
        if (status == null) return "Unknown";
        return switch (status) {
            case PENDING -> "Awaiting Response";
            case ACCEPTED -> "Accepted";
            case DECLINED -> "Declined";
            case ARRIVED -> "Artisan Arrived";
            case IN_PROGRESS -> "In Progress";
            case COMPLETED -> "Completed";
            case CANCELLED -> "Cancelled";
            case DISPUTED -> "Disputed";
            case REFUNDED -> "Refunded";
            default -> status.name();
        };
    }

    private String timeAgo(LocalDateTime dt) {
        if (dt == null) return "";
        long minutes = ChronoUnit.MINUTES.between(dt, LocalDateTime.now());
        if (minutes < 1) return "just now";
        if (minutes < 60) return minutes + " min ago";
        long hours = minutes / 60;
        if (hours < 24) return hours + " hr ago";
        long days = hours / 24;
        return days + " day" + (days > 1 ? "s" : "") + " ago";
    }

    private Integer parseIntSafe(String s) {
        try { return Integer.parseInt(s); } catch (Exception e) { return null; }
    }
}
