package com.hospital.hpms.repository;

import com.hospital.hpms.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {
    List<Medicine> findByCategory(String category);
    java.util.Optional<Medicine> findByName(String name);
    boolean existsByName(String name);

    @Query("SELECT m FROM Medicine m WHERE m.stockQuantity <= m.minThreshold")
    List<Medicine> findLowStockMedicines();

    @Query("SELECT m FROM Medicine m WHERE " +
           "(cast(:query as string) IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.genericName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.category) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Medicine> searchMedicines(@Param("query") String query);
}
