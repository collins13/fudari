package com.tufixit.backend.controller;

import com.tufixit.backend.dto.BookingDTO;
import com.tufixit.backend.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public booking endpoints — no login required.
 * Base path: /api/bookings
 */
@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /**
     * POST /api/bookings/public
     * Customer submits a booking request to a specific artisan.
     */
    @PostMapping("/public")
    public ResponseEntity<BookingDTO.BookingTrackResponse> createBooking(
            @Valid @RequestBody BookingDTO.CreateBookingRequest request) {
        BookingDTO.BookingTrackResponse response = bookingService.createBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/bookings/track/{code}
     * Customer tracks their job by booking code.
     */
    @GetMapping("/track/{code}")
    public ResponseEntity<BookingDTO.BookingTrackResponse> trackBooking(
            @PathVariable String code,
            @RequestParam(defaultValue = "false") boolean revealPhone) {
        return ResponseEntity.ok(bookingService.trackBooking(code, revealPhone));
    }

    /**
     * POST /api/bookings/{code}/cancel
     * Customer cancels their booking.
     */
    @PostMapping("/{code}/cancel")
    public ResponseEntity<BookingDTO.BookingResponse> cancelBooking(
            @PathVariable String code,
            @RequestBody(required = false) BookingDTO.CancelBookingRequest request) {
        if (request == null) request = new BookingDTO.CancelBookingRequest();
        return ResponseEntity.ok(bookingService.cancelBooking(code, request));
    }

    /**
     * POST /api/bookings/{code}/rate
     * Customer submits rating after job completion.
     */
    @PostMapping("/{code}/rate")
    public ResponseEntity<BookingDTO.BookingResponse> rateBooking(
            @PathVariable String code,
            @Valid @RequestBody BookingDTO.RateBookingRequest request) {
        return ResponseEntity.ok(bookingService.rateBooking(code, request));
    }

    /**
     * POST /api/bookings/{code}/report
     * Customer reports an issue with the job.
     */
    @PostMapping("/{code}/report")
    public ResponseEntity<BookingDTO.BookingResponse> reportIssue(
            @PathVariable String code,
            @Valid @RequestBody BookingDTO.ReportIssueRequest request) {
        return ResponseEntity.ok(bookingService.reportIssue(code, request));
    }
}
