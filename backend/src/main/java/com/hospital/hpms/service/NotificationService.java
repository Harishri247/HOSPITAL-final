package com.hospital.hpms.service;

import com.hospital.hpms.dto.NotificationDto.NotificationRequest;
import com.hospital.hpms.dto.NotificationDto.NotificationResponse;
import com.hospital.hpms.entity.NotificationType;
import com.hospital.hpms.entity.Priority;

import java.util.List;

public interface NotificationService {
    NotificationResponse sendNotification(NotificationRequest request);
    void sendNotification(Long userId, String message, NotificationType type, Priority priority);
    List<NotificationResponse> getUserNotifications(Long userId);
    List<NotificationResponse> getUnreadNotifications(Long userId);
    void markAsRead(Long notificationId);
    void markAllAsRead(Long userId);
    long getUnreadCount(Long userId);
}
