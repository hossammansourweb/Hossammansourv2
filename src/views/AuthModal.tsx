import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
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
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [loading, setLoading] = useState(false);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="md"
    >
      <div className="text-right space-y-5 py-2" dir="rtl">
        {/* Header (Matches Screenshots 3 & 4) */}
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
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
              <input
                type="text"
                required
                placeholder="name@example.com أو 01100171817"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

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
              <input
                type="text"
                required
                placeholder="الاسم كما سيظهر في الملف الطبي"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الهاتف (للتواصل وتأكيد الحجز)
              </label>
              <input
                type="tel"
                required
                placeholder="01X XXXX XXXX"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                البريد الإلكتروني (اختياري)
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <input
                type="password"
                required
                placeholder="6 أحرف على الأقل"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <span>{loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

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
