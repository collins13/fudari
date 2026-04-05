package com.tufixit.backend.dto;

import com.tufixit.backend.entity.Bid;
import com.tufixit.backend.entity.Job;
import com.tufixit.backend.entity.WorkerSkill;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class JobDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateJobRequest {
        @NotBlank(message = "Title is required")
        private String title;
        
        @NotBlank(message = "Description is required")
        private String description;
        
        @NotNull(message = "Skill type is required")
        private WorkerSkill.SkillType skillType;
        
        private String beforeImages; // JSON array of image URLs
        private String address;
        private Double latitude;
        private Double longitude;
        private String locationName;
        private String preferredTime;
        private Boolean isUrgent = false;
        private Integer estimatedDurationHours;
        private Boolean allowBidding = true;
        private String budgetMin;
        private String budgetMax;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class JobResponse {
        private Long id;
        private Long clientId;
        private String clientName;
        private String clientPhone;
        private String title;
        private String description;
        private WorkerSkill.SkillType skillType;
        private Job.JobStatus status;
        private String beforeImages;
        private String address;
        private Double latitude;
        private Double longitude;
        private String locationName;
        private String preferredTime;
        private Boolean isUrgent;
        private Integer estimatedDurationHours;
        private Boolean allowBidding;
        private String budgetMin;
        private String budgetMax;
        private Long assignedWorkerId;
        private String assignedWorkerName;
        private String agreedPrice;
        private String materialCost;
        private String laborCost;
        private String startPin;
        private String completionPin;
        private LocalDateTime startTime;
        private LocalDateTime completionTime;
        private String afterImages;
        private LocalDateTime createdAt;
        private List<BidResponse> bids;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BidRequest {
        @NotBlank(message = "Bid amount is required")
        private String bidAmount;
        
        private String proposal;
        private Integer estimatedDays;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BidResponse {
        private Long id;
        private Long jobId;
        private Long workerId;
        private String workerName;
        private String workerProfileImage;
        private Double workerTrustScore;
        private Integer workerTotalJobs;
        private String bidAmount;
        private String proposal;
        private Integer estimatedDays;
        private Bid.BidStatus status;
        private Boolean isWinning;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AcceptBidRequest {
        @NotBlank(message = "Agreed price is required")
        private String agreedPrice;
        
        private String materialCost;
        private String laborCost;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StartJobRequest {
        @NotBlank(message = "Start PIN is required")
        private String startPin;
        
        private Double latitude;
        private Double longitude;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CompleteJobRequest {
        @NotBlank(message = "Completion PIN is required")
        private String completionPin;
        
        private String afterImages;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReviewRequest {
        @NotNull(message = "Rating is required")
        private Integer rating; // 1-5

        private String comment;
        private Boolean isClientReview;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReviewResponse {
        private Long id;
        private Long jobId;
        private String jobTitle;
        private Long reviewerId;
        private String reviewerName;
        private Integer rating;
        private String comment;
        private Boolean isClientReview;
        private LocalDateTime createdAt;
    }
}
