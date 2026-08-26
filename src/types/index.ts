export type UserRole = 'super_admin' | 'receptionist' | 'content_editor' | 'patient';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  gender?: 'male' | 'female';
  age?: number;
  createdAt: string;
  lastLoginAt?: string;
  isActive?: boolean;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  mapUrl: string;
  phone: string;
  secondaryPhone?: string;
  workingHoursDescription: string;
  isActive: boolean;
  order: number;
}

export interface ServiceFAQ {
  question: string;
  answer: string;
}

export interface MedicalService {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  price?: number;
  isPriceVisible: boolean;
  iconName: string;
  order: number;
  isApproved: boolean;
  isVisible: boolean;
  faqs?: ServiceFAQ[];
}

export type AppointmentStatus =
  | 'new'
  | 'confirmed'
  | 'pending'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ConfirmationMethod = 'whatsapp' | 'sms' | 'call';

export interface Appointment {
  id: string;
  bookingNumber: string;
  bookingNumber_lower?: string;
  patientId?: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientAge?: number;
  patientGender?: 'male' | 'female';
  serviceId: string;
  serviceName?: string;
  branchId: string;
  branchName?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM
  confirmationMethod: ConfirmationMethod;
  status: AppointmentStatus;
  cancellationReason?: string;
  notes?: string;
  clinicInternalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeBreak {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  label: string;
}

export interface WorkingHourRule {
  id: string;
  branchId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
  isOpen: boolean;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  slotDurationMinutes: number;
  gapMinutes: number;
  breaks: TimeBreak[];
}

export interface ScheduleException {
  id: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  type: 'holiday' | 'off_day' | 'special_hours';
  startTime?: string;
  endTime?: string;
  reason: string;
}

export interface DoctorProfile {
  name: string;
  title: string;
  militaryTitle: string;
  bio: string;
  fullBiography: string[];
  specialties: string[];
  experiences: { period: string; title: string; institution: string }[];
  patientCareApproach: string[];
  consultationFeeNote: string;
  isApproved: boolean;
  lastUpdatedBy: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  patientName: string;
  rating: number; // 1-5
  reviewText: string;
  treatmentType: string;
  visitDate: string;
  isApproved: boolean;
  isFeatured: boolean;
  order: number;
  createdAt: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  isApproved: boolean;
  order: number;
  createdAt: string;
}

export interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  isActive: boolean;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  appointmentId?: string;
  recipientPhone: string;
  recipientEmail?: string;
  type: 'booking_confirmation' | 'reminder' | 'reschedule' | 'cancellation';
  channel: 'whatsapp' | 'sms' | 'email';
  content: string;
  status: 'sent' | 'delivered' | 'pending' | 'mock_sent';
  createdAt: string;
}

export interface Prescription {
  id: string;
  userId: string;
  imageUrl: string;
  provider: 'imgbb' | 'freeimage';
  note?: string;
  createdAt: string; // ISO timestamp
  updatedAt?: string;
}

export interface AdminPrescription extends Prescription {
  patientName: string;
  patientEmail?: string;
  patientPhone: string;
}

export interface AvailableSlot {
  time: string; // HH:MM
  isAvailable: boolean;
  reason?: string;
}

export interface DashboardStats {
  todayBookings: number;
  weeklyBookings: number;
  newBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalPatients: number;
  attendanceRate: number;
  branchBreakdown: { branchName: string; count: number }[];
}
