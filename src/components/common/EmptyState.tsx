import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#17424C] bg-slate-50/50 dark:bg-[#10333C]/60 my-4">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#123842] text-teal-600 dark:text-teal-300 flex items-center justify-center mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">{title}</h4>
      {description && <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white text-xs sm:text-sm font-bold transition-colors shadow-xs cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
