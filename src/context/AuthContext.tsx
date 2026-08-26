import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types/index.ts';
import { api } from '../services/api.ts';
import { translateGoogleError, resetOneTap } from '../services/googleAuth.ts';
import type { User as FirebaseUser } from 'firebase/auth';

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
  loginWithGoogle: () => Promise<User>;
  loginWithOneTap: (credential: string) => Promise<User>;
  isSuperAdmin: boolean;
  isReceptionist: boolean;
  isContentEditor: boolean;
  isStaff: boolean;
  isPatient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Optional in-memory profile cache; no JWT in localStorage anymore.
  const tokenValue: string | null = null;

  useEffect(() => {
    // Restore session from Firebase Auth (persistent under the hood).
    const unsubscribe = api.onAuthStateChanged(async fbUser => {
      if (fbUser) {
        try {
          const res = await api.getMe();
          if (res.success && res.data) {
            setUser(res.data);
          } else {
            // No Firestore profile yet (e.g. a brand-new Google user). Provision
            // one automatically. Never sign the Firebase user out — just resolve
            // the profile. Normal returning users always have a doc, so this is
            // a no-op for them.
            const synced = await api.syncGoogleUser().catch(() => null);
            if (synced?.success && synced.data) {
              setUser(synced.data);
            } else {
              setUser(null);
            }
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (identifier: string, pass: string): Promise<User> => {
    // Resolve an email from a phone-or-email, then do Firebase sign-in.
    const email = identifier.includes('@')
      ? identifier.trim()
      : (await api.login(identifier, pass)).data.email;
    await api.signInWithEmailAndPassword(email, pass);
    const res = await api.getMe();
    if (res.success && res.data) {
      setUser(res.data);
      return res.data;
    }
    throw new Error('فشل في استرجاع بيانات الحساب بعد تسجيل الدخول.');
  };

  const register = async (payload: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    gender?: 'male' | 'female';
    age?: number;
  }): Promise<User> => {
    // Create the Firebase Auth account first (via the server-side helper),
    // then sign in and fetch profile. We call the server register endpoint which
    // creates the Auth user AND the Firestore profile doc.
    const res = await api.register(payload);
    if (res.success && res.data?.user) {
      // Sign in with Firebase Auth using the resolved email.
      const email = res.data.user.email || `${payload.phone.trim()}@hossam-clinic.local`;
      await api.signInWithEmailAndPassword(email, payload.password);
      const me = await api.getMe();
      if (me.success && me.data) {
        setUser(me.data);
        return me.data;
      }
      return res.data.user;
    }
    throw new Error(res.message || 'فشل في إنشاء الحساب.');
  };

  const logout = async () => {
    await api.signOut().catch(() => {});
    setUser(null);
    // Allow One Tap to try again for the next visitor on this device.
    resetOneTap();
  };

  // Shared post-auth step: ensure the Firestore profile exists (created as a
  // normal patient for new Google users; existing roles are never changed) and
  // resolve the app user.
  const finalizeGoogleAuth = async (credential: { user: FirebaseUser }) => {
    const token = await credential.user.getIdToken();
    const synced = await api.syncGoogleUser(token).catch(() => null);
    const me =
      synced?.success && synced.data
        ? synced
        : await api.getMe().catch(() => null);
    if (me?.success && me.data) {
      setUser(me.data);
      return me.data;
    }
    throw new Error('فشل تسجيل الدخول عبر Google.');
  };

  const loginWithGoogle = async (): Promise<User> => {
    let cred;
    try {
      cred = await api.signInWithGoogle();
    } catch (e: any) {
      throw new Error(translateGoogleError(e));
    }
    return finalizeGoogleAuth(cred);
  };

  const loginWithOneTap = async (credential: string): Promise<User> => {
    let cred;
    try {
      cred = await api.signInWithGoogleCredential(credential);
    } catch (e: any) {
      throw new Error(translateGoogleError(e));
    }
    return finalizeGoogleAuth(cred);
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
        token: tokenValue,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        loginWithGoogle,
        loginWithOneTap,
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