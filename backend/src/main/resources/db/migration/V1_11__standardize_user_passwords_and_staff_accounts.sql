-- Migration V1_11: Standardize all demo and staff passwords to match standard credentials
-- Passwords:
-- Admin: Admin@123
-- Doctor: Doctor@123
-- Nurse: Nurse@123
-- Receptionist: Recept@123
-- Pharmacist: Pharm@123
-- Lab Technician: LabTech@123
-- Patients: Patient@123

UPDATE users SET password_hash = '$2a$10$DGEm0D2sel/pZQdXE3U83uvAcsOJoQiGEcL7Tpla.K6YYg3MPg8lW', active = TRUE WHERE username = 'admin';
UPDATE users SET password_hash = '$2a$10$68wA4KX4maBnnvAXIB5CReSp2NLfWSptHTUj9U4MAxPdVRu9IuESS', active = TRUE WHERE username = 'receptionist';
UPDATE users SET password_hash = '$2a$10$v29lE3g1u0b9h90T5mZzZeR9fE8HM9TD5oM2RmnyUpIfxE6S4gEdi', active = TRUE WHERE username = 'nurse';
UPDATE users SET password_hash = '$2a$10$gD3J9DYLuu94sexeVIffyuFH8QP/pOEknBYP/UL7pVZXL.vG3umni', active = TRUE WHERE username = 'dr.patel';
UPDATE users SET password_hash = '$2a$10$9MYInPsuZuO0ZRsaJv9BeOwsQ1eQwlQ3NPRyI2vs3qrv4L5Iyn8Qm', active = TRUE WHERE username = 'pharmacist';
UPDATE users SET password_hash = '$2a$10$kr4849x54f9AITpcez4pk.PzHvFuEw88tBMz2B7VxK96xrN0.3Jtq', active = TRUE WHERE username = 'labtech';

UPDATE users SET password_hash = '$2a$10$6sG6rZCtGiUweTGlHRyiq.4d11k.bMYXqvuvPSgvhHpKWqwLTxa0W', active = TRUE WHERE username = 'hari';
UPDATE users SET password_hash = '$2a$10$H3Vyn0UVf8jabtkuZnVWf.4mNfBkMRTpFMxwkHT6GxtoruYGp0qYm', active = TRUE WHERE username = 'robert';
UPDATE users SET password_hash = '$2a$10$.ERUSo/1e/rDx0cKxhdwzO20kKfwFGJgFNlWjITN9cdNxWmYfMEBe', active = TRUE WHERE username = 'sujatha';
UPDATE users SET password_hash = '$2a$10$HU7Yjf3Epjsmr.1R27To2ufubMum5tkD7/qttTBJjFosfoZtAmY3q', active = TRUE WHERE username = 'selvi';
UPDATE users SET password_hash = '$2a$10$cDFHO1.coyj5inVFsCwjpuyIqyybOpVOKuniL4.hRPZSFr80/nIxS', active = TRUE WHERE username = 'vikram';
UPDATE users SET password_hash = '$2a$10$2UUzfdHvK4ytRbqVM72mPOIbEZLHij83ZvHEbnkgWjjT6qVoACIku', active = TRUE WHERE username = 'ram';
UPDATE users SET password_hash = '$2a$10$E0mHzjbME2YAYG4cTfcG4.1I6vk5hJMyw7NFE9Nl/Z40WggSb.8Pq', active = TRUE WHERE username = 'ragupathy';

-- Ensure doctor and nurse fallback accounts
INSERT INTO users (username, email, password_hash, full_name, role, staff_id, active, created_at, updated_at)
VALUES ('dr.smith', 'dr.smith@gmail.com', '$2a$10$2sLDQ7rI7UZrvj/L1lrpWexNHS7.VUoSBNlEjIfNTlMbJAn.xPjUu', 'Dr. Sarah Smith', 'ROLE_DOCTOR', 'DOC001', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = TRUE;

INSERT INTO users (username, email, password_hash, full_name, role, staff_id, active, created_at, updated_at)
VALUES ('doctor', 'doctor@gmail.com', '$2a$10$fHeUYeqy3.D6mlawbkgQC.QvCv3y0wZpod5u4WLd10yne7Cye0nsK', 'Attending Physician', 'ROLE_DOCTOR', 'DOC003', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = TRUE;

INSERT INTO users (username, email, password_hash, full_name, role, staff_id, active, created_at, updated_at)
VALUES ('nurse.jones', 'nurse.jones@gmail.com', '$2a$10$vwi8d.3WHMmwKV3DkDhMp.Cg0KlxSbHb3KAFTRIj7Fw6rC6FKn8wy', 'Nurse Emily Jones', 'ROLE_NURSE', 'NUR002', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = TRUE;
