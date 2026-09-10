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
        <RefreshCw className="animate-spin mr-2 text-teal-600" size={24} />
        Loading profile details...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <User className="text-teal-600 dark:text-teal-400" /> Account & Profile Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          View your staff credentials, role permissions, and modify your contact details
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center justify-between text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white text-3xl font-bold shadow-md">
            {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile?.fullName}</h2>
              <RoleBadge role={profile?.role} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">@{profile?.username}</p>

            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-gray-600 dark:text-gray-300 pt-2">
              {profile?.staffId && (
                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded">
                  <IdCard size={14} className="text-teal-600 dark:text-teal-400" /> Staff ID: {profile.staffId}
                </span>
              )}
              {profile?.departmentName && (
                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded">
                  <Building size={14} className="text-teal-600 dark:text-teal-400" /> Dept: {profile.departmentName}
                </span>
              )}
              <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded">
                <CheckCircle2 size={14} className="text-emerald-600" /> Status: {profile?.active ? 'Active' : 'Inactive'}
              </span>
              {profile?.createdAt && (
                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded">
                  <Calendar size={14} className="text-gray-400" /> Member since: {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Edit Personal Information</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Legal Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Official Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Contact Phone (10 Digits)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  pattern="^\d{10}$"
                  title="Please enter a valid 10-digit phone number"
                  placeholder="e.g. 9876543210"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Assigned Role (Read-Only)
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  disabled
                  value={profile?.role || ''}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save size={16} /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
