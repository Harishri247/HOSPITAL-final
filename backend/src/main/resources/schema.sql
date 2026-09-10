-- PostgreSQL Schema DDL for HealthCare Hospital Patient Management System (HPMS)

CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(500),
    head_doctor_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(60) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(30) NOT NULL,
    staff_id VARCHAR(30),
    department_id BIGINT REFERENCES departments(id),
    phone_number VARCHAR(20),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id BIGSERIAL PRIMARY KEY,
    patient_number VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_group VARCHAR(10),
    phone_number VARCHAR(10) NOT NULL,
    address VARCHAR(300),
    emergency_contact VARCHAR(150),
    insurance_id VARCHAR(50),
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    department_id BIGINT REFERENCES departments(id),
    appointment_date DATE NOT NULL,
    time_slot VARCHAR(30) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'OPD',
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    notes VARCHAR(500),
    queue_number INT,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medical_records (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    chief_complaint VARCHAR(500) NOT NULL,
    diagnosis VARCHAR(1000) NOT NULL,
    icd_code VARCHAR(30),
    treatment VARCHAR(2000),
    prescription_id BIGINT,
    notes VARCHAR(2000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    medical_record_id BIGINT REFERENCES medical_records(id),
    medication_name VARCHAR(150) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    duration VARCHAR(50) NOT NULL,
    route VARCHAR(50) NOT NULL,
    dispensing_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
    dispensed_by BIGINT REFERENCES users(id),
    dispensed_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wards (
    id BIGSERIAL PRIMARY KEY,
    ward_name VARCHAR(100) NOT NULL,
    ward_type VARCHAR(30) NOT NULL,
    total_beds INT NOT NULL,
    occupied_beds INT NOT NULL DEFAULT 0,
    department_id BIGINT REFERENCES departments(id),
    floor_number INT,
    nurse_in_charge VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS beds (
    id BIGSERIAL PRIMARY KEY,
    ward_id BIGINT NOT NULL REFERENCES wards(id),
    bed_number VARCHAR(20) NOT NULL,
    bed_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    patient_id BIGINT REFERENCES patients(id),
    assignment_date TIMESTAMP,
    UNIQUE(ward_id, bed_number)
);

CREATE TABLE IF NOT EXISTS lab_orders (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    doctor_id BIGINT NOT NULL REFERENCES users(id),
    test_name VARCHAR(150) NOT NULL,
    test_code VARCHAR(30) NOT NULL,
    specimen_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ORDERED',
    ordered_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    result_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lab_results (
    id BIGSERIAL PRIMARY KEY,
    lab_order_id BIGINT NOT NULL REFERENCES lab_orders(id),
    result_value VARCHAR(100) NOT NULL,
    reference_range VARCHAR(100) NOT NULL,
    unit VARCHAR(30) NOT NULL,
    flag VARCHAR(30) NOT NULL DEFAULT 'NORMAL',
    verified_by VARCHAR(100) NOT NULL,
    result_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    admission_id BIGINT,
    total_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    insurance_claim_id VARCHAR(50),
    generated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    bill_id BIGINT NOT NULL REFERENCES bills(id),
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    transaction_reference VARCHAR(100),
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    received_by VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS medicines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    generic_name VARCHAR(150),
    category VARCHAR(100) NOT NULL,
    dosage_form VARCHAR(50) NOT NULL,
    strength VARCHAR(50),
    stock_quantity INT NOT NULL DEFAULT 0,
    min_threshold INT NOT NULL DEFAULT 10,
    unit_price NUMERIC(10, 2) NOT NULL,
    expiry_date DATE,
    batch_number VARCHAR(50),
    manufacturer VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    message VARCHAR(500) NOT NULL,
    type VARCHAR(30) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT,
    old_value VARCHAR(2000),
    new_value VARCHAR(2000),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_patients_number ON patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone_number);
CREATE INDEX IF NOT EXISTS idx_appointments_doc_date ON appointments(doctor_id, appointment_date, time_slot);
CREATE INDEX IF NOT EXISTS idx_beds_ward ON beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
