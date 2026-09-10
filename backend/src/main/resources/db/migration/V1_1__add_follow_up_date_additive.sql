-- HPMS Schema Alignment: Additive, Non-Destructive Migrations
-- Adds optional follow_up_date column without touching any existing rows or tables.

ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS follow_up_date DATE;

ALTER TABLE medical_records 
    ADD COLUMN IF NOT EXISTS follow_up_date DATE;
