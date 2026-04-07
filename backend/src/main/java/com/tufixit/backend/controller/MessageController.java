package com.tufixit.backend.controller;

import com.tufixit.backend.dto.MessageDTO;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST endpoints for the messaging feature.
 *
 * All endpoints require a valid JWT (enforced by SecurityConfig).
 *
 * The WebSocket channel (STOMP) handles real-time delivery; these endpoints
 * handle history loading, REST-based send, and inbox listing.
 */
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    /** Send a message via REST (fallback / mobile; WebSocket is preferred) */
    @PostMapping("/send")
    public ResponseEntity<MessageDTO.MessageResponse> send(
            @Valid @RequestBody MessageDTO.SendMessageRequest request) {
        User current = messageService.getCurrentUser();
        return ResponseEntity.ok(messageService.sendMessage(current.getId(), request));
    }

    /** Conversation thread with a specific partner */
    @GetMapping("/thread/{partnerId}")
    public ResponseEntity<List<MessageDTO.MessageResponse>> getThread(
            @PathVariable Long partnerId) {
        User current = messageService.getCurrentUser();
        return ResponseEntity.ok(messageService.getThread(current.getId(), partnerId));
    }

    /** Inbox: latest message per conversation partner */
    @GetMapping("/inbox")
    public ResponseEntity<List<MessageDTO.ConversationSummary>> getInbox() {
        User current = messageService.getCurrentUser();
        return ResponseEntity.ok(messageService.getInbox(current.getId()));
    }

    /** Unread message count (for the nav badge) */
    @GetMapping("/unread")
    public ResponseEntity<MessageDTO.UnreadCountResponse> getUnreadCount() {
        User current = messageService.getCurrentUser();
        return ResponseEntity.ok(messageService.getUnreadCount(current.getId()));
    }
}
