-- Migration V1_5: Add pharmacy inventory linkage and safety fields to prescriptions
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS medicine_id BIGINT NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS quantity_dispensed INT NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50) NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS pharmacist_notes TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_presc_medicine ON prescriptions(medicine_id);
