package com.hospital.hpms.repository;

import com.hospital.hpms.entity.NursingNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NursingNoteRepository extends JpaRepository<NursingNote, Long> {

    List<NursingNote> findByPatientIdOrderByRecordedAtDesc(Long patientId);

    List<NursingNote> findByRecordedAtBetweenOrderByRecordedAtDesc(LocalDateTime start, LocalDateTime end);
}
