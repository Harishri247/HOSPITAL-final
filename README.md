# HealthCare — Hospital Patient Management System (HPMS)

A modern, enterprise-grade, full-stack Hospital Patient Management System built with **Spring Boot 3.3.4 (Java 17 LTS)** and **React 18 (Vite, Tailwind CSS, Recharts, Lucide Icons)**.

---

## 🌟 Key Highlights & System Architecture

```
                                  +-----------------------------+
                                  |   Modern React 18 Frontend  |
                                  | (Vite, TailwindCSS, Router) |
                                  |     http://localhost:5173   |
                                  +--------------+--------------+
                                                 |
                                         REST / JSON (JWT)
                                                 |
                                                 v
+---------------------------------------------------------------------------------------------------+
|                                Spring Boot 3.3.4 Backend Server                                   |
|                                     http://localhost:8080                                         |
+---------------------------------------------------------------------------------------------------+
|  [Security Layer]          Stateless Spring Security 6, JWT Filter, BCrypt (Cost 12), RBAC        |
|  [Clinical Modules]        Patients, Appointments, Medical Records, Prescriptions, Wards & Beds   |
|  [Support Modules]         Laboratory (Critical Flags), Pharmacy Inventory, Billing & Payments    |
|  [Governance & Auditing]   HIPAA Compliance Audit Trail, Real-Time Notifications, System Telemetry|
+------------------------------------------------+--------------------------------------------------+
                                                 |
                                         Spring Data JPA
                                                 |
                                                 v
                       +---------------------------------------------------+
                       | Dual-Engine Database Architecture                 |
                       | - Default: H2 in PostgreSQL Mode (Instant Boot)   |
                       | - Production: PostgreSQL (Schema provided)        |
                       +---------------------------------------------------+
```

---

## 🔐 Role-Based Access Control (RBAC) & Demo Accounts

The system includes pre-seeded demo accounts for all hospital roles. You can log in with one click on the login screen or using the following credentials:

| Role | Username | Password | Staff ID / Name | Description / Permissions |
|:-----|:---------|:---------|:----------------|:--------------------------|
| **System Administrator** | `admin` | `Admin@123` | `ADM001` (SysAdmin) | Full access, user governance, HIPAA audit trail, telemetry |
| **Doctor** | `dr.smith` | `Doctor@123` | `DOC001` (Dr. John Smith) | Patient charts, diagnosis, e-prescriptions, lab orders |
| **Nurse** | `nurse.jones` | `Nurse@123` | `NUR001` (Emily Jones) | Vitals triage, inpatient ward bed assignment, observation |
| **Receptionist** | `receptionist` | `Recept@123` | `REC001` (Rachel Green) | Patient registration, scheduling, billing invoices |
| **Pharmacist** | `pharmacist` | `Pharm@123` | `PHM001` (David Miller) | Medication dispensing, inventory batch & stock alerts |
| **Lab Technician** | `labtech` | `LabTech@123` | `LAB001` (Alex Mercer) | Specimen intake, test result entry, critical value alerts |
| **Patient** | `patient.john` | `Patient@123` | John Doe | Personal health record, upcoming visits, invoice payments |

---

## 🚀 Quick Start Guide

### Prerequisites
1. **Java 17 LTS**: Verify with `java -version`
2. **Node.js (v18+)** and `npm`: Verify with `node -v` and `npm -v`
3. **Maven (v3.8+)**: Optional if using the pre-compiled JAR

### 1. Run the Backend Application

The backend defaults to an in-memory PostgreSQL mode so that it runs out of the box with zero external dependencies.

```bash
# Navigate to backend directory
cd backend

# Option A: Run pre-built executable JAR (Recommended)
java -jar target/hpms-backend-1.0.0.jar

# Option B: Build and run with Maven (Using JDK 17)
mvn spring-boot:run
```
*The backend starts on `http://localhost:8080` with API root at `/api`.*

### 2. Run the Frontend Client

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```
*The frontend client runs on `http://localhost:5173`.*

---

## 🩺 System Modules & Capabilities

### 1. Patient Registration & Master Index
- **Unique Patient Identifier**: Auto-generated sequential format (e.g., `PAT-2026-0001`).
- **Duplicate Prevention**: Rejects duplicate registrations matching Phone Number or National ID / SSN.
- **Validation**: Strict 10-digit phone number, valid email, and blood type categorization.
- **Comprehensive Profiles**: Emergency contacts, allergies, blood groups, and insurance identifiers.

### 2. Clinical Appointments & Scheduling
- **Doctor Time Slot Finder**: Automatically computes 30-minute bookable slots based on doctor working hours.
- **Double-Booking Prevention**: High-concurrency conflict protection for doctor schedules.
- **Status Lifecycle**: `SCHEDULED` ➔ `CONFIRMED` ➔ `IN_PROGRESS` ➔ `COMPLETED` / `CANCELLED` / `NO_SHOW`.

### 3. Electronic Medical Records (EMR)
- **HIPAA Compliance**: Every medical record view, addition, and modification is logged in the immutable audit trail.
- **Clinical Details**: Chief complaint, physical examination, ICD-10 diagnoses, vital signs, treatment plans.
- **Doctor Association**: Every record cryptographically maps to the attending physician.

### 4. e-Prescriptions & Pharmacy Inventory
- **Prescription Workflow**: Doctors sign prescriptions; pharmacists view pending queues and dispense.
- **Medication Batch Tracking**: Strength, dosage form (Tablet, Syrup, Injection), batch number, and expiration date.
- **Automated Stock Depletion**: Dispensing medications immediately decrements stock with atomic consistency.
- **Low-Stock Warnings**: Visual badges alert pharmacists when inventory falls below minimum reorder levels.

### 5. Ward & Inpatient Bed Management
- **Hospital Units**: General Wards, Semi-Private Rooms, Private Rooms, and Intensive Care Units (ICU).
- **Bed Status Indicators**: Real-time `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, or `RESERVED`.
- **Inpatient Actions**: Direct admission, bed transfer (with automatic occupancy swap), and discharge release.

### 6. Laboratory Diagnostics & Critical Flags
- **Diagnostic Orders**: Blood, Urine, Biopsy, Sputum, and Imaging specimens.
- **Critical Value Alerting**: High-priority visual banners and notification alerts for abnormal/critical test results.
- **Turnaround Tracking**: Timestamps for sample collection, lab processing, and technologist verification.

### 7. Billing, Invoicing & Insurance
- **Itemized Invoicing**: Admission bed charges, doctor consultations, lab orders, and pharmacy dispensations.
- **Flexible Payments**: Support for Cash, Credit Card, Debit Card, UPI, and Bank Wire.
- **Balance Validation**: Real-time tracking of Total Billed, Paid Amount, and Remaining Due.
- **Insurance Claim Center**: File and track policy claims with provider references and diagnosis codes.

### 8. Administration, Governance & Telemetry
- **RBAC User Management**: Instant role assignment and account activate/deactivate toggles.
- **Audit Log Browser**: Searchable, tamper-evident audit logs of all critical clinical and financial events.
- **System Telemetry**: Live uptime monitor, database connection health, and JVM thread telemetry.
- **Emergency Broadcast Center**: Instantly push urgent alerts across the hospital.

---

## 🗄️ Database Profiles

### In-Memory Mode (Default)
Configured in `backend/src/main/resources/application.properties`. Boots instantly without database installation. Ideal for local testing and demonstration.

### Production PostgreSQL Mode
1. Edit `backend/src/main/resources/application-postgres.properties` or launch with:
   ```bash
   mvn spring-boot:run -Dspring-boot.run.profiles=postgres
   ```
2. Database initialization scripts are located at `backend/src/main/resources/schema.sql`.

---

## 🧪 Testing & Verification

The test suite includes JUnit 5 and Mockito tests covering appointment booking conflicts, billing arithmetic, patient duplicate checking, and bed occupancy logic.

```bash
# Run backend test suite
cd backend
mvn test
```
**Results**: All 13 tests pass (`BUILD SUCCESS`).

```bash
# Run frontend production build
cd frontend
npm run build
```
**Results**: Bundles cleanly via Vite with 0 syntax or compilation errors.

---

## 🛡️ Security Best Practices
- Stateless JWT authentication with Bearer token authorization headers.
- Passwords hashed using BCrypt (work factor 12).
- Method-level authorization via `@PreAuthorize("hasRole(...)")`.
- Full CORS isolation configured for Vite development origins.
- Audit logging for HIPAA compliance tracking user actions, entity types, and timestamps.
