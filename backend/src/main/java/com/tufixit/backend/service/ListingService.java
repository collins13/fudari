package com.tufixit.backend.service;

import com.tufixit.backend.dto.ListingDTO;
import com.tufixit.backend.entity.*;
import com.tufixit.backend.repository.CategoryRepository;
import com.tufixit.backend.repository.ListingRepository;
import com.tufixit.backend.repository.SubscriptionRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ListingService {

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SubscriptionRepository subscriptionRepository;

    /** Stores the price as a plain number so the UI can format and filter on it. */
    private static String parsePriceStart(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("A starting price is required so customers know what to expect");
        }
        String digits = raw.replaceAll("[^0-9.]", "");
        double value;
        try {
            value = Double.parseDouble(digits);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Enter the starting price as a number, e.g. 1500");
        }
        if (value <= 0) {
            throw new IllegalArgumentException("Starting price must be greater than zero");
        }
        return String.valueOf(Math.round(value));
    }
    private final RankingService rankingService;

    @Transactional
    public ListingDTO.ListingResponse createListing(ListingDTO.CreateListingRequest request) {
        User artisan = getCurrentUser();
        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new IllegalStateException("Only workers can create listings");
        }

        // Check subscription listing limit
        int currentCount = (int) listingRepository.countByArtisanId(artisan.getId());
        int maxListings = getMaxListingsForArtisan(artisan.getId());
        if (currentCount >= maxListings) {
            throw new IllegalStateException(
                "You've reached your listing limit (" + maxListings + "). Upgrade your plan for more listings.");
        }

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId()).orElse(null);
        }

        String priceStart = parsePriceStart(request.getPriceStart());

        Listing listing = Listing.builder()
                .artisan(artisan)
                .title(request.getTitle())
                .category(category)
                .skillType(request.getSkillType())
                .description(request.getDescription())
                .priceStart(priceStart)
                .location(request.getLocation())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .images(request.getImages())
                .status(Listing.ListingStatus.PENDING)
                .isActive(true)
                .viewCount(0)
                .build();

        listing = listingRepository.save(listing);
        return mapToListingResponse(listing);
    }

    @Transactional
    public ListingDTO.ListingResponse updateListing(Long listingId, ListingDTO.UpdateListingRequest request) {
        User artisan = getCurrentUser();
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found"));

        if (!listing.getArtisan().getId().equals(artisan.getId()) && artisan.getRole() != User.UserRole.ADMIN) {
            throw new IllegalStateException("You can only edit your own listings");
        }

        if (request.getTitle() != null) listing.setTitle(request.getTitle());
        if (request.getCategoryId() != null) {
            Category cat = categoryRepository.findById(request.getCategoryId()).orElse(null);
            listing.setCategory(cat);
        }
        if (request.getSkillType() != null) listing.setSkillType(request.getSkillType());
        if (request.getDescription() != null) listing.setDescription(request.getDescription());
        if (request.getPriceStart() != null) listing.setPriceStart(parsePriceStart(request.getPriceStart()));
        if (request.getLocation() != null) listing.setLocation(request.getLocation());
        if (request.getLatitude() != null) listing.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) listing.setLongitude(request.getLongitude());
        if (request.getImages() != null) listing.setImages(request.getImages());

        // If artisan edits, reset to pending for re-approval
        if (artisan.getRole() != User.UserRole.ADMIN) {
            listing.setStatus(Listing.ListingStatus.PENDING);
        }

        listing = listingRepository.save(listing);
        return mapToListingResponse(listing);
    }

    @Transactional
    public void deleteListing(Long listingId) {
        User user = getCurrentUser();
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found"));

        if (!listing.getArtisan().getId().equals(user.getId()) && user.getRole() != User.UserRole.ADMIN) {
            throw new IllegalStateException("You can only delete your own listings");
        }

        listingRepository.delete(listing);
    }

    public ListingDTO.ListingResponse getListingById(Long listingId) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found"));
        return mapToListingResponse(listing);
    }

    public Page<ListingDTO.ListingResponse> getApprovedListings(Pageable pageable) {
        Page<Listing> page = listingRepository.findAllApprovedRanked(pageable);
        // Re-rank by composite score (application-level) for richer ordering
        List<ListingDTO.ListingResponse> ranked = page.getContent().stream()
                .map(this::mapToListingResponse)
                .sorted((a, b) -> Double.compare(
                        b.getRankingScore() != null ? b.getRankingScore() : 0,
                        a.getRankingScore() != null ? a.getRankingScore() : 0))
                .collect(Collectors.toList());
        return new PageImpl<>(ranked, pageable, page.getTotalElements());
    }

    public Page<ListingDTO.ListingResponse> searchListings(
            String skillType, Long categoryId, String location, Pageable pageable) {
        String skillStr = null;
        if (skillType != null && !skillType.isEmpty()) {
            try {
                WorkerSkill.SkillType.valueOf(skillType.toUpperCase());
                skillStr = skillType.toUpperCase();
            } catch (IllegalArgumentException e) {
                log.warn("Invalid skill type: {}", skillType);
            }
        }
        Page<Listing> page = listingRepository.searchListingsRanked(
                skillStr, categoryId, location, pageable);
        List<ListingDTO.ListingResponse> ranked = page.getContent().stream()
                .map(this::mapToListingResponse)
                .sorted((a, b) -> Double.compare(
                        b.getRankingScore() != null ? b.getRankingScore() : 0,
                        a.getRankingScore() != null ? a.getRankingScore() : 0))
                .collect(Collectors.toList());
        return new PageImpl<>(ranked, pageable, page.getTotalElements());
    }

    public Page<ListingDTO.ListingResponse> getMyListings(Pageable pageable) {
        User artisan = getCurrentUser();
        return listingRepository.findByArtisanIdOrderByCreatedAtDesc(artisan.getId(), pageable)
                .map(this::mapToListingResponse);
    }

    public Page<ListingDTO.ListingResponse> getPendingListings(Pageable pageable) {
        return listingRepository.findByStatus(Listing.ListingStatus.PENDING, pageable)
                .map(this::mapToListingResponse);
    }

    public Page<ListingDTO.ListingResponse> getAllListingsAdmin(Pageable pageable) {
        return listingRepository.findAll(pageable)
                .map(this::mapToListingResponse);
    }

    @Transactional
    public ListingDTO.ListingResponse approveListing(Long listingId) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found"));
        listing.setStatus(Listing.ListingStatus.APPROVED);
        listing = listingRepository.save(listing);
        return mapToListingResponse(listing);
    }

    @Transactional
    public ListingDTO.ListingResponse rejectListing(Long listingId) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found"));
        listing.setStatus(Listing.ListingStatus.REJECTED);
        listing = listingRepository.save(listing);
        return mapToListingResponse(listing);
    }

    @Transactional
    public ListingDTO.ListingResponse revokeListing(Long listingId) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found"));
        listing.setStatus(Listing.ListingStatus.REVOKED);
        listing.setIsActive(false);
        listing = listingRepository.save(listing);
        return mapToListingResponse(listing);
    }

    @Transactional
    public void incrementViewCount(Long listingId) {
        // Atomic UPDATE avoids read-modify-write race condition under concurrent load
        listingRepository.incrementViewCount(listingId);
    }

    private ListingDTO.ListingResponse mapToListingResponse(Listing listing) {
        User artisan = listing.getArtisan();
        double listingScore = rankingService.computeListingScore(listing);
        boolean featured = artisan.getVettingLevel() == User.VettingLevel.PRO;

        return ListingDTO.ListingResponse.builder()
                .id(listing.getId())
                .artisanId(artisan.getId())
                .artisanName(artisan.getFirstName() + " " + artisan.getLastName())
                .artisanPhone(artisan.getPhoneNumber())
                .artisanImage(artisan.getProfileImage())
                .artisanVettingLevel(artisan.getVettingLevel().name())
                .artisanVerified(artisan.getIsVerified())
                .title(listing.getTitle())
                .categoryId(listing.getCategory() != null ? listing.getCategory().getId() : null)
                .categoryName(listing.getCategory() != null ? listing.getCategory().getName() : null)
                .skillType(listing.getSkillType().name())
                .skillTypeLabel(skillTypeToLabel(listing.getSkillType().name()))
                .description(listing.getDescription())
                .priceStart(listing.getPriceStart())
                .location(listing.getLocation())
                .latitude(listing.getLatitude())
                .longitude(listing.getLongitude())
                .images(listing.getImages())
                .status(listing.getStatus().name())
                .isActive(listing.getIsActive())
                .viewCount(listing.getViewCount())
                .artisanRating(artisan.getTrustScore())
                .artisanTotalReviews(artisan.getTotalReviews())
                .artisanJobsCompleted(artisan.getTotalJobsCompleted())
                .createdAt(listing.getCreatedAt())
                .updatedAt(listing.getUpdatedAt())
                .rankingScore(Math.round(listingScore * 10) / 10.0)
                .isFeatured(featured)
                .build();
    }

    private String skillTypeToLabel(String skillType) {
        return switch (skillType) {
            case "ELECTRICIAN" -> "Electrician";
            case "PLUMBER" -> "Plumber";
            case "MECHANIC" -> "Mechanic";
            case "CARPENTER" -> "Carpenter";
            case "PAINTER" -> "Painter";
            case "WELDER" -> "Welder";
            case "HVAC_TECHNICIAN" -> "HVAC Technician";
            case "APPLIANCE_REPAIR" -> "Appliance Repair";
            case "ROOFING" -> "Roofing";
            case "TILING" -> "Tiling";
            case "MASON" -> "Mason";
            case "GARDENER" -> "Gardener";
            case "CLEANER" -> "Cleaner";
            case "SECURITY" -> "Security";
            case "MOVER" -> "Mover";
            case "TRANSPORT_PROVIDER" -> "Transport Provider";
            case "EVENT_LIGHTING" -> "Event Lighting";
            default -> skillType;
        };
    }

    private User getCurrentUser() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByPhoneNumber(principal))
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private int getMaxListingsForArtisan(Long artisanId) {
        return subscriptionRepository
                .findByArtisanIdAndStatus(artisanId, Subscription.SubscriptionStatus.ACTIVE)
                .map(Subscription::getMaxListings)
                .orElse(1); // Default to FREE if no subscription
    }
}
