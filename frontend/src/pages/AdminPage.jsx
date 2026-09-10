import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Users, Activity, FileText, Bell, CheckCircle, 
  XCircle, Search, RefreshCw, AlertTriangle, UserCheck, Shield, Database, Cpu, UserPlus, Edit
} from 'lucide-react';
import { adminApi, userApi } from '../api/apiService';
import RoleBadge from '../components/RoleBadge';
import Modal from '../components/Modal';

// Clean template for Staff form to guarantee no stale state or memory mutation
const EMPTY_STAFF_FORM = {
  fullName: '',
  role: 'ROLE_DOCTOR',
  departmentId: '',
  staffId: '',
  phoneNumber: '',
  username: '',
  email: '',
  password: ''
};

const getFreshStaffForm = () => ({ ...EMPTY_STAFF_FORM });

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('USERS'); // USERS, AUDIT, HEALTH, BROADCAST
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');

  // Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('PATIENT');
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Staff Modal (Create & Edit) State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [staffModalMode, setStaffModalMode] = useState('CREATE'); // 'CREATE' | 'EDIT'
  const [editingUserId, setEditingUserId] = useState(null);
  const [staffForm, setStaffForm] = useState(getFreshStaffForm());
  const [staffFormErrors, setStaffFormErrors] = useState({});
  const [formSessionKey, setFormSessionKey] = useState(0);
  const [savingStaff, setSavingStaff] = useState(false);

  // Broadcast form
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    userApi.getDepartments().then(res => setDepartments(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'USERS') {
        const res = await adminApi.getUsers();
        setUsers(res.data || []);
      } else if (activeTab === 'AUDIT') {
        const res = await adminApi.getAuditLogs();
        setAuditLogs(res.data || []);
      } else if (activeTab === 'HEALTH') {
        const res = await adminApi.getSystemHealth();
        setHealth(res.data || null);
      }
    } catch (err) {
      console.error('Error fetching admin tab data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await adminApi.updateRole(selectedUser.id, newRole);
      setMessage({ type: 'success', text: `Role for ${selectedUser.username} updated to ${newRole}` });
      setShowRoleModal(false);
      setSelectedUser(null);
      fetchTabData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update user role' });
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await adminApi.updateStatus(user.id, !user.active);
      setMessage({ 
        type: 'success', 
        text: `User ${user.username} is now ${!user.active ? 'Active' : 'Deactivated'}` 
      });
      fetchTabData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change status' });
    }
  };

  // Completely reset staff form to an isolated, fresh object
  const resetStaffModal = () => {
    setStaffForm(getFreshStaffForm());
    setStaffFormErrors({});
    setEditingUserId(null);
    setStaffModalMode('CREATE');
    setFormSessionKey((prev) => prev + 1);
  };

  // Open modal in CREATE mode (always empty)
  const handleOpenCreateModal = () => {
    resetStaffModal();
    setShowAddUserModal(true);
  };

  // Open modal in EDIT mode (load selected employee, password left empty)
  const handleOpenEditModal = (user) => {
    resetStaffModal();
    setStaffModalMode('EDIT');
    setEditingUserId(user.id);
    const normalizedRole = user.role?.startsWith('ROLE_') ? user.role : `ROLE_${user.role || 'DOCTOR'}`;
    setStaffForm({
      fullName: user.fullName || '',
      role: normalizedRole,
      departmentId: user.departmentId ? String(user.departmentId) : '',
      staffId: user.staffId || '',
      phoneNumber: user.phoneNumber || '',
      username: user.username || '',
      email: user.email || '',
      password: '' // Security requirement: never pre-populate passwords
    });
    setFormSessionKey((prev) => prev + 1);
    setShowAddUserModal(true);
  };

  // Close and purge form state
  const handleCloseStaffModal = () => {
    setShowAddUserModal(false);
    resetStaffModal();
  };

  // Handle submit for both CREATE and EDIT
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setStaffFormErrors({});

    const errors = {};
    if (!staffForm.fullName.trim()) errors.fullName = 'Full legal name is required';
    if (!staffForm.username.trim()) errors.username = 'Username is required';
    if (!staffForm.email.trim()) errors.email = 'Official email is required';
    if (staffModalMode === 'CREATE') {
      if (!staffForm.password) {
        errors.password = 'Initial password is required';
      } else if (staffForm.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    } else if (staffModalMode === 'EDIT' && staffForm.password && staffForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters if provided';
    }

    if (Object.keys(errors).length > 0) {
      setStaffFormErrors(errors);
      return;
    }

    setSavingStaff(true);
    try {
      const payload = {
        fullName: staffForm.fullName.trim(),
        username: staffForm.username.trim(),
        email: staffForm.email.trim(),
        role: staffForm.role.startsWith('ROLE_') ? staffForm.role : `ROLE_${staffForm.role}`,
        staffId: staffForm.staffId.trim() || null,
        departmentId: staffForm.departmentId ? Number(staffForm.departmentId) : null,
        phoneNumber: staffForm.phoneNumber.trim() || null,
        password: staffForm.password || null,
      };

      if (staffModalMode === 'CREATE') {
        await adminApi.createUser(payload);
        setMessage({ type: 'success', text: `Staff user @${payload.username} (${payload.fullName}) created successfully!` });
      } else {
        await adminApi.updateUser(editingUserId, payload);
        setMessage({ type: 'success', text: `Staff user @${payload.username} updated successfully!` });
      }

      handleCloseStaffModal();
      fetchTabData();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save staff member';
      setMessage({ type: 'error', text: errorMsg });
      if (errorMsg.toLowerCase().includes('username')) {
        setStaffFormErrors((prev) => ({ ...prev, username: errorMsg }));
      } else if (errorMsg.toLowerCase().includes('email')) {
        setStaffFormErrors((prev) => ({ ...prev, email: errorMsg }));
      } else if (errorMsg.toLowerCase().includes('staff id')) {
        setStaffFormErrors((prev) => ({ ...prev, staffId: errorMsg }));
      }
    } finally {
      setSavingStaff(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcasting(true);
    try {
      await adminApi.broadcast(broadcastMessage);
      setMessage({ type: 'success', text: 'Hospital broadcast message dispatched to all active users!' });
      setBroadcastMessage('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to dispatch broadcast' });
    } finally {
      setBroadcasting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchSearch = !userSearch || 
      u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.staffId?.toLowerCase().includes(userSearch.toLowerCase());
    return matchRole && matchSearch;
  });

  const filteredLogs = auditLogs.filter(log => {
    if (!auditSearch) return true;
    const term = auditSearch.toLowerCase();
    return (
      log.username?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term) ||
      log.entityType?.toLowerCase().includes(term) ||
      (log.newValue && log.newValue.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="text-teal-600 dark:text-teal-400" /> System Administration & Governance
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            RBAC User management, HIPAA compliance audit trail, system telemetry, and hospital broadcasts
          </p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <UserPlus size={16} /> Add Doctor / Staff
          </button>
          <button
            onClick={fetchTabData}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Message banner */}
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-2">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'USERS'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Users size={16} /> Staff & User Access ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'AUDIT'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <FileText size={16} /> Audit Trail (HIPAA)
        </button>
        <button
          onClick={() => setActiveTab('HEALTH')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'HEALTH'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Activity size={16} /> System Telemetry
        </button>
        <button
          onClick={() => setActiveTab('BROADCAST')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'BROADCAST'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Bell size={16} /> Broadcast Center
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4 items-center shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search staff by username, name, email, or Staff ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 flex-wrap w-full sm:w-auto">
              {['ALL', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECHNICIAN', 'PATIENT'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                    roleFilter === r
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3">User & Staff ID</th>
                    <th className="px-5 py-3">Contact Email</th>
                    <th className="px-5 py-3">Assigned Role</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <RefreshCw className="animate-spin inline mr-2 text-teal-600" size={18} />
                        Loading users list...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No users match the search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/75 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900 dark:text-white">{u.fullName}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <span className="font-mono">@{u.username}</span>
                            {u.staffId && <span>• ID: {u.staffId}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300 font-mono">
                          {u.email}
                        </td>
                        <td className="px-5 py-4">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-300">
                          {u.departmentName || 'General'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {u.active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              <CheckCircle size={12} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                              <XCircle size={12} /> Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors font-medium"
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setNewRole(u.role);
                              setShowRoleModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors font-medium"
                          >
                            <Shield size={12} /> Change Role
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded font-medium transition-colors ${
                              u.active
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100'
                            }`}
                          >
                            <UserCheck size={12} /> {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4 items-center shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search audit trail by actor, action (e.g. LOGIN, BILL_GENERATED), or entity..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {filteredLogs.length} audit entries
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Actor / Staff</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Target Entity</th>
                    <th className="px-5 py-3">Details / Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <RefreshCw className="animate-spin inline mr-2 text-teal-600" size={18} />
                        Loading HIPAA audit records...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No audit records recorded yet.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/75 dark:hover:bg-gray-750/50 transition-colors">
                        <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 font-semibold text-gray-900 dark:text-white text-xs">
                          {log.username || `User #${log.userId}`}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600 dark:text-gray-300 font-mono">
                          {log.entityType} {log.entityId && `(#${log.entityId})`}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {log.newValue || log.oldValue || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HEALTH */}
      {activeTab === 'HEALTH' && (
        <div className="space-y-6">
          {health ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">System Status</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{health.status}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Uptime: {health.uptime}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Database size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Database</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{health.database}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Dual-Mode JPA Provider</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total User Accounts</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{health.totalUsers}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Staff & Patients</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Cpu size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Release Version</p>
                  <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{health.version}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Spring Boot 3.3.4 + React</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="animate-spin inline mr-2 text-teal-600" size={20} />
              Loading telemetry...
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Security & Architecture Compliance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <span className="font-semibold text-gray-900 dark:text-white block mb-1">HIPAA Security Standard</span>
                <p className="text-xs text-gray-500">Full audit logging on patient chart views, edits, lab orders, and medication dispensations.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <span className="font-semibold text-gray-900 dark:text-white block mb-1">Stateless JWT Auth</span>
                <p className="text-xs text-gray-500">Dual secret signing, token expiration checks, and standard claim verification with CORS isolation.</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                <span className="font-semibold text-gray-900 dark:text-white block mb-1">Concurrency & Locking</span>
                <p className="text-xs text-gray-500">Optimistic locking on appointments, bed assignments, and inventory stock to prevent race conditions.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BROADCAST */}
      {activeTab === 'BROADCAST' && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-3xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Bell className="text-teal-600" /> Dispatch Emergency Hospital Broadcast
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Broadcast a high-priority announcement to all doctors, nurses, receptionists, pharmacists, and lab personnel.
          </p>

          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Announcement Message *
              </label>
              <textarea
                rows={4}
                required
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                placeholder="e.g. Code Blue in Ward A-102. All available ICU staff report immediately."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={broadcasting}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Bell size={16} /> {broadcasting ? 'Dispatching...' : 'Dispatch Broadcast'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Role Modal */}
      <Modal 
        isOpen={showRoleModal} 
        onClose={() => setShowRoleModal(false)} 
        title={`Change Role for @${selectedUser?.username}`}
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
            <p className="text-gray-700 dark:text-gray-300 font-semibold">{selectedUser?.fullName}</p>
            <p className="text-xs text-gray-400">Current Role: {selectedUser?.role}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Select New System Role *
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="DOCTOR">DOCTOR</option>
              <option value="NURSE">NURSE</option>
              <option value="RECEPTIONIST">RECEPTIONIST</option>
              <option value="PHARMACIST">PHARMACIST</option>
              <option value="LAB_TECHNICIAN">LAB_TECHNICIAN</option>
              <option value="PATIENT">PATIENT</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={() => setShowRoleModal(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Confirm Role Update
            </button>
          </div>
        </form>
      </Modal>
      {/* Add / Edit Doctor & Staff Modal */}
      <Modal 
        isOpen={showAddUserModal} 
        onClose={handleCloseStaffModal} 
        title={staffModalMode === 'EDIT' ? `Edit Staff Member (@${staffForm.username})` : 'Add New Doctor or Hospital Staff'}
      >
        <form 
          key={formSessionKey} 
          onSubmit={handleSaveStaff} 
          className="space-y-4" 
          autoComplete="off" 
          noValidate
        >
          {/* Prevent browser auto-fill heuristic on initial inputs */}
          <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" readOnly />
          <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" readOnly />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="staff-fullname" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Full Legal Name *
              </label>
              <input
                id="staff-fullname"
                name="newStaffFullName"
                type="text"
                autoComplete="off"
                required
                placeholder="e.g. Dr. John Watson or Nurse Clara Barton"
                value={staffForm.fullName}
                onChange={(e) => {
                  setStaffForm((prev) => ({ ...prev, fullName: e.target.value }));
                  if (staffFormErrors.fullName) setStaffFormErrors((prev) => ({ ...prev, fullName: null }));
                }}
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  staffFormErrors.fullName ? 'border-rose-400 focus:ring-rose-500' : ''
                }`}
              />
              {staffFormErrors.fullName && (
                <p className="mt-1 text-xs text-rose-600">{staffFormErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="staff-role" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                System Role *
              </label>
              <select
                id="staff-role"
                name="newStaffRole"
                required
                value={staffForm.role}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="ROLE_DOCTOR">Doctor (Clinical Lead)</option>
                <option value="ROLE_NURSE">Nurse (Inpatient Care)</option>
                <option value="ROLE_RECEPTIONIST">Receptionist (Front Desk)</option>
                <option value="ROLE_PHARMACIST">Pharmacist (Dispensary)</option>
                <option value="ROLE_LAB_TECHNICIAN">Lab Technician (Diagnostics)</option>
                <option value="ROLE_ADMIN">Administrator (Full Access)</option>
              </select>
            </div>

            <div>
              <label htmlFor="staff-dept" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Medical Department
              </label>
              <select
                id="staff-dept"
                name="newStaffDept"
                value={staffForm.departmentId}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">-- General / Hospital Wide --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="staff-id" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Staff / Employee ID
              </label>
              <input
                id="staff-id"
                name="newStaffId"
                type="text"
                autoComplete="off"
                placeholder="e.g. DOC-101 or NUR-204"
                value={staffForm.staffId}
                onChange={(e) => {
                  setStaffForm((prev) => ({ ...prev, staffId: e.target.value }));
                  if (staffFormErrors.staffId) setStaffFormErrors((prev) => ({ ...prev, staffId: null }));
                }}
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  staffFormErrors.staffId ? 'border-rose-400 focus:ring-rose-500' : ''
                }`}
              />
              {staffFormErrors.staffId && (
                <p className="mt-1 text-xs text-rose-600">{staffFormErrors.staffId}</p>
              )}
            </div>

            <div>
              <label htmlFor="staff-phone" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                id="staff-phone"
                name="newStaffPhone"
                type="tel"
                autoComplete="off"
                placeholder="e.g. 9876543210"
                value={staffForm.phoneNumber}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="staff-username" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Username (for Login) *
              </label>
              <input
                id="staff-username"
                name="newStaffUsername"
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                required
                placeholder="e.g. dr.watson"
                value={staffForm.username}
                onChange={(e) => {
                  setStaffForm((prev) => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }));
                  if (staffFormErrors.username) setStaffFormErrors((prev) => ({ ...prev, username: null }));
                }}
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  staffFormErrors.username ? 'border-rose-400 focus:ring-rose-500' : ''
                }`}
              />
              {staffFormErrors.username && (
                <p className="mt-1 text-xs text-rose-600">{staffFormErrors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="staff-email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Official Email Address *
              </label>
              <input
                id="staff-email"
                name="newStaffEmail"
                type="email"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                required
                placeholder="e.g. watson@hospital.com"
                value={staffForm.email}
                onChange={(e) => {
                  setStaffForm((prev) => ({ ...prev, email: e.target.value }));
                  if (staffFormErrors.email) setStaffFormErrors((prev) => ({ ...prev, email: null }));
                }}
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  staffFormErrors.email ? 'border-rose-400 focus:ring-rose-500' : ''
                }`}
              />
              {staffFormErrors.email && (
                <p className="mt-1 text-xs text-rose-600">{staffFormErrors.email}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="staff-password" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {staffModalMode === 'CREATE' ? 'Initial Password * (Min 6 characters)' : 'Update Password (Leave blank to keep current password)'}
              </label>
              <input
                id="staff-password"
                name="newStaffPassword"
                type="password"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                required={staffModalMode === 'CREATE'}
                minLength={staffModalMode === 'CREATE' ? 6 : undefined}
                placeholder={staffModalMode === 'CREATE' ? 'e.g. Doctor@123' : '•••••••••••• (Leave blank to keep current)'}
                value={staffForm.password}
                onChange={(e) => {
                  setStaffForm((prev) => ({ ...prev, password: e.target.value }));
                  if (staffFormErrors.password) setStaffFormErrors((prev) => ({ ...prev, password: null }));
                }}
                className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none ${
                  staffFormErrors.password ? 'border-rose-400 focus:ring-rose-500' : ''
                }`}
              />
              {staffFormErrors.password && (
                <p className="mt-1 text-xs text-rose-600">{staffFormErrors.password}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseStaffModal}
              className="px-4 py-2 border rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingStaff}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {staffModalMode === 'CREATE' ? (
                <>
                  <UserPlus size={16} />
                  {savingStaff ? 'Creating Staff Member...' : 'Create Staff Member'}
                </>
              ) : (
                <>
                  <Edit size={16} />
                  {savingStaff ? 'Saving Changes...' : 'Save Staff Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
