-- FR8: Pharmacy & Inventory Management - Supplier and Controlled Substances

ALTER TABLE medicines 
    ADD COLUMN IF NOT EXISTS supplier VARCHAR(150),
    ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark existing opioid and controlled substances as controlled
UPDATE medicines 
SET is_controlled = TRUE 
WHERE category ILIKE '%controlled%' 
   OR category ILIKE '%opioid%' 
   OR name ILIKE '%tramadol%' 
   OR name ILIKE '%morphine%';

-- Backfill realistic supplier names for inventory tracking
UPDATE medicines 
SET supplier = CASE 
    WHEN manufacturer ILIKE '%GSK%' THEN 'GSK Global Distribution Inc.'
    WHEN manufacturer ILIKE '%Pfizer%' THEN 'Pfizer Supply Chain Solutions'
    WHEN manufacturer ILIKE '%Novartis%' THEN 'Novartis Integrated Logistics'
    WHEN manufacturer ILIKE '%Abbott%' THEN 'Abbott Healthcare Distribution'
    WHEN manufacturer ILIKE '%Sanofi%' THEN 'Sanofi Commercial Logistics'
    WHEN manufacturer ILIKE '%Cipla%' THEN 'Cipla MedSupply Network'
    WHEN manufacturer ILIKE '%Sun Pharma%' THEN 'Sun Pharma Direct Logistics'
    WHEN manufacturer ILIKE '%AstraZeneca%' THEN 'AstraZeneca Global Supply'
    WHEN manufacturer ILIKE '%Merck%' THEN 'Merck Healthcare Logistics'
    WHEN manufacturer ILIKE '%Roche%' THEN 'Roche Diagnostics Distribution'
    WHEN manufacturer ILIKE '%Purdue%' THEN 'Purdue Controlled Drug Logistics'
    WHEN manufacturer ILIKE '%Novo Nordisk%' THEN 'Novo Nordisk Cold-Chain Supply'
    WHEN manufacturer ILIKE '%Alkem%' THEN 'Alkem Central Distribution'
    WHEN manufacturer ILIKE '%Glaxo%' THEN 'GlaxoSmithKline Supply'
    WHEN manufacturer ILIKE '%Torrent%' THEN 'Torrent Pharma Distribution'
    WHEN manufacturer ILIKE '%Baxter%' THEN 'Baxter Medical Supplies'
    WHEN manufacturer ILIKE '%Fresenius%' THEN 'Fresenius Kabi Logistics'
    WHEN manufacturer IS NOT NULL THEN manufacturer || ' Direct Supply'
    ELSE 'Standard Hospital Central Depot'
END
WHERE supplier IS NULL;

-- Create dedicated regulatory audit log table for controlled substances
CREATE TABLE IF NOT EXISTS controlled_substance_logs (
    id BIGSERIAL PRIMARY KEY,
    medicine_id BIGINT NOT NULL,
    medicine_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL,
    batch_number VARCHAR(50),
    patient_reference VARCHAR(150) NOT NULL,
    pharmacist_user_id BIGINT,
    pharmacist_name VARCHAR(120) NOT NULL,
    supervisor_signoff VARCHAR(120),
    notes VARCHAR(500),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ctrl_med ON controlled_substance_logs(medicine_id);
CREATE INDEX IF NOT EXISTS idx_ctrl_timestamp ON controlled_substance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_ctrl_patient ON controlled_substance_logs(patient_reference);
