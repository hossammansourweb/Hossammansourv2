import { Appointment } from '../types/index.ts';

export function formatArabicDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  const days = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ];

  const dayName = days[date.getDay()];
  const monthName = months[m - 1];

  return `${dayName}، ${d} ${monthName} ${y}`;
}

export function formatArabicTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hoursStr, minsStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const mins = minsStr ? parseInt(minsStr, 10) : 0;
  const period = hours >= 12 ? 'مساءً' : 'صباحاً';

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours = hours - 12;
  }

  return `${hours}:${minsStr || '00'} ${period}`;
}

/**
 * Formats a time string (HH:MM) to 12-hour format with AM/PM,
 * e.g. "14:30" → "2:30 PM". Replaces the 24-hour display everywhere.
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hoursStr, minsStr] = timeStr.split(':');
  let hours = parseInt(hoursStr, 10);
  const mins = minsStr ? parseInt(minsStr, 10) : 0;
  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours = hours - 12;
  }

  return `${hours}:${minsStr || '00'} ${period}`;
}

export function getDayOfWeekArabic(dayNumber: number): string {
  const days = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
  ];
  return days[dayNumber] || '';
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Display-only: converts a YYYY-MM-DD string to DD/MM/YYYY.
 * Parses as a local-time date (split on `-`, no `new Date(string)`) so we never
 * introduce a timezone shift around midnight.
 */
export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
}

/**
 * Formats an ISO timestamp into "DD/MM/YYYY – hh:mm AM/PM" for prescription
 * cards. Splits the ISO string locally (no `new Date(string)` timezone shift
 * for the date part) and reuses the existing DD/MM/YYYY + 12-hour formatters.
 */
export function formatPrescriptionDateTime(iso: string): string {
  if (!iso) return '';
  // Handle both "2026-08-26T14:35:00.000Z" and "2026-08-26T14:35:00".
  const [datePart, timePart = ''] = iso.split('T');
  const hhmm = timePart.split('.')[0].split('+')[0].slice(0, 5);
  return `${formatDateDDMMYYYY(datePart)} – ${formatTime12h(hhmm)}`;
}
