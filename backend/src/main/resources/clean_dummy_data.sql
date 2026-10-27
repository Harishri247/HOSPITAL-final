-- Clean up all dummy clinical and transactional data in hospital_db
BEGIN;

-- 1. Discharge summaries
DELETE FROM discharge_summaries;
ALTER SEQUENCE IF EXISTS discharge_summaries_id_seq RESTART WITH 1;

-- 2. Medication administration records
DELETE FROM medication_administrations;
ALTER SEQUENCE IF EXISTS medication_administrations_id_seq RESTART WITH 1;

-- 3. Vital signs records
DELETE FROM vital_signs;
ALTER SEQUENCE IF EXISTS vital_signs_id_seq RESTART WITH 1;

-- 4. Nursing notes
DELETE FROM nursing_notes;
ALTER SEQUENCE IF EXISTS nursing_notes_id_seq RESTART WITH 1;

-- 5. Controlled substance logs
DELETE FROM controlled_substance_logs;
ALTER SEQUENCE IF EXISTS controlled_substance_logs_id_seq RESTART WITH 1;

-- 6. Prescriptions
DELETE FROM prescriptions;
ALTER SEQUENCE IF EXISTS prescriptions_id_seq RESTART WITH 1;

-- 7. Medical records
DELETE FROM medical_records;
ALTER SEQUENCE IF EXISTS medical_records_id_seq RESTART WITH 1;

-- 8. Lab results & Lab orders
DELETE FROM lab_results;
ALTER SEQUENCE IF EXISTS lab_results_id_seq RESTART WITH 1;

DELETE FROM lab_orders;
ALTER SEQUENCE IF EXISTS lab_orders_id_seq RESTART WITH 1;

-- 9. Payments & Bills
DELETE FROM payments;
ALTER SEQUENCE IF EXISTS payments_id_seq RESTART WITH 1;

DELETE FROM bills;
ALTER SEQUENCE IF EXISTS bills_id_seq RESTART WITH 1;

-- 10. Admission orders
DELETE FROM admission_orders;
ALTER SEQUENCE IF EXISTS admission_orders_id_seq RESTART WITH 1;

-- 11. Appointments
DELETE FROM appointments;
ALTER SEQUENCE IF EXISTS appointments_id_seq RESTART WITH 1;

-- 12. Reset Beds and Wards occupancy
UPDATE beds SET status = 'AVAILABLE', patient_id = NULL, assignment_date = NULL;
UPDATE wards SET occupied_beds = 0;

-- 13. Notifications
DELETE FROM notifications;
ALTER SEQUENCE IF EXISTS notifications_id_seq RESTART WITH 1;

-- 14. Audit logs (associated with dummy clinical events)
DELETE FROM audit_logs;
ALTER SEQUENCE IF EXISTS audit_logs_id_seq RESTART WITH 1;

-- 15. Patients
DELETE FROM patients;
ALTER SEQUENCE IF EXISTS patients_id_seq RESTART WITH 1;

COMMIT;
