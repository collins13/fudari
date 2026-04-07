package com.tufixit.backend.controller;

import com.tufixit.backend.dto.MessageDTO;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.UserRepository;
import com.tufixit.backend.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * Handles inbound STOMP messages on /app/chat.send
 *
 * Flow:
 *   Client → STOMP SEND /app/chat.send  (with JWT in CONNECT header)
 *   Server → persists message via MessageService
 *   Server → SimpMessagingTemplate pushes to /user/{receiver}/queue/messages
 *   Receiver's browser receives it on its subscribed /user/queue/messages
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final MessageService messageService;
    private final UserRepository userRepository;

    @MessageMapping("/chat.send")
    public void handleMessage(@Valid @Payload MessageDTO.SendMessageRequest request,
                              Principal principal) {
        if (principal == null) {
            log.warn("[WS] Unauthenticated message rejected");
            return;
        }

        String username = principal.getName();
        User sender = userRepository.findByEmail(username)
                .or(() -> userRepository.findByPhoneNumber(username))
                .orElse(null);

        if (sender == null) {
            log.warn("[WS] Sender not found for principal: {}", username);
            return;
        }

        messageService.sendMessage(sender.getId(), request);
    }
}
