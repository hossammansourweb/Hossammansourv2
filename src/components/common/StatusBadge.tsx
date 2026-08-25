import React from 'react';
import { AppointmentStatus } from '../../types/index.ts';
import { CheckCircle2, Clock, XCircle, AlertCircle, UserCheck, CheckCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  }[size];

  switch (status) {
    case 'new':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5" />
          حجز جديد
        </span>
      );
    case 'confirmed':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          مؤكد
        </span>
      );
    case 'pending':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 ${sizeClasses}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          قيد المراجعة
        </span>
      );
    case 'checked_in':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800 ${sizeClasses}`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          حضر بالعيادة
        </span>
      );
    case 'completed':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 ${sizeClasses}`}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          تم الكشف
        </span>
      );
    case 'cancelled':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 ${sizeClasses}`}
        >
          <XCircle className="w-3.5 h-3.5" />
          ملغي
        </span>
      );
    case 'no_show':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 ${sizeClasses}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          لم يحضر
        </span>
      );
    default:
      return null;
  }
};
