import { Appointment } from '../types/index.ts';

export function generateGoogleCalendarUrl(apt: Appointment): string {
  const [y, m, d] = apt.appointmentDate.split('-');
  const [h, min] = apt.appointmentTime.split(':');

  const startDate = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 mins duration

  const formatUtc = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const title = encodeURIComponent(`موعد كشف عظام - د. حسام منصور (${apt.serviceName || 'استشارة'})`);
  const details = encodeURIComponent(
    `كشف في عيادة د. حسام منصور أبو كحلة - استشاري جراحة العظام والمفاصل.\nرقم الحجز: ${apt.bookingNumber}\nاسم المريض: ${apt.patientName}\nالفرع: ${apt.branchName}\nيرجى الحضور قبل الموعد بـ 15 دقيقة وإحضار الفحوصات والأشعة السابقة.`
  );
  const location = encodeURIComponent(apt.branchName || 'عيادة د. حسام منصور');
  const dates = `${formatUtc(startDate)}/${formatUtc(endDate)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
}

export function downloadIcsFile(apt: Appointment) {
  const [y, m, d] = apt.appointmentDate.split('-');
  const [h, min] = apt.appointmentTime.split(':');

  const startDate = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

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
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:موعد كشف عظام - د. حسام منصور (${apt.serviceName || 'استشارة'})`,
    `DESCRIPTION:رقم الحجز: ${apt.bookingNumber}\\nالمريض: ${apt.patientName}\\nالفرع: ${apt.branchName}\\nيرجى إحضار الأشعة والتقارير الطبية السابقة.`,
    `LOCATION:${apt.branchName || 'عيادة د. حسام منصور'}`,
    'STATUS:CONFIRMED',
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
