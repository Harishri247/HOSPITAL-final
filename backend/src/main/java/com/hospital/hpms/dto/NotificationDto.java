package com.hospital.hpms.dto;

import com.hospital.hpms.entity.NotificationType;
import com.hospital.hpms.entity.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

public class NotificationDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NotificationRequest {
        @NotNull(message = "User ID is required")
        private Long userId;

        @NotBlank(message = "Message is required")
        private String message;

        @NotNull(message = "Type is required")
        private NotificationType type;

        private Priority priority;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NotificationResponse {
        private Long id;
        private Long userId;
        private String message;
        private NotificationType type;
        private boolean isRead;
        private Priority priority;
        private LocalDateTime createdDate;
    }
}
