import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; reset_token?: string }>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smartfin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('smartfin_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const userData = await api.getMe();
      setUser(userData);
      localStorage.setItem('smartfin_user', JSON.stringify(userData));
    } catch {
      logout();
    }
  };

  useEffect(() => {
    async function verifyUser() {
      if (token) {
        await refreshUser();
      }
      setIsLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email.trim().toLowerCase(), password);
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('smartfin_token', res.access_token);
      localStorage.setItem('smartfin_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    await api.changePassword(oldPassword, newPassword);
    if (user) {
      const updatedUser: User = { ...user, must_change_password: false };
      setUser(updatedUser);
      localStorage.setItem('smartfin_user', JSON.stringify(updatedUser));
    }
  };

  const forgotPassword = async (email: string) => {
    return await api.forgotPassword(email.trim().toLowerCase());
  };

  const resetPassword = async (email: string, token: string, newPassword: string) => {
    await api.resetPassword(email.trim().toLowerCase(), token, newPassword);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('smartfin_token');
    localStorage.removeItem('smartfin_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        changePassword,
        forgotPassword,
        resetPassword,
        refreshUser,
        logout,
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
