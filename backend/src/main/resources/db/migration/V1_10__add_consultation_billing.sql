-- HPMS Migration: Add Consultation & Prescription Outpatient Billing
-- Supports receptionist calculating bill after consultation, itemizing consultation fee & prescribed medicines

ALTER TABLE bills ADD COLUMN IF NOT EXISTS appointment_id BIGINT REFERENCES appointments(id);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS prescription_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS items_breakdown TEXT;

CREATE INDEX IF NOT EXISTS idx_bill_appointment ON bills(appointment_id);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS bill_id BIGINT REFERENCES bills(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS billing_status VARCHAR(30) DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_appointment_bill ON appointments(bill_id);
