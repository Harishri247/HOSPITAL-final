package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.NotificationDto.NotificationRequest;
import com.hospital.hpms.dto.NotificationDto.NotificationResponse;
import com.hospital.hpms.entity.Notification;
import com.hospital.hpms.entity.NotificationType;
import com.hospital.hpms.entity.Priority;
import com.hospital.hpms.repository.NotificationRepository;
import com.hospital.hpms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional
    public NotificationResponse sendNotification(NotificationRequest request) {
        Notification notification = Notification.builder()
                .userId(request.getUserId())
                .message(request.getMessage())
                .type(request.getType())
                .priority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM)
                .isRead(false)
                .createdDate(LocalDateTime.now())
                .build();

        Notification saved = notificationRepository.save(notification);
        mockDispatchExternal(request.getUserId(), request.getMessage(), request.getType());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void sendNotification(Long userId, String message, NotificationType type, Priority priority) {
        Notification notification = Notification.builder()
                .userId(userId)
                .message(message)
                .type(type)
                .priority(priority != null ? priority : Priority.MEDIUM)
                .isRead(false)
                .createdDate(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);
        mockDispatchExternal(userId, message, type);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedDateDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedDateDesc(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedDateDesc(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    private void mockDispatchExternal(Long userId, String message, NotificationType type) {
        // Requirement 16: Local/mock external notification provider for SMS/Email
        log.info("[MOCK DISPATCH - SMS/Email] Target User ID: {}, Type: {}, Payload: {}", userId, type, message);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .message(n.getMessage())
                .type(n.getType())
                .isRead(n.isRead())
                .priority(n.getPriority())
                .createdDate(n.getCreatedDate())
                .build();
    }
}
