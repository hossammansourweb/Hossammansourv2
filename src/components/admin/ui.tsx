import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Loader2,
  Inbox,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  Star,
  MoreVertical,
  CalendarClock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../services/api.ts';
import type { Appointment, ScheduleException, User, Branch, MedicalService, FAQItem, Announcement } from '../../types/index.ts';
import { formatTime12h, formatArabicDate } from '../../utils/date.ts';

/* ============================================================
   Admin UI primitives — RTL-first, responsive, theme-aware.
   ============================================================ */

// ---------- Toast system ----------
type ToastKind = 'success' | 'error' | 'info';
export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}
type ToastContext = {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
};
export const ToastCtx = React.createContext<ToastContext>({
  toasts: [],
  push: () => {},
  dismiss: () => {},
});
export const useToast = () => React.useContext(ToastCtx);

const TOAST_META: Record<ToastKind, { icon: React.ElementType; ring: string; bar: string }> = {
  success: { icon: Check, ring: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  error: { icon: AlertTriangle, ring: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500' },
  info: { icon: CalendarClock, ring: 'text-teal-600 dark:text-teal-400', bar: 'bg-teal-500' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...t, id }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div dir="rtl" className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2 max-w-xs w-full">
        <AnimatePresence>
          {toasts.map(t => {
            const meta = TOAST_META[t.kind];
            const Icon = meta.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#1F4E5A] shadow-xl text-right"
              >
                <span className={`absolute inset-y-0 right-0 w-1 ${meta.bar}`} />
                <div className="flex items-start gap-3 p-3.5 pr-4">
                  <span className={`mt-0.5 ${meta.ring}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</p>
                    {t.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">{t.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    aria-label="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Loading / Empty / Error ----------
export function LoadingState({ label = 'جاري التحميل...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

export function ErrorState({
  message = 'تعذر جلب البيانات.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
      <span className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 flex items-center justify-center mb-3.5">
        <AlertTriangle className="w-6 h-6" />
      </span>
      <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">حدث خطأ</h4>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4 break-words">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <span>إعادة المحاولة</span>
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#17424C] bg-slate-50/50 dark:bg-[#10333C]/60">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#123842] text-teal-600 dark:text-teal-300 flex items-center justify-center mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">{title}</h4>
      {description && <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white text-xs font-bold transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ---------- StatCard ----------
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'teal',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ElementType;
  tone?: 'teal' | 'coral' | 'emerald' | 'slate';
}) {
  const Icon = icon;
  const tones: Record<string, { iconBg: string; iconTx: string; valueTx: string }> = {
    teal: { iconBg: 'bg-teal-50 dark:bg-[#123842]', iconTx: 'text-teal-600 dark:text-teal-400', valueTx: 'text-teal-700 dark:text-teal-300' },
    coral: { iconBg: 'bg-[#E05A47]/10', iconTx: 'text-[#E05A47]', valueTx: 'text-[#E05A47] dark:text-[#f27463]' },
    emerald: { iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconTx: 'text-emerald-600 dark:text-emerald-400', valueTx: 'text-emerald-700 dark:text-emerald-300' },
    slate: { iconBg: 'bg-slate-100 dark:bg-slate-800', iconTx: 'text-slate-600 dark:text-slate-400', valueTx: 'text-slate-900 dark:text-white' },
  };
  const t = tones[tone];
  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#1E4F5A] shadow-xs flex items-start justify-between gap-3 hover:shadow-md transition-shadow">
      <div className="min-w-0">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">{label}</span>
        <div className={`text-2xl sm:text-3xl font-extrabold font-tajawal mt-1.5 ${t.valueTx}`}>{value}</div>
        {hint && <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block mt-1">{hint}</span>}
      </div>
      {Icon && (
        <span className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${t.iconBg} ${t.iconTx}`}>
          <Icon className="w-5 h-5" />
        </span>
      )}
    </div>
  );
}

// ---------- SearchBar ----------
export function SearchBar({
  value,
  onChange,
  placeholder = 'بحث...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1E4F5A] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label="مسح"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ---------- FilterBar ----------
export function FilterBar({
  filters,
  onReset,
}: {
  filters: { id: string; label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }[];
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {filters.map(f => (
        <label key={f.id} className="flex flex-col gap-1 min-w-[140px]">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{f.label}</span>
          <select
            value={f.value}
            onChange={e => f.onChange(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1E4F5A] text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            {f.options.map(o => (
              <option key={o.v} value={o.v}>{o.label}</option>
            ))}
          </select>
        </label>
      ))}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-[#164450] transition-colors cursor-pointer"
        >
          إعادة تعيين
        </button>
      )}
    </div>
  );
}

// ---------- StatusBadge (appointment-aware) ----------
const APT_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'حجز جديد', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' },
  confirmed: { label: 'مؤكد', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' },
  pending: { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' },
  checked_in: { label: 'حضر بالعيادة', cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800' },
  completed: { label: 'تم الكشف', cls: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' },
  cancelled: { label: 'ملغي', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' },
  no_show: { label: 'لم يحضر', cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800' },
};
export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const key = status as string;
  const meta = APT_STATUS[key] || { label: label || status || 'غير محدد', cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export function Pill({ label, tone = 'slate' }: { label: string; tone?: 'teal' | 'coral' | 'emerald' | 'amber' | 'slate' }) {
  const tones: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    coral: 'bg-[#E05A47]/10 text-[#E05A47] border-[#E05A47]/20 dark:text-[#f27463]',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    slate: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${tones[tone]}`}>{label}</span>
  );
}

export function Stars({ value }: { value?: number }) {
  const rating = value ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
      ))}
    </span>
  );
}

// ---------- ConfirmDialog ----------
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', h);
    return () => { document.body.style.overflow = 'unset'; window.removeEventListener('keydown', h); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#10333C] border border-slate-100 dark:border-[#1E4F5A] shadow-2xl p-6 text-right"
        >
          <div className="flex items-start gap-3">
            <span className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center ${danger ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : 'bg-teal-50 dark:bg-[#123842] text-teal-600 dark:text-teal-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-tajawal">{title}</h3>
              {description && <div className="text-xs text-slate-500 dark:text-slate-300 mt-1.5 leading-relaxed">{description}</div>}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-60 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0E3847] dark:bg-teal-700 hover:bg-[#092631]'}`}
            >
              {loading ? 'جاري...' : confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------- FormModal ----------
export function FormModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[85] overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`relative w-full ${sizes[size]} rounded-3xl bg-white dark:bg-[#10333C] border border-slate-100 dark:border-[#1E4F5A] shadow-2xl text-right overflow-hidden`}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-[#1E4F5A]">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-tajawal">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#123842] dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">{children}</div>
          {footer && <div className="px-6 pb-6">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}

// ---------- UserModal ----------
export function UserModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isEditing = !!editing;
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'receptionist' as 'super_admin' | 'receptionist' | 'content_editor',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name || '',
        phone: editing.phone || '',
        email: editing.email || '',
        password: '',
        role: editing.role || 'receptionist',
        isActive: editing.isActive !== false,
      });
    } else {
      setForm({ name: '', phone: '', email: '', password: '', role: 'receptionist', isActive: true });
    }
    setErrors({});
  }, [open, editing]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'الاسم مطلوب';
    if (!form.phone.trim()) errs.phone = 'الهاتف مطلوب';
    else if (!/^01[0125][0-9]{8}$/.test(form.phone.trim().replace(/\s+/g, ''))) errs.phone = 'رقم هاتف مصري غير صحيح';
    if (!isEditing && !form.password) errs.password = 'كلمة المرور مطلوبة';
    if (isEditing && form.password && form.password.length < 6) errs.password = 'كلمة المرور 6 أحرف على الأقل';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEditing) {
        const updates: Record<string, any> = {
          name: form.name.trim(),
          phone: form.phone.trim().replace(/\s+/g, ''),
          email: form.email.trim() || undefined,
          role: form.role,
          isActive: form.isActive,
        };
        await api.updateUser(editing!.id, updates);
        toast.push({ kind: 'success', title: 'تم تحديث الموظف', description: `تم حفظ بيانات ${form.name}` });
      } else {
        await api.createStaffUser({
          name: form.name.trim(),
          phone: form.phone.trim().replace(/\s+/g, ''),
          email: form.email.trim() || undefined,
          password: form.password,
          role: form.role,
        });
        toast.push({ kind: 'success', title: 'تم إنشاء الموظف', description: `تم إنشاء حساب ${form.name} بنجاح` });
      }
      onSaved();
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل الحفظ', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const fieldCls = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1E4F5A] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500';
  const labelCls = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <FormModal
      open={true}
      title={isEditing ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
      onClose={onClose}
      size="md"
    >
      <div className="space-y-4 text-right">
        <div>
          <label className={labelCls}>الاسم الكامل <span className="text-rose-500">*</span></label>
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم الموظف" className={fieldCls} />
          {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className={labelCls}>رقم الهاتف <span className="text-rose-500">*</span></label>
          <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01100171817" dir="ltr" className={fieldCls} />
          {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className={labelCls}>البريد الإلكتروني</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="optional@email.com" dir="ltr" className={fieldCls} />
        </div>

        <div>
          <label className={labelCls}>كلمة المرور {!isEditing && <span className="text-rose-500">*</span>}</label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={isEditing ? 'اتركها فارغة للإبقاء على الحالية' : '6 أحرف على الأقل'} className={fieldCls} />
          {errors.password && <p className="text-[11px] text-rose-500 mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className={labelCls}>الصلاحية / الدور</label>
          <select
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}
            className={fieldCls + ' cursor-pointer'}
          >
            <option value="super_admin">مدير عام (Super Admin)</option>
            <option value="receptionist">موظف استقبال (Receptionist)</option>
            <option value="content_editor">محرر محتوى (Content Editor)</option>
          </select>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="user-is-active"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-slate-300 text-teal-600"
            />
            <label htmlFor="user-is-active" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              حساب نشط (يمكنه تسجيل الدخول)
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-[#1E4F5A]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-200"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold shadow-sm cursor-pointer hover:bg-[#092631] disabled:opacity-50"
          >
            {saving ? 'جارِ الحفظ...' : isEditing ? 'حفظ التعديلات' : 'إنشاء الموظف'}
          </button>
        </div>
      </div>
    </FormModal>
  );
}


// ---------- AnnouncementModal (real form) ----------
export function AnnouncementModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'alert' | 'success'>('info');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setMessage(editing.message || '');
      setType((editing.type as any) || 'info');
      setIsActive(editing.isActive !== false);
    } else {
      setMessage('');
      setType('info');
      setIsActive(true);
    }
    setError(null);
  }, [open, editing]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim()) {
      setError('نص الإعلان مطلوب.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing && editing.id) {
        const r = await api.updateAnnouncement(editing.id, { message: message.trim(), type, isActive });
        if (!r.success) throw new Error((r as any).message || 'فشل التحديث');
        toast.push({ kind: 'success', title: 'تم تحديث الإعلان' });
      } else {
        const r = await api.createAnnouncement({ message: message.trim(), type, isActive });
        if (!r.success) throw new Error((r as any).message || 'فشل الحفظ');
        toast.push({ kind: 'success', title: 'تم إضافة الإعلان', description: 'سيظهر الإعلان في شريط الإعلانات فور التحديث.' });
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ');
      toast.push({ kind: 'error', title: 'فشل الحفظ', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <FormModal open={true} title={editing ? 'تعديل الإعلان' : 'إضافة إعلان جديد'} onClose={onClose} size="md">
      <form onSubmit={handleSave} className="space-y-4">
        <FormField label="نص الإعلان" required error={error || undefined}>
          <textarea
            className={inputCls}
            rows={3}
            value={message}
            onChange={e => { setMessage(e.target.value); setError(null); }}
            placeholder="مثال: مواعيد العيادة يوم الخميس من 5 إلى 9 مساءً"
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="نوع الإعلان">
            <select className={selectCls} value={type} onChange={e => setType(e.target.value as any)}>
              <option value="info">معلومة</option>
              <option value="alert">تنبيه</option>
              <option value="success">نجاح</option>
            </select>
          </FormField>
          <FormField label="الحالة">
            <select className={selectCls} value={isActive ? '1' : '0'} onChange={e => setIsActive(e.target.value === '1')}>
              <option value="1">نشط (يظهر في الشريط)</option>
              <option value="0">متوقف</option>
            </select>
          </FormField>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1E4F5A]">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">إلغاء</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
            {saving ? 'جارِ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الإعلان'}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

// ---------- BranchModal (real form) ----------
export function BranchModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: Branch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const empty = {
    name: '',
    city: '',
    address: '',
    mapUrl: '',
    phone: '',
    secondaryPhone: '',
    workingHoursDescription: '',
    isActive: true,
    order: 1,
  };
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name || '',
        city: editing.city || '',
        address: editing.address || '',
        mapUrl: editing.mapUrl || '',
        phone: editing.phone || '',
        secondaryPhone: editing.secondaryPhone || '',
        workingHoursDescription: editing.workingHoursDescription || '',
        isActive: editing.isActive !== false,
        order: editing.order ?? 1,
      });
    } else {
      setForm({ ...empty });
    }
    setErrors({});
  }, [open, editing]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم الفرع مطلوب';
    if (!form.city.trim()) errs.city = 'المدينة مطلوبة';
    if (!form.address.trim()) errs.address = 'العنوان مطلوب';
    if (!form.phone.trim()) errs.phone = 'رقم الهاتف مطلوب';
    else if (!/^01[0125][0-9]{8}$/.test(form.phone.trim().replace(/\s+/g, ''))) errs.phone = 'رقم هاتف مصري غير صحيح';
    if (!form.workingHoursDescription.trim()) errs.workingHoursDescription = 'مواعيد العمل مطلوبة';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        mapUrl: form.mapUrl.trim() || '',
        phone: form.phone.trim().replace(/\s+/g, ''),
        secondaryPhone: form.secondaryPhone?.trim() || undefined,
        workingHoursDescription: form.workingHoursDescription.trim(),
        isActive: !!form.isActive,
        order: Number(form.order) || 1,
      };
      if (editing && editing.id) {
        const r = await api.updateBranch(editing.id, payload);
        if (!r.success) throw new Error((r as any).message || 'فشل التحديث');
        toast.push({ kind: 'success', title: 'تم تحديث الفرع' });
      } else {
        const r = await api.createBranch(payload as any);
        if (!r.success) throw new Error((r as any).message || 'فشل الحفظ');
        toast.push({ kind: 'success', title: 'تمت إضافة الفرع', description: `تم إضافة فرع ${payload.name} بنجاح` });
      }
      onSaved();
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل الحفظ', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <FormModal open={true} title={editing ? 'تعديل الفرع' : 'إضافة فرع جديد'} onClose={onClose} size="lg">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="اسم الفرع" required error={errors.name}>
            <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: فرع طنطا" />
          </FormField>
          <FormField label="المدينة" required error={errors.city}>
            <input className={inputCls} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="مثال: طنطا" />
          </FormField>
        </div>
        <FormField label="العنوان" required error={errors.address}>
          <input className={inputCls} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="الشارع، علامة مميزة..." />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="رقم الهاتف الأساسي" required error={errors.phone}>
            <input type="tel" dir="ltr" className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01100171817" />
          </FormField>
          <FormField label="رقم هاتف ثانوي">
            <input type="tel" dir="ltr" className={inputCls} value={form.secondaryPhone} onChange={e => setForm({ ...form, secondaryPhone: e.target.value })} placeholder="اختياري" />
          </FormField>
        </div>
        <FormField label="مواعيد العمل" required error={errors.workingHoursDescription}>
          <input className={inputCls} value={form.workingHoursDescription} onChange={e => setForm({ ...form, workingHoursDescription: e.target.value })} placeholder="مثال: السبت - الخميس 5:00 م - 9:00 م" />
        </FormField>
        <FormField label="رابط الخريطة (Google Maps URL)">
          <input dir="ltr" className={inputCls} value={form.mapUrl} onChange={e => setForm({ ...form, mapUrl: e.target.value })} placeholder="https://maps.google.com/..." />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="ترتيب العرض">
            <input type="number" className={inputCls} value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
          </FormField>
          <FormField label="الحالة">
            <select className={selectCls} value={form.isActive ? '1' : '0'} onChange={e => setForm({ ...form, isActive: e.target.value === '1' })}>
              <option value="1">نشط (يظهر على الموقع)</option>
              <option value="0">غير نشط</option>
            </select>
          </FormField>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1E4F5A]">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">إلغاء</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
            {saving ? 'جارِ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الفرع'}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

// ---------- ServiceModal (real form) ----------
export function ServiceModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: MedicalService | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const empty = {
    name: '',
    category: '',
    description: '',
    durationMinutes: 30,
    price: 0,
    isPriceVisible: true,
    iconName: 'Stethoscope',
    order: 1,
    isApproved: true,
    isVisible: true,
  };
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name || '',
        category: editing.category || '',
        description: editing.description || '',
        durationMinutes: editing.durationMinutes || 30,
        price: editing.price ?? 0,
        isPriceVisible: editing.isPriceVisible !== false,
        iconName: editing.iconName || 'Stethoscope',
        order: editing.order ?? 1,
        isApproved: editing.isApproved !== false,
        isVisible: editing.isVisible !== false,
      });
    } else {
      setForm({ ...empty });
    }
    setErrors({});
  }, [open, editing]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم الخدمة مطلوب';
    if (!form.category.trim()) errs.category = 'فئة الخدمة مطلوبة';
    if (!form.description.trim()) errs.description = 'الوصف مطلوب';
    if (!form.durationMinutes || Number(form.durationMinutes) <= 0) errs.durationMinutes = 'المدة يجب أن تكون أكبر من صفر';
    if (form.isPriceVisible && (!form.price || Number(form.price) < 0)) errs.price = 'السعر مطلوب عند تفعيل عرض السعر';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        durationMinutes: Number(form.durationMinutes) || 30,
        price: form.isPriceVisible ? Number(form.price) || 0 : 0,
        isPriceVisible: !!form.isPriceVisible,
        iconName: form.iconName || 'Stethoscope',
        order: Number(form.order) || 1,
        isApproved: !!form.isApproved,
        isVisible: !!form.isVisible,
      };
      if (editing && editing.id) {
        const r = await api.updateService(editing.id, payload);
        if (!r.success) throw new Error((r as any).message || 'فشل التحديث');
        toast.push({ kind: 'success', title: 'تم تحديث الخدمة' });
      } else {
        const r = await api.createService(payload as any);
        if (!r.success) throw new Error((r as any).message || 'فشل الحفظ');
        toast.push({ kind: 'success', title: 'تمت إضافة الخدمة', description: `تم إضافة ${payload.name} بنجاح` });
      }
      onSaved();
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل الحفظ', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <FormModal open={true} title={editing ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'} onClose={onClose} size="lg">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="اسم الخدمة" required error={errors.name}>
            <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: كشف استشاري عظام" />
          </FormField>
          <FormField label="الفئة / التخصص" required error={errors.category}>
            <input className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="مثال: عظام" />
          </FormField>
        </div>
        <FormField label="الوصف" required error={errors.description}>
          <textarea className={inputCls} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر للخدمة..." />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="المدة (بالدقائق)" required error={errors.durationMinutes}>
            <input type="number" min={1} className={inputCls} value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
          </FormField>
          <FormField label="السعر (ج.م)" error={errors.price}>
            <input type="number" min={0} className={inputCls} value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} disabled={!form.isPriceVisible} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="عرض السعر للمريض">
            <select className={selectCls} value={form.isPriceVisible ? '1' : '0'} onChange={e => setForm({ ...form, isPriceVisible: e.target.value === '1' })}>
              <option value="1">يظهر السعر (استشارة بسعر)</option>
              <option value="0">إخفاء السعر (استشارة فقط)</option>
            </select>
          </FormField>
          <FormField label="ترتيب العرض">
            <input type="number" className={inputCls} value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="الحالة">
            <select className={selectCls} value={form.isVisible ? '1' : '0'} onChange={e => setForm({ ...form, isVisible: e.target.value === '1' })}>
              <option value="1">مرئي على الموقع</option>
              <option value="0">مخفي</option>
            </select>
          </FormField>
          <FormField label="الاعتماد">
            <select className={selectCls} value={form.isApproved ? '1' : '0'} onChange={e => setForm({ ...form, isApproved: e.target.value === '1' })}>
              <option value="1">معتمد</option>
              <option value="0">قيد المراجعة</option>
            </select>
          </FormField>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1E4F5A]">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">إلغاء</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
            {saving ? 'جارِ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة الخدمة'}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

// ---------- FaqModal (real form) ----------
export function FaqModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: FAQItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const empty = { question: '', answer: '', category: 'عام', isApproved: true, order: 1 };
  const [form, setForm] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        question: editing.question || '',
        answer: editing.answer || '',
        category: editing.category || 'عام',
        isApproved: editing.isApproved !== false,
        order: editing.order ?? 1,
      });
    } else {
      setForm({ ...empty });
    }
    setErrors({});
  }, [open, editing]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.question.trim()) errs.question = 'السؤال مطلوب';
    if (!form.answer.trim()) errs.answer = 'الإجابة مطلوبة';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        category: form.category.trim() || 'عام',
        isApproved: !!form.isApproved,
        order: Number(form.order) || 1,
      };
      if (editing && editing.id) {
        const r = await api.updateFaq(editing.id, payload);
        if (!r.success) throw new Error((r as any).message || 'فشل التحديث');
        toast.push({ kind: 'success', title: 'تم تحديث السؤال' });
      } else {
        const r = await api.createFaq(payload as any);
        if (!r.success) throw new Error((r as any).message || 'فشل الحفظ');
        toast.push({ kind: 'success', title: 'تمت إضافة السؤال' });
      }
      onSaved();
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل الحفظ', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <FormModal open={true} title={editing ? 'تعديل السؤال' : 'إضافة سؤال شائع جديد'} onClose={onClose} size="md">
      <form onSubmit={handleSave} className="space-y-4">
        <FormField label="السؤال" required error={errors.question}>
          <input className={inputCls} value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="مثال: ما هي مواعيد العمل؟" />
        </FormField>
        <FormField label="الإجابة" required error={errors.answer}>
          <textarea className={inputCls} rows={4} value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="الإجابة المفصلة..." />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="الفئة">
            <input className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="مثال: عام، حجز، أسعار" />
          </FormField>
          <FormField label="ترتيب العرض">
            <input type="number" className={inputCls} value={form.order} onChange={e => setForm({ ...form, order: Number(e.target.value) })} />
          </FormField>
        </div>
        <FormField label="الاعتماد">
          <select className={selectCls} value={form.isApproved ? '1' : '0'} onChange={e => setForm({ ...form, isApproved: e.target.value === '1' })}>
            <option value="1">معتمد ويظهر على الموقع</option>
            <option value="0">قيد المراجعة</option>
          </select>
        </FormField>
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1E4F5A]">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">إلغاء</button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
            {saving ? 'جارِ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة السؤال'}
          </button>
        </div>
      </form>
    </FormModal>
  );
}

// ---------- ViewAppointmentModal (full record in modal) ----------
export function ViewAppointmentModal({
  open,
  appointment,
  loading,
  onClose,
  onChanged,
}: {
  open: boolean;
  appointment: any;
  loading: boolean;
  onClose?: () => void;
  onChanged?: (a: Appointment) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', h);
    return () => { document.body.style.overflow = 'unset'; window.removeEventListener('keydown', h); };
  }, [open, onClose]);

  if (!open) return null;
  if (loading) {
    return (
      <div className="fixed inset-0 z-[80] overflow-y-auto">
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#10333C] border border-slate-100 dark:border-[#1E4F5A] shadow-2xl p-8 text-center">
            <Loader2 className="w-6 h-6 text-teal-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">جارٍ تحميل تفاصيل الحجز...</p>
          </div>
        </div>
      </div>
    );
  }
  if (!appointment) return null;

  const apt: any = appointment;
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: 'كود الحجز', value: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{apt.bookingNumber}</span> },
    { label: 'حالة الحجز', value: <StatusBadge status={apt.status} /> },
    { label: 'اسم المريض', value: <span className="font-bold">{apt.patientName}</span> },
    { label: 'رقم الهاتف', value: <span className="font-mono" dir="ltr">{apt.patientPhone}</span> },
    { label: 'البريد الإلكتروني', value: <span className="font-mono" dir="ltr">{apt.patientEmail || '—'}</span> },
    { label: 'السن', value: <span>{apt.patientAge != null ? `${apt.patientAge} سنة` : '—'}</span> },
    { label: 'النوع', value: <span>{apt.patientGender === 'male' ? 'ذكر' : apt.patientGender === 'female' ? 'أنثى' : '—'}</span> },
    { label: 'الخدمة', value: <span>{apt.serviceName || '—'}</span> },
    { label: 'الفرع', value: <span>{apt.branchName || '—'}</span> },
    { label: 'تاريخ الموعد', value: <span>{formatArabicDate(apt.appointmentDate)}</span> },
    { label: 'وقت الموعد', value: <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{formatTime12h(apt.appointmentTime)}</span> },
    { label: 'طريقة التأكيد', value: <span>{apt.confirmationMethod === 'whatsapp' ? 'واتساب' : apt.confirmationMethod === 'sms' ? 'رسالة قصيرة' : apt.confirmationMethod === 'call' ? 'مكالمة' : apt.confirmationMethod || '—'}</span> },
    { label: 'تاريخ الإنشاء', value: <span className="font-mono text-[11px]">{apt.createdAt ? new Date(apt.createdAt).toLocaleString('ar-EG') : '—'}</span> },
  ];

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-[#10333C] border border-slate-100 dark:border-[#1E4F5A] shadow-2xl text-right overflow-hidden my-8"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-[#1E4F5A]">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-tajawal">تفاصيل الحجز كاملة</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">عرض جميع بيانات الحجز والمريض</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#123842] dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map((f, i) => (
                <div key={i} className="rounded-xl border border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#123842]/40 p-3">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{f.label}</p>
                  <div className="text-sm text-slate-800 dark:text-slate-100 break-words">{f.value}</div>
                </div>
              ))}
            </div>
            {apt.notes && (
              <div className="mt-4 rounded-xl border border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#123842]/40 p-3">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">ملاحظات المريض</p>
                <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{apt.notes}</p>
              </div>
            )}
            {apt.clinicInternalNotes && (
              <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 p-3">
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-1">ملاحظات العيادة (داخلية)</p>
                <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{apt.clinicInternalNotes}</p>
              </div>
            )}
            {apt.cancellationReason && (
              <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 p-3">
                <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mb-1">سبب الإلغاء</p>
                <p className="text-sm text-slate-800 dark:text-slate-100">{apt.cancellationReason}</p>
              </div>
            )}
          </div>
          <div className="px-6 pb-5 pt-2 border-t border-slate-100 dark:border-[#1E4F5A] flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------- HistoryModal (full patient history in modal) ----------
export function HistoryModal({
  open,
  patient,
  appointments,
  loading,
  onClose,
}: {
  open: boolean;
  patient: any;
  appointments: any[];
  loading: boolean;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', h);
    return () => { document.body.style.overflow = 'unset'; window.removeEventListener('keydown', h); };
  }, [open, onClose]);

  if (!open) return null;

  const apts: Appointment[] = appointments || [];
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-[#10333C] border border-slate-100 dark:border-[#1E4F5A] shadow-2xl text-right overflow-hidden my-8"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-[#1E4F5A]">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-tajawal">السجل الكامل للمريض</h3>
              {patient && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {patient.name} · <span dir="ltr" className="font-mono">{patient.phone}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#123842] dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center">
                <Loader2 className="w-6 h-6 text-teal-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">جارٍ تحميل السجل...</p>
              </div>
            ) : (
              <>
                {patient && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl border border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#123842]/40 p-3">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">الاسم</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{patient.name || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#123842]/40 p-3">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">الهاتف</p>
                      <p className="text-sm font-mono text-slate-800 dark:text-slate-100" dir="ltr">{patient.phone || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#123842]/40 p-3">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">إجمالي الزيارات</p>
                      <p className="text-sm font-bold text-teal-600 dark:text-teal-400">{patient.totalBookings ?? apts.length} زيارة</p>
                    </div>
                  </div>
                )}
                {apts.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-6">لا توجد حجوزات مسجلة لهذا المريض.</p>
                ) : (
                  <div className="space-y-2">
                    {apts.map((a, i) => (
                      <div key={i} className="p-3 rounded-xl border border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#123842]/40 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{a.serviceName || '—'}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400" dir="ltr">{formatArabicDate(a.appointmentDate)} · {formatTime12h(a.appointmentTime)}</p>
                          {a.branchName && <p className="text-[11px] text-slate-400">📍 {a.branchName}</p>}
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="px-6 pb-5 pt-2 border-t border-slate-100 dark:border-[#1E4F5A] flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------- ExceptionModal ----------
export function ExceptionModal({
  open,
  branches,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  branches: any[];
  editing?: ScheduleException | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [type, setType] = useState<'holiday' | 'off_day' | 'special_hours'>('holiday');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [branchId, setBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setDate(editing.date);
      setStartTime(editing.startTime || '');
      setEndTime(editing.endTime || '');
      setReason(editing.reason);
      setBranchId(editing.branchId);
    } else {
      setType('holiday');
      setDate('');
      setStartTime('');
      setEndTime('');
      setReason('');
      setBranchId('');
    }
  }, [open, editing]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { type, date, startTime: startTime || undefined, endTime: endTime || undefined, reason, branchId };
      if (editing) {
        await api.updateException(editing.id, payload);
      } else {
        await api.createException(payload as any);
      }
      onSaved();
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل الحفظ', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <FormModal open={true} title={editing ? 'تعديل الاستثناء' : 'استثناء جديد'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="space-y-4">
        <FormField label="الفرع" required>
          <select className={selectCls} value={branchId} onChange={e => setBranchId(e.target.value)} required>
            <option value="">اختر الفرع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </FormField>
        <FormField label="النوع" required>
          <select className={selectCls} value={type} onChange={e => setType(e.target.value as any)}>
            <option value="holiday">عطلة رسمية</option>
            <option value="off_day">إجازة يوم</option>
            <option value="special_hours">ساعات خاصة</option>
          </select>
        </FormField>
        <FormField label="التاريخ" required>
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} required />
        </FormField>
        {type === 'special_hours' && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="من">
              <input type="time" className={inputCls} value={startTime} onChange={e => setStartTime(e.target.value)} />
            </FormField>
            <FormField label="إلى">
              <input type="time" className={inputCls} value={endTime} onChange={e => setEndTime(e.target.value)} />
            </FormField>
          </div>
        )}
        <FormField label="السبب">
          <textarea className={inputCls} rows={3} value={reason} onChange={e => setReason(e.target.value)} />
        </FormField>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] disabled:opacity-50 cursor-pointer">
            {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E4F5A] text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer">
            إلغاء
          </button>
        </div>
      </form>
    </FormModal>
  );
}

// ---------- FormField ----------
export function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-[#E05A47]"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
      {error && <span className="block text-[11px] text-rose-600 dark:text-rose-400 mt-1">{error}</span>}
    </label>
  );
}

export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1E4F5A] text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500';

export const selectCls = inputCls + ' cursor-pointer';

// ---------- DropdownMenu ----------
export function DropdownMenu({
  items,
  align = 'left',
  trigger,
}: {
  items: { label: string; icon?: React.ElementType; onClick: () => void; danger?: boolean; disabled?: boolean }[];
  align?: 'left' | 'right';
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#123842] hover:text-slate-700 cursor-pointer"
        aria-label="إجراءات"
      >
        {trigger || <MoreVertical className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className={`absolute top-full mt-1 z-40 ${align === 'left' ? 'left-0' : 'right-0'} min-w-[160px] rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#1E4F5A] shadow-xl p-1.5 text-right`}
          >
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={it.disabled}
                  onClick={() => { setOpen(false); it.onClick(); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 ${
                    it.danger ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#123842]'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {it.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- DataTable ----------
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowKey,
  actions,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
  onRowClick,
}: {
  columns: { key?: string; header: string; render: (row: T) => React.ReactNode; className?: string }[];
  rows: T[];
  rowKey?: (row: T) => string;
  actions?: (row: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}) {
  const hasActions = !!actions;
  return (
    <div className="surface-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs min-w-max">
          <thead className="bg-slate-50 dark:bg-[#123842]/70 border-b border-slate-200 dark:border-[#1E4F5A]">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`px-4 py-3 text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap ${c.className || ''}`}>
                  {c.header}
                </th>
              ))}
              {hasActions && <th className="px-4 py-3 text-slate-500 dark:text-slate-400 font-bold text-left">إجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1E4F5A]/60">
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length + (hasActions ? 1 : 0)} className="py-10"><EmptyState title={emptyTitle} description={emptyDescription} /></td></tr>
            ) : (
              rows.map(row => (
                <tr key={rowKey ? rowKey(row) : row.id} onClick={() => onRowClick?.(row)} className={`${onRowClick ? 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-[#12372f]/30' : 'hover:bg-slate-50/50 dark:hover:bg-[#12372f]/20'} transition-colors`}>
                  {columns.map((c, i) => <td key={i} className={`px-4 py-3 text-slate-700 dark:text-slate-200 align-middle whitespace-nowrap ${c.className || ''}`}>{c.render(row)}</td>)}
                  {hasActions && <td className="px-4 py-3 align-middle text-left">{actions!(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- ResponsiveDataCard (mobile card list) ----------
export function ResponsiveDataCard({
  children,
  onClick,
  accent,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-right surface-card rounded-2xl ${accent ? accent : 'border-r-4 border-r-teal-500'} relative overflow-hidden`}
    >
      <span className="absolute inset-y-0 right-0 w-4 bg-teal-500/10 dark:bg-teal-400/10" />
      <div className="p-4">{children}</div>
    </button>
  );
}

// ---------- Pagination ----------
export function Pagination({
  page,
  perPage,
  total,
  onChange,
}: {
  page: number;
  perPage: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;

  const getPageNumbers = () => {
    const range: (number | 'ellipsis')[] = [];
    const delta = 2;
    const left = Math.max(2, page - delta);
    const right = Math.min(pages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push('ellipsis');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < pages - 1) range.push('ellipsis');
    if (pages > 1) range.push(pages);

    return range;
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        الصفحة {page} من {pages} • {total} عنصر
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {getPageNumbers().map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">...</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded-xl text-xs font-bold cursor-pointer ${p === page ? 'bg-[#0E3847] dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------- hooks ----------
export function useScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
}