import React from 'react';

export const RoleBadge = ({ role }) => {
  const roleConfig = {
    ROLE_ADMIN: { label: 'Administrator', bg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
    ROLE_DOCTOR: { label: 'Doctor', bg: 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' },
    ROLE_NURSE: { label: 'Nurse', bg: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
    ROLE_PHARMACIST: { label: 'Pharmacist', bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    ROLE_RECEPTIONIST: { label: 'Receptionist', bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
    ROLE_LAB_TECHNICIAN: { label: 'Lab Tech', bg: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
    ROLE_PATIENT: { label: 'Patient', bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  };

  const config = roleConfig[role] || { label: role || 'User', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      {config.label}
    </span>
  );
};

export default RoleBadge;
