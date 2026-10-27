-- V1_7: Update lab_orders_status_check constraint to include all LabOrderStatus enum values
ALTER TABLE lab_orders DROP CONSTRAINT IF EXISTS lab_orders_status_check;

ALTER TABLE lab_orders ADD CONSTRAINT lab_orders_status_check 
CHECK (status IN ('ORDERED', 'RECEIVED', 'SPECIMEN_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'CANCELLED'));
