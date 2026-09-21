package com.tufixit.backend.service;

import com.tufixit.backend.dto.MessageDTO;
import com.tufixit.backend.entity.Message;
import com.tufixit.backend.entity.User;
import com.tufixit.backend.repository.MessageRepository;
import com.tufixit.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Persist a message and push it to the receiver's private STOMP topic.
     * Called from both the REST endpoint and the WebSocket controller.
     */
    @Transactional
    public MessageDTO.MessageResponse sendMessage(Long senderId, MessageDTO.SendMessageRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found: " + request.getReceiverId()));

        Message message = Message.builder()
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent().trim())
                .bookingCode(request.getBookingCode())
                .isRead(false)
                .build();

        message = messageRepository.save(message);
        MessageDTO.MessageResponse baseResponse = toResponse(message);

        // Push confirmed message to the RECEIVER (no pendingId — it's new to them)
        messagingTemplate.convertAndSendToUser(
                stompPrincipal(receiver),
                "/queue/messages",
                baseResponse
        );

        // Echo confirmed message back to the SENDER with pendingId so they can
        // replace the optimistic bubble instead of appending a duplicate.
        MessageDTO.MessageResponse senderResponse = MessageDTO.MessageResponse.of(
                baseResponse.getId(),
                baseResponse.getSenderId(),
                baseResponse.getSenderName(),
                baseResponse.getSenderAvatar(),
                baseResponse.getReceiverId(),
                baseResponse.getReceiverName(),
                baseResponse.getContent(),
                baseResponse.getIsRead(),
                baseResponse.getBookingCode(),
                baseResponse.getCreatedAt(),
                request.getPendingId()   // echoed for dedup
        );

        messagingTemplate.convertAndSendToUser(
                stompPrincipal(sender),
                "/queue/messages",
                senderResponse
        );

        log.debug("[CHAT] {} → {} (pendingId={})", sender.getId(), receiver.getId(), request.getPendingId());
        return baseResponse;
    }

    /** Full thread between caller and a partner, oldest first. Marks thread as read. */
    @Transactional
    public List<MessageDTO.MessageResponse> getThread(Long currentUserId, Long partnerId) {
        // Mark incoming messages from partner as read
        messageRepository.markThreadAsRead(partnerId, currentUserId);

        return messageRepository.findThread(currentUserId, partnerId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Inbox: one summary row per conversation partner */
    @Transactional(readOnly = true)
    public List<MessageDTO.ConversationSummary> getInbox(Long currentUserId) {
        List<Object[]> rows = messageRepository.findInboxRaw(currentUserId);

        // Column indices from findInboxRaw:
        // [0]=id, [1]=sender_id, [2]=receiver_id, [3]=content,
        // [4]=is_read, [5]=booking_code, [6]=created_at, [7]=partner_id
        return rows.stream().map(row -> {
            Long partnerId = ((Number) row[7]).longValue();
            User partner = userRepository.findById(partnerId).orElse(null);
            if (partner == null) return null;

            String lastContent = (String) row[3];
            Object createdAtObj = row[6];
            LocalDateTime lastAt = null;
            if (createdAtObj instanceof java.sql.Timestamp ts) {
                lastAt = ts.toLocalDateTime();
            }

            long unread = messageRepository.countBySenderIdAndReceiverIdAndIsReadFalse(partnerId, currentUserId);

            return MessageDTO.ConversationSummary.of(
                    partnerId,
                    partner.getFirstName() + " " + partner.getLastName(),
                    partner.getProfileImage(),
                    partner.getRole().name(),
                    lastContent,
                    lastAt,
                    unread
            );
        }).filter(s -> s != null).collect(Collectors.toList());
    }

    /** Total unread count for the current user (nav badge) */
    @Transactional(readOnly = true)
    public MessageDTO.UnreadCountResponse getUnreadCount(Long currentUserId) {
        long count = messageRepository.countByReceiverIdAndIsReadFalse(currentUserId);
        return new MessageDTO.UnreadCountResponse(count);
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    public MessageDTO.MessageResponse toResponse(Message m) {
        return MessageDTO.MessageResponse.of(
                m.getId(),
                m.getSender().getId(),
                m.getSender().getFirstName() + " " + m.getSender().getLastName(),
                m.getSender().getProfileImage(),
                m.getReceiver().getId(),
                m.getReceiver().getFirstName() + " " + m.getReceiver().getLastName(),
                m.getContent(),
                m.getIsRead(),
                m.getBookingCode(),
                m.getCreatedAt(),
                null
        );
    }

    public User getCurrentUser() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(principal)
                .or(() -> userRepository.findByPhoneNumber(principal))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Returns the STOMP principal name for a user — must match exactly what
     * JwtTokenProvider.generateTokenFromUsername() uses as the JWT subject.
     * That method passes email when available, otherwise phone number.
     */
    private String stompPrincipal(User user) {
        return (user.getEmail() != null && !user.getEmail().isBlank())
                ? user.getEmail()
                : user.getPhoneNumber();
    }
}
