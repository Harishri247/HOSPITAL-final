BEGIN;

-- 1. Ensure clean 'doctor' user exists
INSERT INTO users (username, email, password_hash, full_name, role, staff_id, active, created_at, updated_at)
VALUES (
    'doctor',
    'doctor@gmail.com',
    '$2a$10$K55tBA21iFiv/gB3mN54zeLTISouSJVM8PZ/98PVZjBGpgrd90Lv2',
    'Attending Physician',
    'ROLE_DOCTOR',
    'DOC001',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE 
SET password_hash = '$2a$10$K55tBA21iFiv/gB3mN54zeLTISouSJVM8PZ/98PVZjBGpgrd90Lv2',
    active = TRUE;

-- 2. Ensure clean 'nurse' user exists
INSERT INTO users (username, email, password_hash, full_name, role, staff_id, active, created_at, updated_at)
VALUES (
    'nurse',
    'nurse@gmail.com',
    '$2a$10$pXQrufxPLjIKAlHT9EcQ6.dIXa55CU31T4KQVo3LGa5M7ytbEtLJ6',
    'Staff Nurse',
    'ROLE_NURSE',
    'NUR001',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE 
SET password_hash = '$2a$10$pXQrufxPLjIKAlHT9EcQ6.dIXa55CU31T4KQVo3LGa5M7ytbEtLJ6',
    active = TRUE;

-- 3. Reset department head_doctor_id to doctor user ID or null
UPDATE departments SET head_doctor_id = (SELECT id FROM users WHERE username = 'doctor' LIMIT 1);

-- 4. Delete all dummy patient users and non-essential mock staff accounts
DELETE FROM users 
WHERE username NOT IN ('admin', 'doctor', 'dr.smith', 'nurse', 'nurse.jones', 'receptionist', 'pharmacist', 'labtech');

COMMIT;
