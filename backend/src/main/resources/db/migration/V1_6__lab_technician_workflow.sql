-- V1_6: Enhance Lab Order and Result schema for complete Lab Technician & Doctor workflow

ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'ROUTINE';
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS received_date TIMESTAMP;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS received_by VARCHAR(100);
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS specimen_barcode VARCHAR(50);
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS specimen_collected_date TIMESTAMP;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS specimen_notes TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS test_started_date TIMESTAMP;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS testing_equipment VARCHAR(100);
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS reviewed_date TIMESTAMP;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS doctor_review_notes TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS reviewed_by_doctor_id BIGINT REFERENCES users(id);

ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS remarks TEXT;
