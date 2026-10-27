-- HPMS Migration: Add Inpatient Discharge Summaries and Governance
-- Enforces clinical workflow: Doctor reviews condition -> Doctor drafts summary -> Doctor digitally signs document -> Billing checkout -> Bed release

CREATE TABLE IF NOT EXISTS discharge_summaries (
    id BIGSERIAL PRIMARY KEY,
    admission_order_id BIGINT NOT NULL REFERENCES admission_orders(id),
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    ward_id BIGINT REFERENCES wards(id),
    bed_id BIGINT REFERENCES beds(id),
    admission_date TIMESTAMP,
    discharge_date TIMESTAMP,
    admission_diagnosis VARCHAR(500),
    final_diagnosis VARCHAR(500),
    icd_code VARCHAR(50),
    hospital_course TEXT,
    condition_at_discharge VARCHAR(100),
    discharge_medications TEXT,
    discharge_instructions TEXT,
    follow_up_date DATE,
    follow_up_instructions TEXT,
    doctor_signature VARCHAR(255),
    signature_hash VARCHAR(255),
    signed_at TIMESTAMP,
    is_signed BOOLEAN NOT NULL DEFAULT FALSE,
    billing_cleared BOOLEAN NOT NULL DEFAULT FALSE,
    billing_cleared_at TIMESTAMP,
    billing_cleared_by BIGINT REFERENCES users(id),
    bill_id BIGINT REFERENCES bills(id),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discharge_summary_admission ON discharge_summaries(admission_order_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summary_patient ON discharge_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summary_doctor ON discharge_summaries(doctor_id);
CREATE INDEX IF NOT EXISTS idx_discharge_summary_status ON discharge_summaries(status);
