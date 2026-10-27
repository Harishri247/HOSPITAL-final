-- HPMS Migration: Add Nurse Workflow Tables (Vitals, Medication Administration, Nursing Notes)
-- Supports SRS Nurse Dashboard & Clinical Care Requirements

-- 1. Vital Signs Table
CREATE TABLE IF NOT EXISTS vital_signs (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    recorded_by BIGINT REFERENCES users(id),
    temperature DOUBLE PRECISION,
    blood_pressure VARCHAR(30),
    systolic INT,
    diastolic INT,
    pulse INT,
    respiratory_rate INT,
    oxygen_saturation DOUBLE PRECISION,
    notes VARCHAR(1000),
    is_alert BOOLEAN NOT NULL DEFAULT FALSE,
    alert_severity VARCHAR(20) DEFAULT 'NORMAL',
    alert_message VARCHAR(255),
    alert_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by BIGINT REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    response_notes VARCHAR(1000),
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded_at ON vital_signs(recorded_at);
CREATE INDEX IF NOT EXISTS idx_vitals_alert ON vital_signs(is_alert, alert_acknowledged);

-- 2. Medication Administration Table (MAR)
CREATE TABLE IF NOT EXISTS medication_administrations (
    id BIGSERIAL PRIMARY KEY,
    prescription_id BIGINT REFERENCES prescriptions(id),
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    administered_by BIGINT NOT NULL REFERENCES users(id),
    scheduled_time VARCHAR(50),
    administered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) NOT NULL DEFAULT 'GIVEN',
    dosage_given VARCHAR(50),
    route VARCHAR(50),
    notes VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_med_admin_patient ON medication_administrations(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_prescription ON medication_administrations(prescription_id);
CREATE INDEX IF NOT EXISTS idx_med_admin_time ON medication_administrations(administered_at);

-- 3. Nursing Care Notes Table
CREATE TABLE IF NOT EXISTS nursing_notes (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    nurse_id BIGINT NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    note TEXT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nursing_notes_patient ON nursing_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_time ON nursing_notes(recorded_at);
