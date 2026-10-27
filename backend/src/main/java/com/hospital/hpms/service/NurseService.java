package com.hospital.hpms.service;

import com.hospital.hpms.dto.NurseDto.*;
import com.hospital.hpms.security.UserPrincipal;

import java.util.List;

public interface NurseService {

    NurseDashboardResponse getDashboardData(UserPrincipal principal);

    List<AssignedWardPatientDto> getAssignedPatients(UserPrincipal principal);

    NursePatientCareContextResponse getPatientCareContext(Long patientId, UserPrincipal principal);

    VitalSignResponse recordVitalSigns(VitalSignRequest request, UserPrincipal principal);

    List<VitalSignResponse> getPatientVitals(Long patientId, UserPrincipal principal);

    List<VitalSignResponse> getActiveVitalAlerts(UserPrincipal principal);

    VitalSignResponse respondToVitalAlert(Long alertId, AlertResponseRequest request, UserPrincipal principal);

    List<MedScheduleItemDto> getMedicationSchedule(UserPrincipal principal);

    MedicationAdministrationResponse administerMedication(MedicationAdministrationRequest request, UserPrincipal principal);

    List<MedicationAdministrationResponse> getPatientMedicationAdministrations(Long patientId, UserPrincipal principal);

    NursingNoteResponse addNursingNote(NursingNoteRequest request, UserPrincipal principal);

    List<NursingNoteResponse> getPatientNursingNotes(Long patientId, UserPrincipal principal);
}
