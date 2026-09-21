package com.tufixit.backend.repository;

import com.tufixit.backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    /** Full thread between two users, oldest first */
    @Query("""
        SELECT m FROM Message m
        WHERE (m.sender.id = :userA AND m.receiver.id = :userB)
           OR (m.sender.id = :userB AND m.receiver.id = :userA)
        ORDER BY m.createdAt ASC
        """)
    List<Message> findThread(@Param("userA") Long userA, @Param("userB") Long userB);

    /**
     * Latest message per conversation partner for the inbox list.
     * Returns columns: [0]=id, [1]=sender_id, [2]=receiver_id, [3]=content,
     *                  [4]=is_read, [5]=booking_code, [6]=created_at, [7]=partner_id
     *
     * DISTINCT ON (partner_id) requires partner_id first in ORDER BY,
     * then created_at DESC to pick the newest message per partner.
     */
    @Query(value = """
        SELECT DISTINCT ON (partner_id)
               m.id,
               m.sender_id,
               m.receiver_id,
               m.content,
               m.is_read,
               m.booking_code,
               m.created_at,
               CASE WHEN m.sender_id = :userId THEN m.receiver_id ELSE m.sender_id END AS partner_id
        FROM messages m
        WHERE m.sender_id = :userId OR m.receiver_id = :userId
        ORDER BY partner_id, m.created_at DESC
        """, nativeQuery = true)
    List<Object[]> findInboxRaw(@Param("userId") Long userId);

    /** Count of unread messages sent TO this user */
    long countByReceiverIdAndIsReadFalse(Long receiverId);

    /** Count unread in a specific thread */
    long countBySenderIdAndReceiverIdAndIsReadFalse(Long senderId, Long receiverId);

    /** Mark all messages in a thread (from the other user) as read */
    @Modifying
    @Query("""
        UPDATE Message m SET m.isRead = true
        WHERE m.sender.id = :senderId AND m.receiver.id = :receiverId AND m.isRead = false
        """)
    int markThreadAsRead(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);
}
