import {
  User,
  Branch,
  MedicalService,
  Appointment,
  WorkingHourRule,
  ScheduleException,
  DoctorProfile,
  Review,
  FAQItem,
  Announcement,
  AuditLog,
  NotificationRecord,
  AvailableSlot,
  DashboardStats,
} from '../types/index.ts';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('clinic_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.warn(`[API] Expected JSON but received ${contentType || 'unknown'} for ${endpoint}`);
      if (!response.ok) {
        throw new Error(`خطأ في الاتصال بالخادم (${response.status})`);
      }
      throw new Error('استجابة غير متوقعة من الخادم.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'حدث خطأ في الاتصال بالخادم.');
    }

    return data;
  } catch (error: any) {
    console.error(`[API Request Error ${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  // Public
  getClinicInfo: () =>
    request<{
      success: boolean;
      data: {
        branches: Branch[];
        services: MedicalService[];
        doctorProfile: DoctorProfile;
        reviews: Review[];
        faqs: FAQItem[];
        announcements: Announcement[];
      };
    }>('/public/clinic-info'),

  getAvailableSlots: (branchId: string, serviceId: string, date: string) =>
    request<{ success: boolean; data: AvailableSlot[] }>(
      `/public/available-slots?branchId=${branchId}&serviceId=${serviceId}&date=${date}`
    ),

  bookAppointment: (payload: {
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    patientAge?: number;
    patientGender?: 'male' | 'female';
    serviceId: string;
    branchId: string;
    appointmentDate: string;
    appointmentTime: string;
    confirmationMethod?: 'whatsapp' | 'sms' | 'call';
    notes?: string;
  }) => request<{ success: boolean; message: string; data: Appointment }>('/public/appointments/book', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  lookupAppointment: (bookingNumber: string, phone: string) =>
    request<{ success: boolean; data: Appointment }>(
      `/public/appointments/lookup?bookingNumber=${encodeURIComponent(bookingNumber)}&phone=${encodeURIComponent(phone)}`
    ),

  submitReview: (payload: {
    patientName: string;
    rating: number;
    reviewText: string;
    treatmentType?: string;
  }) => request<{ success: boolean; message: string; data: Review }>('/public/reviews/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Auth
  register: (payload: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    gender?: 'male' | 'female';
    age?: number;
  }) => request<{ success: boolean; message: string; data: { user: User; token: string } }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  login: (identifier: string, password: string) =>
    request<{ success: boolean; message: string; data: { user: User; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  getMe: () => request<{ success: boolean; data: User }>('/auth/me'),

  forgotPassword: (identifier: string) =>
    request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  // Patient
  getPatientAppointments: () => request<{ success: boolean; data: Appointment[] }>('/patient/appointments'),

  patientCancelAppointment: (id: string, reason?: string) =>
    request<{ success: boolean; message: string; data: Appointment }>(`/patient/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  patientRescheduleAppointment: (id: string, newDate: string, newTime: string, newBranchId?: string) =>
    request<{ success: boolean; message: string; data: Appointment }>(`/patient/appointments/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ newDate, newTime, newBranchId }),
    }),

  updatePatientProfile: (payload: Partial<User>) =>
    request<{ success: boolean; message: string; data: User }>('/patient/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Admin
  getDashboardStats: () => request<{ success: boolean; data: DashboardStats }>('/admin/dashboard-stats'),

  getAdminAppointments: (params?: {
    branchId?: string;
    serviceId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.branchId) q.append('branchId', params.branchId);
    if (params?.serviceId) q.append('serviceId', params.serviceId);
    if (params?.status) q.append('status', params.status);
    if (params?.dateFrom) q.append('dateFrom', params.dateFrom);
    if (params?.dateTo) q.append('dateTo', params.dateTo);
    if (params?.search) q.append('search', params.search);
    return request<{ success: boolean; data: Appointment[] }>(`/admin/appointments?${q.toString()}`);
  },

  createAdminAppointment: (payload: any) =>
    request<{ success: boolean; message: string; data: Appointment }>('/admin/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAppointmentStatus: (id: string, status: string, reason?: string, clinicInternalNotes?: string) =>
    request<{ success: boolean; message: string; data: Appointment }>(`/admin/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason, clinicInternalNotes }),
    }),

  rescheduleAdminAppointment: (id: string, newDate: string, newTime: string, newBranchId?: string) =>
    request<{ success: boolean; message: string; data: Appointment }>(`/admin/appointments/${id}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ newDate, newTime, newBranchId }),
    }),

  getAdminCalendar: (branchId?: string, month?: string) => {
    const q = new URLSearchParams();
    if (branchId) q.append('branchId', branchId);
    if (month) q.append('month', month);
    return request<{ success: boolean; data: Appointment[] }>(`/admin/calendar?${q.toString()}`);
  },

  getAdminPatients: (search?: string) =>
    request<{ success: boolean; data: any[] }>(`/admin/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  getPatientHistory: (phone: string) =>
    request<{ success: boolean; data: Appointment[] }>(`/admin/patients/${encodeURIComponent(phone)}/history`),

  // Schedule & Working Hours
  getWorkingHours: (branchId?: string) =>
    request<{ success: boolean; data: WorkingHourRule[] }>(`/admin/working-hours${branchId ? `?branchId=${branchId}` : ''}`),

  updateWorkingHour: (id: string, updates: Partial<WorkingHourRule>) =>
    request<{ success: boolean; message: string; data: WorkingHourRule }>(`/admin/working-hours/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  getExceptions: (branchId?: string) =>
    request<{ success: boolean; data: ScheduleException[] }>(`/admin/exceptions${branchId ? `?branchId=${branchId}` : ''}`),

  createException: (payload: Omit<ScheduleException, 'id'>) =>
    request<{ success: boolean; message: string; data: ScheduleException }>('/admin/exceptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteException: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/exceptions/${id}`, {
      method: 'DELETE',
    }),

  // Branches & Services
  getAdminBranches: () => request<{ success: boolean; data: Branch[] }>('/admin/branches'),
  createBranch: (payload: Omit<Branch, 'id'>) =>
    request<{ success: boolean; message: string; data: Branch }>('/admin/branches', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateBranch: (id: string, payload: Partial<Branch>) =>
    request<{ success: boolean; message: string; data: Branch }>(`/admin/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteBranch: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/branches/${id}`, {
      method: 'DELETE',
    }),

  getAdminServices: () => request<{ success: boolean; data: MedicalService[] }>('/admin/services'),
  createService: (payload: Omit<MedicalService, 'id'>) =>
    request<{ success: boolean; message: string; data: MedicalService }>('/admin/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateService: (id: string, payload: Partial<MedicalService>) =>
    request<{ success: boolean; message: string; data: MedicalService }>(`/admin/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteService: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/services/${id}`, {
      method: 'DELETE',
    }),

  // CMS
  getDoctorProfile: () => request<{ success: boolean; data: DoctorProfile }>('/admin/content/doctor-profile'),
  updateDoctorProfile: (payload: Partial<DoctorProfile>) =>
    request<{ success: boolean; message: string; data: DoctorProfile }>('/admin/content/doctor-profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getAdminReviews: () => request<{ success: boolean; data: Review[] }>('/admin/content/reviews'),
  updateReviewApproval: (id: string, isApproved: boolean, isFeatured: boolean = false) =>
    request<{ success: boolean; message: string; data: Review }>(`/admin/content/reviews/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ isApproved, isFeatured }),
    }),
  deleteReview: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/content/reviews/${id}`, {
      method: 'DELETE',
    }),

  getAdminFaqs: () => request<{ success: boolean; data: FAQItem[] }>('/admin/content/faqs'),
  createFaq: (payload: Omit<FAQItem, 'id' | 'createdAt'>) =>
    request<{ success: boolean; message: string; data: FAQItem }>('/admin/content/faqs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateFaq: (id: string, payload: Partial<FAQItem>) =>
    request<{ success: boolean; message: string; data: FAQItem }>(`/admin/content/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteFaq: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/content/faqs/${id}`, {
      method: 'DELETE',
    }),

  updateAnnouncement: (id: string, payload: Partial<Announcement>) =>
    request<{ success: boolean; message: string; data: Announcement }>(`/admin/content/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Audit Logs, Notifications, Users
  getAuditLogs: () => request<{ success: boolean; data: AuditLog[] }>('/admin/audit-logs'),
  getNotifications: () => request<{ success: boolean; data: NotificationRecord[] }>('/admin/notifications'),
  getUsers: () => request<{ success: boolean; data: User[] }>('/admin/users'),
  createStaffUser: (payload: any) =>
    request<{ success: boolean; message: string; data: User }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
