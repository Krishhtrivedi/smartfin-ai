import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (role: UserRole) => Promise<void>;
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

  useEffect(() => {
    async function verifyUser() {
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          localStorage.setItem('smartfin_user', JSON.stringify(userData));
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('smartfin_token', res.access_token);
      localStorage.setItem('smartfin_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (role: UserRole) => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      admin: { email: 'admin@smartfin.ai', pass: 'admin123' },
      accountant: { email: 'accountant@smartfin.ai', pass: 'account123' },
      manager: { email: 'manager@smartfin.ai', pass: 'manager123' },
      employee: { email: 'employee@smartfin.ai', pass: 'employee123' },
    };
    const target = creds[role] || creds.admin;
    await login(target.email, target.pass);
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
        quickLogin,
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
