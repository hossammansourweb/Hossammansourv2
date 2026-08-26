import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { initOneTap, promptOneTap, cancelOneTap } from '../services/googleAuth.ts';
import { Modal } from '../components/common/Modal.tsx';
import {
  LogIn,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  User,
  Lock,
  Phone,
  Mail,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  onSuccess,
}) => {
  const { login, register, loginWithGoogle, loginWithOneTap, user } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register form
  const [name, setName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Sync tab when initialTab changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(identifier, password);
      setSuccessMsg('تم تسجيل الدخول بنجاح!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل الدخول.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await register({
        name,
        phone: regPhone,
        email: regEmail || undefined,
        password: regPassword,
      });
      setSuccessMsg('تم إنشاء الحساب بنجاح!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click test credentials for quick evaluation
  const handleQuickLogin = async (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(id, pass);
      setSuccessMsg('تم تسجيل الدخول بنجاح!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg(null);
    setGLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMsg('تم تسجيل الدخول بنجاح!');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل الدخول عبر Google.');
    } finally {
      setGLoading(false);
    }
  };

  // Google One Tap — only on the login tab, only when not already authenticated.
  useEffect(() => {
    if (!isOpen || tab !== 'login' || user) return;
    let cancelled = false;
    (async () => {
      const ok = await initOneTap({
        onCredential: async (credential: string) => {
          if (cancelled) return;
          setErrorMsg(null);
          setGLoading(true);
          try {
            await loginWithOneTap(credential);
            setTimeout(() => {
              onClose();
              if (onSuccess) onSuccess();
            }, 400);
          } catch (err: any) {
            setErrorMsg(err.message || 'فشل تسجيل الدخول عبر Google.');
          } finally {
            setGLoading(false);
          }
        },
        onError: () => {
          /* One Tap unavailable/blocked — fail silently, no console errors */
        },
      });
      if (ok && !cancelled) promptOneTap();
    })();
    return () => {
      cancelled = true;
      cancelOneTap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab, user]);

  const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );

  const GoogleButton = ({ onClick, loading }: { onClick: () => void; loading: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || gLoading}
      className="w-full py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
    >
      <GoogleIcon />
      <span>{loading ? 'جاري التحقق...' : 'المتابعة باستخدام Google'}</span>
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="md"
    >
      <div className="text-right space-y-5 py-2" dir="rtl">
        {/* Header (premium redesign) */}
        <div className="text-center">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0E3847] to-[#136579] dark:from-[#0c2c33] dark:to-[#0E3847] flex items-center justify-center shadow-lg shadow-teal-900/20">
            <User className="w-7 h-7 text-white" />
          </div>
          <div className="inline-flex items-center gap-2 text-[11px] font-bold text-[#E05A47] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
            <span>{tab === 'login' ? 'حساب المريض' : 'حساب جديد'}</span>
          </div>

          <h2 className="text-2xl font-extrabold text-[#0E3847] dark:text-white">
            {tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tab === 'login'
              ? 'ادخل إلى حسابك لإدارة موعدك ومراجعة تفاصيله.'
              : 'أنشئ حسابك لإتمام الحجز ومتابعة مواعيدك بسهولة.'}
          </p>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                البريد الإلكتروني أو رقم الهاتف
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="name@example.com أو 01100171817"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-[11px] text-slate-400 font-medium">أو</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <GoogleButton onClick={handleGoogle} loading={gLoading} />

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMsg(null);
                }}
                className="text-xs font-bold text-[#E05A47] hover:underline"
              >
                ليس لديك حساب؟ إنشاء حساب جديد ←
              </button>
            </div>

            {/* Quick Staff Login helpers for testing */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                حسابات تجريبية سريعة (للمعاينة):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@clinic.com', 'admin123')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
                >
                  دخول المدير (د. حسام)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('reception@clinic.com', 'recep123')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
                >
                  دخول الاستقبال
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Register Form (Matches Screenshot 4) */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الاسم بالكامل
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="الاسم كما سيظهر في الملف الطبي"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الهاتف (للتواصل وتأكيد الحجز)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="01X XXXX XXXX"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                البريد الإلكتروني (اختياري)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  placeholder="6 أحرف على الأقل"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  className="w-full pr-10 pl-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  aria-label={showRegPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>{loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-[11px] text-slate-400 font-medium">أو</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <GoogleButton onClick={handleGoogle} loading={gLoading} />

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg(null);
                }}
                className="text-xs font-bold text-[#E05A47] hover:underline"
              >
                لديك حساب بالفعل؟ تسجيل الدخول ←
              </button>
            </div>
          </form>
        )}

        {/* Security Notice Box (Matches Screenshot 3 bottom) */}
        <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
          <span>تُدار البيانات بسرية وأمان وفق المعايير الطبية المعتمدة.</span>
        </div>
      </div>
    </Modal>
  );
};
