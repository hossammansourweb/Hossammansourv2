import { Appointment } from '../types/index.ts';

// Reminder lead time: the calendar entry is placed 2 hours BEFORE the actual
// appointment so the patient gets a heads-up in case they haven't shown up.
const REMINDER_LEAD_MS = 2 * 60 * 60 * 1000;

export function generateGoogleCalendarUrl(apt: Appointment): string {
  const [y, m, d] = apt.appointmentDate.split('-');
  const [h, min] = apt.appointmentTime.split(':');

  const apptStart = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  const reminderStart = new Date(apptStart.getTime() - REMINDER_LEAD_MS);
  const reminderEnd = apptStart;

  const formatUtc = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const title = encodeURIComponent(`تذكير موعد كشف عظام - د. حسام منصور (${apt.serviceName || 'استشارة'})`);
  const details = encodeURIComponent(
    `تذكير قبل موعد الكشف بساعتين.\nرقم الحجز: ${apt.bookingNumber}\nاسم المريض: ${apt.patientName}\nالفرع: ${apt.branchName}\nموعد الكشف: ${apt.appointmentDate} الساعة ${apt.appointmentTime}\nيرجى الحضور قبل الموعد بـ 15 دقيقة وإحضار الفحوصات والأشرة السابقة.`
  );
  const location = encodeURIComponent(apt.branchName || 'عيادة د. حسام منصور');
  const dates = `${formatUtc(reminderStart)}/${formatUtc(reminderEnd)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
}

export function downloadIcsFile(apt: Appointment) {
  const [y, m, d] = apt.appointmentDate.split('-');
  const [h, min] = apt.appointmentTime.split(':');

  const apptStart = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  const reminderStart = new Date(apptStart.getTime() - REMINDER_LEAD_MS);
  const reminderEnd = apptStart;

  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dr Hossam Mansour Clinic//Arabic Medical Appointment//AR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${apt.id}@hossammansour.clinic`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(reminderStart)}`,
    `DTEND:${formatIcsDate(reminderEnd)}`,
    `SUMMARY:تذكير موعد كشف عظام - د. حسام منصور (${apt.serviceName || 'استشارة'})`,
    `DESCRIPTION:رقم الحجز: ${apt.bookingNumber}\\nالمريض: ${apt.patientName}\\nالفرع: ${apt.branchName}\\nموعد الكشف: ${apt.appointmentDate} الساعة ${apt.appointmentTime}\\nيرجى إحضار الأشعة والتقارير الطبية السابقة.`,
    `LOCATION:${apt.branchName || 'عيادة د. حسام منصور'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT0M',
    'ACTION:DISPLAY',
    'DESCRIPTION:تذكير موعد الكشف بعد ساعتين',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `appointment-${apt.bookingNumber}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

