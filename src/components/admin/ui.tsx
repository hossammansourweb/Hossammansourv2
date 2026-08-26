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
import type { Appointment, ScheduleException } from '../../types/index.ts';

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

// ---------- FaqModal ----------
export function FaqModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!open) return null;
  return (
    <ConfirmDialog
      open={true}
      title="حفظ / حذف السؤال"
      description={editing ? 'هل تريد حفظ التغييرات؟' : 'هل تريد حذف هذا السؤال؟'}
      confirmLabel={editing ? 'حفظ' : 'حذف'}
      danger={!editing}
      loading={false}
      onClose={() => onClose()}
      onConfirm={() => onSaved()}
    />
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
  editing?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!open) return null;
  return (
    <ConfirmDialog
      open={true}
      title="حفظ / حذف الموظف"
      description={editing ? 'هل تريد حفظ التغييرات؟' : 'هل تريد حذف هذا الموظف؟'}
      confirmLabel={editing ? 'حفظ' : 'حذف'}
      danger={!editing}
      loading={false}
      onClose={() => onClose()}
      onConfirm={() => onSaved()}
    />
  );
}

// ---------- AnnouncementModal ----------
export function AnnouncementModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!open) return null;
  return (
    <ConfirmDialog
      open={true}
      title="حفظ / حذف الإعلان"
      description={editing ? 'هل تريد حفظ التغييرات؟' : 'هل تريد حذف هذا الإعلان؟'}
      confirmLabel={editing ? 'حفظ' : 'حذف'}
      danger={!editing}
      loading={false}
      onClose={() => onClose()}
      onConfirm={() => onSaved()}
    />
  );
}

// ---------- BranchModal ----------
export function BranchModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!open) return null;
  return (
    <ConfirmDialog
      open={true}
      title="حفظ / حذف الفرع"
      description={editing ? 'هل تريد حفظ التغييرات؟' : 'هل تريد حذف هذا الفرع؟'}
      confirmLabel={editing ? 'حفظ' : 'حذف'}
      danger={!editing}
      loading={false}
      onClose={() => onClose()}
      onConfirm={() => onSaved()}
    />
  );
}

// ---------- ServiceModal ----------
export function ServiceModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!open) return null;
  return (
    <ConfirmDialog
      open={true}
      title="حفظ / حذف الخدمة"
      description={editing ? 'هل تريد حفظ التغييرات؟' : 'هل تريد حذف هذه الخدمة؟'}
      confirmLabel={editing ? 'حفظ' : 'حذف'}
      danger={!editing}
      loading={false}
      onClose={() => onClose()}
      onConfirm={() => onSaved()}
    />
  );
}

// ---------- ViewAppointmentModal ----------
export function ViewAppointmentModal({
  appointment,
  loading,
  onClose,
  onChanged,
}: {
  appointment: any;
  loading: boolean;
  onClose?: () => void;
  onChanged?: (a: Appointment) => void;
}) {
  if (loading) return <p className="text-center text-slate-500">جارٍ تحميل الحجز...</p>;
  if (!appointment) return null;
  return (
    <div className="p-4">
      <h3 className="font-bold text-slate-800 dark:text-white mb-3">تفاصيل الحجز</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300" dir="ltr">{appointment.patientName}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300" dir="ltr">{appointment.appointmentDate}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300" dir="ltr">{appointment.appointmentTime}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300" dir="ltr">{appointment.serviceName}</p>
      {onClose && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-sm"
          >
            إغلاق
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- HistoryModal ----------
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
  if (loading) return <p className="text-center text-slate-500">جارٍ تحميل البيانات...</p>;
  return (
    <div className="p-4 max-h-80 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 dark:text-white">سجل الحجوزات</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>
      {appointments.length === 0 ? (
        <p className="text-sm text-slate-500">لا توجد حجوزات مسجلة</p>
      ) : (
        <div className="space-y-1">
          {appointments.map((a: Appointment, i: number) => (
            <div key={i} className="p-2 rounded bg-slate-50 dark:bg-[#123842]/40">
              <p className="text-xs text-slate-500" dir="ltr">{a.appointmentDate} {a.appointmentTime}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300" dir="ltr">{a.serviceName}</p>
            </div>
          ))}
        </div>
      )}
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