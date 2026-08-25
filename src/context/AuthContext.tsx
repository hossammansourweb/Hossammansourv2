import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<User>;
  register: (payload: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    gender?: 'male' | 'female';
    age?: number;
  }) => Promise<User>;
  logout: () => void;
  updateUser: (updated: User) => void;
  isSuperAdmin: boolean;
  isReceptionist: boolean;
  isContentEditor: boolean;
  isStaff: boolean;
  isPatient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('clinic_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('clinic_auth_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          localStorage.removeItem('clinic_auth_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        localStorage.removeItem('clinic_auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (identifier: string, pass: string): Promise<User> => {
    const res = await api.login(identifier, pass);
    if (res.success && res.data) {
      localStorage.setItem('clinic_auth_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'فشل في تسجيل الدخول.');
  };

  const register = async (payload: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    gender?: 'male' | 'female';
    age?: number;
  }): Promise<User> => {
    const res = await api.register(payload);
    if (res.success && res.data) {
      localStorage.setItem('clinic_auth_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'فشل في إنشاء الحساب.');
  };

  const logout = () => {
    localStorage.removeItem('clinic_auth_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  const role = user?.role;
  const isSuperAdmin = role === 'super_admin';
  const isReceptionist = role === 'receptionist';
  const isContentEditor = role === 'content_editor';
  const isStaff = isSuperAdmin || isReceptionist || isContentEditor;
  const isPatient = role === 'patient';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        isSuperAdmin,
        isReceptionist,
        isContentEditor,
        isStaff,
        isPatient,
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
