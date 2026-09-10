package com.hospital.hpms.service;

import com.hospital.hpms.dto.AdminDto.AuditLogResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AuditLogService {
    void log(Long userId, String action, String entityType, Long entityId, String oldValue, String newValue);
    List<AuditLogResponse> getAllLogs();
    Page<AuditLogResponse> getAllLogs(Pageable pageable);
    List<AuditLogResponse> getLogsByUser(Long userId);
}
