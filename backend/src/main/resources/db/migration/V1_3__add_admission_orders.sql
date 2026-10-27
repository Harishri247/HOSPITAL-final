-- HPMS Migration: Add Inpatient Admission Orders
-- Enforces clinical workflow: Doctor decides admission -> Doctor creates admission order -> Bed assignment proceeds

CREATE TABLE IF NOT EXISTS admission_orders (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    diagnosis VARCHAR(255) NOT NULL,
    recommended_ward_type VARCHAR(50),
    priority VARCHAR(30) NOT NULL DEFAULT 'ROUTINE',
    status VARCHAR(30) NOT NULL DEFAULT 'ORDERED',
    notes TEXT,
    assigned_bed_id BIGINT REFERENCES beds(id),
    assigned_ward_id BIGINT REFERENCES wards(id),
    assigned_by BIGINT REFERENCES users(id),
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    admitted_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admission_order_patient ON admission_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_admission_order_doctor ON admission_orders(doctor_id);
CREATE INDEX IF NOT EXISTS idx_admission_order_status ON admission_orders(status);
