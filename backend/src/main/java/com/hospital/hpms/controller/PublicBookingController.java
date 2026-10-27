package com.hospital.hpms.controller;

import com.hospital.hpms.dto.AppointmentDto.AvailableSlotResponse;
import com.hospital.hpms.dto.DirectBookingDto.DirectBookingRequest;
import com.hospital.hpms.dto.DirectBookingDto.DirectBookingResponse;
import com.hospital.hpms.security.UserPrincipal;
import com.hospital.hpms.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicBookingController {

    private final AppointmentService appointmentService;

    @PostMapping("/opd-schedule")
    public ResponseEntity<DirectBookingResponse> directOpdBooking(
            @Valid @RequestBody DirectBookingRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        Long currentUserId = principal != null ? principal.getId() : null;
        DirectBookingResponse response = appointmentService.directOpdBooking(request, currentUserId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/available-slots")
    public ResponseEntity<List<AvailableSlotResponse>> getAvailableSlots(
            @RequestParam Long doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<AvailableSlotResponse> slots = appointmentService.getAvailableSlots(doctorId, date);
        return ResponseEntity.ok(slots);
    }
}
