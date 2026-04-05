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
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ListingService {

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SubscriptionRepository subscriptionRepository;

    @Transactional
    public ListingDTO.ListingResponse createListing(ListingDTO.CreateListingRequest request) {
        User artisan = getCurrentUser();
        if (artisan.getRole() != User.UserRole.WORKER) {
            throw new RuntimeException("Only workers can create listings");
        }

        // Check subscription listing limit
        int currentCount = (int) listingRepository.countByArtisanId(artisan.getId());
        int maxListings = getMaxListingsForArtisan(artisan.getId());
        if (currentCount >= maxListings) {
            throw new RuntimeException(
                "You've reached your listing limit (" + maxListings + "). Upgrade your plan for more listings.");
        }

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId()).orElse(null);
        }

        Listing listing = Listing.builder()
                .artisan(artisan)
                .title(request.getTitle())
                .category(category)
                .skillType(request.getSkillType())
                .description(request.getDescription())
                .priceStart(request.getPriceStart())
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
                .orElseThrow(() -> new RuntimeException("Listing not found"));

        if (!listing.getArtisan().getId().equals(artisan.getId()) && artisan.getRole() != User.UserRole.ADMIN) {
            throw new RuntimeException("You can only edit your own listings");
        }

        if (request.getTitle() != null) listing.setTitle(request.getTitle());
        if (request.getCategoryId() != null) {
            Category cat = categoryRepository.findById(request.getCategoryId()).orElse(null);
            listing.setCategory(cat);
        }
        if (request.getSkillType() != null) listing.setSkillType(request.getSkillType());
        if (request.getDescription() != null) listing.setDescription(request.getDescription());
        if (request.getPriceStart() != null) listing.setPriceStart(request.getPriceStart());
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
                .orElseThrow(() -> new RuntimeException("Listing not found"));

        if (!listing.getArtisan().getId().equals(user.getId()) && user.getRole() != User.UserRole.ADMIN) {
            throw new RuntimeException("You can only delete your own listings");
        }

        listingRepository.delete(listing);
    }

    public ListingDTO.ListingResponse getListingById(Long listingId) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new RuntimeException("Listing not found"));
        return mapToListingResponse(listing);
    }

    public Page<ListingDTO.ListingResponse> getApprovedListings(Pageable pageable) {
        return listingRepository.findAllApprovedRanked(pageable)
                .map(this::mapToListingResponse);
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
        return listingRepository.searchListingsRanked(
                skillStr, categoryId, location, pageable)
                .map(this::mapToListingResponse);
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
                .orElseThrow(() -> new RuntimeException("Listing not found"));
        listing.setStatus(Listing.ListingStatus.APPROVED);
        listing = listingRepository.save(listing);
        return mapToListingResponse(listing);
    }

    @Transactional
    public ListingDTO.ListingResponse rejectListing(Long listingId) {
        Listing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new RuntimeException("Listing not found"));
        listing.setStatus(Listing.ListingStatus.REJECTED);
        listing = listingRepository.save(listing);
        return mapToListingResponse(listing);
    }

    @Transactional
    public void incrementViewCount(Long listingId) {
        Listing listing = listingRepository.findById(listingId).orElse(null);
        if (listing != null) {
            listing.setViewCount(listing.getViewCount() + 1);
            listingRepository.save(listing);
        }
    }

    private ListingDTO.ListingResponse mapToListingResponse(Listing listing) {
        User artisan = listing.getArtisan();
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
            default -> skillType;
        };
    }

    private User getCurrentUser() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByPhoneNumber(principal))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private int getMaxListingsForArtisan(Long artisanId) {
        return subscriptionRepository
                .findByArtisanIdAndStatus(artisanId, Subscription.SubscriptionStatus.ACTIVE)
                .map(Subscription::getMaxListings)
                .orElse(1); // Default to FREE if no subscription
    }
}
