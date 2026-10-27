package com.hospital.hpms.repository;

import com.hospital.hpms.entity.RoleType;
import com.hospital.hpms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameIgnoreCase(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByStaffId(String staffId);
    Optional<User> findByStaffIdIgnoreCase(String staffId);
    Optional<User> findByPhoneNumber(String phoneNumber);
    Optional<User> findByUsernameOrEmailOrStaffId(String username, String email, String staffId);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByStaffId(String staffId);
    List<User> findByRole(RoleType role);
    List<User> findByDepartmentId(Long departmentId);
    long countByRole(RoleType role);
}
