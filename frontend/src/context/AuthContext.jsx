import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/apiService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hpms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('hpms_token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      const data = res.data;
      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        staffId: data.staffId,
        departmentId: data.departmentId,
      };

      localStorage.setItem('hpms_token', data.accessToken);
      localStorage.setItem('hpms_user', JSON.stringify(userData));
      setToken(data.accessToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please verify credentials.';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('hpms_token');
    localStorage.removeItem('hpms_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user || !user.role) return false;
    const normalize = (r) => r.startsWith('ROLE_') ? r : `ROLE_${r}`;
    const userRoleNorm = normalize(user.role);
    if (Array.isArray(roles)) {
      return roles.some((r) => normalize(r) === userRoleNorm);
    }
    return normalize(roles) === userRoleNorm;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
