import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Building, IdCard, Calendar, CheckCircle2, Save, RefreshCw } from 'lucide-react';
import { userApi } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import RoleBadge from '../components/RoleBadge';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await userApi.getProfile();
      setProfile(res.data);
      setFormData({
        fullName: res.data.fullName || '',
        email: res.data.email || '',
        phoneNumber: res.data.phoneNumber || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.email && !formData.email.trim().toLowerCase().endsWith('@gmail.com')) {
      setMessage({ type: 'error', text: 'Email ID must end with @gmail.com' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await userApi.updateProfile(formData);
      setProfile(res.data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        <RefreshCw className="animate-spin mr-2 text-blue-600" size={24} />
        Loading profile details...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 font-display">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <span>Account & Profile Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          View your staff credentials, role permissions, and modify your contact details
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs ${
          message.type === 'success' 
            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-sky-300 border border-blue-200 dark:border-blue-800' 
            : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none">×</button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-sky-500 to-sky-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shadow-sky-500/25 flex-shrink-0">
            {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-display">{profile?.fullName}</h2>
              <RoleBadge role={profile?.role} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">@{profile?.username}</p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 pt-2">
              {profile?.staffId && (
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 font-mono text-[11px]">
                  <IdCard size={14} className="text-blue-600 dark:text-sky-400" /> Staff ID: {profile.staffId}
                </span>
              )}
              {profile?.departmentName && (
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 font-semibold text-[11px]">
                  <Building size={14} className="text-blue-600 dark:text-sky-400" /> Dept: {profile.departmentName}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-sky-300 px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-800 font-bold text-[11px]">
                <CheckCircle2 size={14} className="text-blue-600 dark:text-sky-400" /> Status: {profile?.active ? 'Active' : 'Inactive'}
              </span>
              {profile?.createdAt && (
                <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 text-slate-500 text-[11px]">
                  <Calendar size={14} className="text-slate-400" /> Member since: {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-xl backdrop-blur-xl">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 font-display">Edit Personal Information</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Legal Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Official Email Address (@gmail.com) *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  required
                  placeholder="e.g. name@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Phone (10 Digits)
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  pattern="^\d{10}$"
                  title="Please enter a valid 10-digit phone number"
                  placeholder="e.g. 9876543210"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Assigned Role (Read-Only)
              </label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  disabled
                  value={profile?.role || ''}
                  className="w-full pl-10 pr-3.5 py-2.5 border rounded-xl border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs sm:text-sm cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all transform active:scale-95 disabled:opacity-50 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
