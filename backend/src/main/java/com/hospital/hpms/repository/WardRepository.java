package com.hospital.hpms.repository;

import com.hospital.hpms.entity.Ward;
import com.hospital.hpms.entity.WardType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WardRepository extends JpaRepository<Ward, Long> {
    List<Ward> findByWardType(WardType wardType);
    List<Ward> findByDepartmentId(Long departmentId);
    java.util.Optional<Ward> findByWardName(String wardName);
}
