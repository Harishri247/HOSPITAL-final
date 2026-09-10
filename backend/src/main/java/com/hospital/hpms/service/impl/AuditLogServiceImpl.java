package com.hospital.hpms.service.impl;

import com.hospital.hpms.dto.AdminDto.AuditLogResponse;
import com.hospital.hpms.entity.AuditLog;
import com.hospital.hpms.entity.User;
import com.hospital.hpms.repository.AuditLogRepository;
import com.hospital.hpms.repository.UserRepository;
import com.hospital.hpms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Long userId, String action, String entityType, Long entityId, String oldValue, String newValue) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .userId(userId)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .oldValue(oldValue != null && oldValue.length() > 2000 ? oldValue.substring(0, 1997) + "..." : oldValue)
                    .newValue(newValue != null && newValue.length() > 2000 ? newValue.substring(0, 1997) + "..." : newValue)
                    .timestamp(LocalDateTime.now())
                    .build();
            auditLogRepository.save(auditLog);
        } catch (Exception ignored) {
            // Audit logging should never block the primary transaction
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLogResponse> getAllLogs() {
        Map<Long, String> userNames = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (existing, replacement) -> existing));

        return auditLogRepository.findAllByOrderByTimestampDesc().stream()
                .map(log -> toResponse(log, userNames))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAllLogs(Pageable pageable) {
        Map<Long, String> userNames = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (existing, replacement) -> existing));

        return auditLogRepository.findAllByOrderByTimestampDesc(pageable)
                .map(log -> toResponse(log, userNames));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLogResponse> getLogsByUser(Long userId) {
        Map<Long, String> userNames = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (existing, replacement) -> existing));

        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId).stream()
                .map(log -> toResponse(log, userNames))
                .collect(Collectors.toList());
    }

    private AuditLogResponse toResponse(AuditLog log, Map<Long, String> userNames) {
        String username = log.getUserId() != null ? userNames.getOrDefault(log.getUserId(), "System User") : "System";
        return AuditLogResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .username(username)
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .timestamp(log.getTimestamp())
                .build();
    }
}
