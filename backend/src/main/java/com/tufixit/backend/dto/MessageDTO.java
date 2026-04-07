package com.tufixit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class MessageDTO {

    /** Sent from the client over WebSocket STOMP — deserialized by Jackson */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendMessageRequest {
        @NotNull(message = "receiverId is required")
        private Long receiverId;

        @NotBlank(message = "content must not be blank")
        private String content;

        private String bookingCode;

        /**
         * Client-generated temporary ID for the optimistic bubble.
         * Echoed back so the frontend can replace the optimistic entry
         * with the confirmed one (prevents doubling).
         */
        private String pendingId;
    }

    /** Returned to both sender and receiver over STOMP + REST history */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageResponse {
        private Long id;
        private Long senderId;
        private String senderName;
        private String senderAvatar;
        private Long receiverId;
        private String receiverName;
        private String content;
        private Boolean isRead;
        private String bookingCode;
        private LocalDateTime createdAt;
        private String pendingId;

        public static MessageResponse of(Long id, Long senderId, String senderName,
                String senderAvatar, Long receiverId, String receiverName,
                String content, Boolean isRead, String bookingCode,
                LocalDateTime createdAt, String pendingId) {
            return new MessageResponse(id, senderId, senderName, senderAvatar,
                    receiverId, receiverName, content, isRead, bookingCode, createdAt, pendingId);
        }
    }

    /** One row in the inbox / conversation list */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversationSummary {
        private Long partnerId;
        private String partnerName;
        private String partnerAvatar;
        private String partnerRole;
        private String lastMessage;
        private LocalDateTime lastMessageAt;
        private long unreadCount;

        public static ConversationSummary of(Long partnerId, String partnerName,
                String partnerAvatar, String partnerRole, String lastMessage,
                LocalDateTime lastMessageAt, long unreadCount) {
            return new ConversationSummary(partnerId, partnerName, partnerAvatar,
                    partnerRole, lastMessage, lastMessageAt, unreadCount);
        }
    }

    /** Total unread count for the badge in the nav */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnreadCountResponse {
        private long unreadCount;
    }
}
