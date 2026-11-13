import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../../lib/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to set or clear Authorization header
  const setAuthHeader = useCallback((token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('peoplecore_token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('peoplecore_token');
    }
  }, []);

  // Check current session on app load
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('peoplecore_token');
      if (storedToken) {
        setAuthHeader(storedToken);
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          setPermissions(res.data.data.permissions || []);
        } catch (err) {
          console.warn('Session restoration failed:', err.message);
          // Try silent refresh
          try {
            const refreshRes = await api.post('/auth/refresh');
            const newToken = refreshRes.data.data.accessToken;
            setAuthHeader(newToken);
            setUser(refreshRes.data.data.user);
            setPermissions(refreshRes.data.data.permissions || []);
          } catch (refreshErr) {
            setAuthHeader(null);
            setUser(null);
            setPermissions([]);
          }
        }
      } else {
        // Try silent refresh using HTTP-only cookie
        try {
          const refreshRes = await api.post('/auth/refresh');
          const newToken = refreshRes.data.data.accessToken;
          setAuthHeader(newToken);
          setUser(refreshRes.data.data.user);
          setPermissions(refreshRes.data.data.permissions || []);
        } catch {
          // No active session
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [setAuthHeader]);

  // Login handler
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: loggedInUser, accessToken, permissions: userPerms } = res.data.data;
    setAuthHeader(accessToken);
    setUser(loggedInUser);
    setPermissions(userPerms || []);
    return loggedInUser;
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error:', err.message);
    } finally {
      setAuthHeader(null);
      setUser(null);
      setPermissions([]);
    }
  };

  const hasRole = (role) => {
    return !!user?.roles?.includes(role);
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const value = {
    user,
    permissions,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
