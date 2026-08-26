import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastContextValue {
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastCtx = createContext<ToastContextValue>({ push: () => {}, dismiss: () => {} });

export const useToast = () => useContext(ToastCtx);

const TOAST_META: Record<ToastKind, { icon: React.ElementType; bar: string; ring: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-emerald-500', ring: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: AlertTriangle, bar: 'bg-rose-500', ring: 'text-rose-600 dark:text-rose-400' },
  info: { icon: Info, bar: 'bg-teal-500', ring: 'text-teal-600 dark:text-teal-400' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      setToasts(prev => [...prev, { ...t, id }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div
        dir="rtl"
        className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-[20rem] sm:max-w-xs pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(t => {
          const meta = TOAST_META[t.kind];
          const Icon = meta.icon;
          return (
            <div
              key={t.id}
              role="status"
              className="toast-enter relative overflow-hidden rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#1F4E5A] shadow-xl text-right pointer-events-auto"
            >
              <span className={`absolute inset-y-0 right-0 w-1 ${meta.bar}`} aria-hidden="true" />
              <div className="flex items-start gap-3 p-3.5 pr-4">
                <span className={`mt-0.5 shrink-0 ${meta.ring}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                      {t.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -m-1 cursor-pointer transition-colors"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
