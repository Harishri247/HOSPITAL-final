package com.hospital.hpms.repository;

import com.hospital.hpms.entity.Bill;
import com.hospital.hpms.entity.BillStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface BillRepository extends JpaRepository<Bill, Long> {
    List<Bill> findByPatientId(Long patientId);
    List<Bill> findByStatus(BillStatus status);
    java.util.Optional<Bill> findByAppointmentId(Long appointmentId);

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) FROM Bill b")
    BigDecimal getTotalBilledAmount();

    @Query("SELECT COALESCE(SUM(b.paidAmount), 0) FROM Bill b")
    BigDecimal getTotalRevenueCollected();

    @Query("SELECT COALESCE(SUM(b.balanceAmount), 0) FROM Bill b WHERE b.status != 'PAID'")
    BigDecimal getTotalOutstandingAmount();
}
