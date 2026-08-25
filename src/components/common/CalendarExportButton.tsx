import React, { useState } from 'react';
import { Appointment } from '../../types/index.ts';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendar.ts';
import { Calendar, Download, ExternalLink, ChevronDown } from 'lucide-react';

interface CalendarExportButtonProps {
  appointment: Appointment;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const CalendarExportButton: React.FC<CalendarExportButtonProps> = ({
  appointment,
  variant = 'outline',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const googleUrl = generateGoogleCalendarUrl(appointment);

  const buttonClasses = {
    primary:
      'bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm transition-colors',
    secondary:
      'bg-slate-800 hover:bg-slate-900 text-white font-medium shadow-sm transition-colors',
    outline:
      'bg-white dark:bg-[#10333C] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#17424C] hover:bg-slate-50 dark:hover:bg-[#153E48] transition-colors',
  }[variant];

  return (
    <div className="relative inline-block text-right">
      <button
        type="button"
        id={`export-cal-btn-${appointment.id}`}
        onClick={() => setIsOpen(prev => !prev)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm cursor-pointer ${buttonClasses}`}
      >
        <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        <span>إضافة للتقويم</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#10333C] shadow-xl border border-slate-100 dark:border-[#17424C] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-[#153E48] hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>تقويم جوجل (Google Calendar)</span>
            </a>
            <button
              type="button"
              onClick={() => {
                downloadIcsFile(appointment);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-[#153E48] hover:text-teal-700 dark:hover:text-teal-300 transition-colors text-right cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>تحميل ملف تقويم (.ics / Apple / Outlook)</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
