import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AppointmentsPage from './pages/AppointmentsPage';
import MedicalRecordsPage from './pages/MedicalRecordsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import WardsPage from './pages/WardsPage';
import LabPage from './pages/LabPage';
import PharmacyPage from './pages/PharmacyPage';
import BillingPage from './pages/BillingPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Login Route */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* Authenticated Dashboard Layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Patients & Medical Records */}
        <Route
          path="patients"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <PatientsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="patients/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <PatientDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'PATIENT']}>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="medical-records"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR', 'NURSE', 'PATIENT']}>
              <MedicalRecordsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="prescriptions"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR', 'PHARMACIST', 'PATIENT']}>
              <PrescriptionsPage />
            </ProtectedRoute>
          }
        />

        {/* Hospital Resources & Services */}
        <Route
          path="wards"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST']}>
              <WardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="lab"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'LAB_TECHNICIAN', 'DOCTOR', 'PATIENT']}>
              <LabPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pharmacy"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'PHARMACIST']}>
              <PharmacyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="billing"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTIONIST', 'PATIENT']}>
              <BillingPage />
            </ProtectedRoute>
          }
        />

        {/* Administration & Profile */}
        <Route
          path="admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
