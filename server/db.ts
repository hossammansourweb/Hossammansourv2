import { db as firestore, firebaseAuth } from './firebase.ts';
import {
  FieldValue,
  Timestamp,
  type Query,
} from 'firebase-admin/firestore';
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
} from '../src/types/index.ts';

const timestamp = () => FieldValue.serverTimestamp();
const writeAny = FieldValue as any;

interface UserWithPassword extends User {
  passwordHash: string;
}

// Collection names (kept singular for clarity)
const COL = {
  users: 'users',
  branches: 'branches',
  services: 'services',
  appointments: 'appointments',
  workingHours: 'workingHours',
  exceptions: 'scheduleExceptions',
  doctorProfile: 'doctorProfile',
  reviews: 'reviews',
  faqs: 'faqs',
  announcements: 'announcements',
  auditLogs: 'auditLogs',
  notifications: 'notifications',
};

const DOCTOR_PROFILE_DOC_ID = 'main';

function toIso(value: any): string {
  if (!value) return new Date().toISOString();
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function ts(value: any): Timestamp | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return Timestamp.fromDate(d);
  }
  return null;
}

class ClinicDatabase {
  // Audit Logger
  public async logAudit(
    userId: string,
    userName: string,
    userRole: string,
    action: string,
    entityType: string,
    entityId: string,
    details: string
  ): Promise<void> {
    await firestore().collection(COL.auditLogs).add({
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      details,
      timestamp: timestamp(),
    });
  }

  // ----------------- USERS -----------------
  public async getUsers(): Promise<User[]> {
    const snap = await firestore().collection(COL.users).get();
    return snap.docs.map(d => {
      const data = d.data() as UserWithPassword;
      const { passwordHash: _omit, ...safe } = data as any;
      return safe as User;
    });
  }

  public async findUserById(id: string): Promise<UserWithPassword | null> {
    const doc = await firestore().collection(COL.users).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as UserWithPassword;
  }

  public async findUserByPhoneOrEmail(identifier: string): Promise<UserWithPassword | null> {
    const clean = identifier.trim();
    const lower = clean.toLowerCase();
    // Try phone first
    const phoneQ = await firestore()
      .collection(COL.users)
      .where('phone', '==', clean)
      .limit(1)
      .get();
    if (!phoneQ.empty) return phoneQ.docs[0].data() as UserWithPassword;
    // Try email
    const emailQ = await firestore()
      .collection(COL.users)
      .where('email', '==', lower)
      .limit(1)
      .get();
    if (!emailQ.empty) return emailQ.docs[0].data() as UserWithPassword;
    return null;
  }

  public async createUser(userData: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    role?: 'patient' | 'super_admin' | 'receptionist' | 'content_editor';
    gender?: 'male' | 'female';
    age?: number;
  }): Promise<User> {
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseUser: UserWithPassword = {
      id,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      role: userData.role || 'patient',
      gender: userData.gender,
      age: userData.age,
      passwordHash: '', // passwords live in Firebase Auth only
      createdAt: new Date().toISOString(),
    };
    await firestore().collection(COL.users).doc(id).set(baseUser);
    const { passwordHash: _omit, ...safe } = baseUser;
    return safe as User;
  }

  public async createUserWithId(
    id: string,
    userData: {
      name: string;
      phone: string;
      email?: string;
      password: string;
      role?: 'patient' | 'super_admin' | 'receptionist' | 'content_editor';
      gender?: 'male' | 'female';
      age?: number;
    }
  ): Promise<User> {
    const baseUser: UserWithPassword = {
      id,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      role: userData.role || 'patient',
      gender: userData.gender,
      age: userData.age,
      passwordHash: '', // passwords live in Firebase Auth only
      createdAt: new Date().toISOString(),
    };
    await firestore().collection(COL.users).doc(id).set(baseUser);
    const { passwordHash: _omit, ...safe } = baseUser;
    return safe as User;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const ref = firestore().collection(COL.users).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean: any = { ...updates };
    // Don't allow overwriting id
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    const data = fresh.data() as UserWithPassword;
    const { passwordHash: _omit, ...safe } = data;
    return safe as User;
  }

  // Soft delete a patient (deactivate account)
  public async deactivatePatient(id: string): Promise<User | null> {
    const ref = firestore().collection(COL.users).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ isActive: false, updatedAt: new Date().toISOString() });
    const fresh = await ref.get();
    return fresh.data() as User | null;
  }

  // ----------------- BRANCHES -----------------
  public async getBranches(includeInactive = false): Promise<Branch[]> {
    const snap = await firestore().collection(COL.branches).get();
    return snap.docs
      .map(d => d.data() as Branch)
      .filter(b => includeInactive || b.isActive)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public async findBranchById(id: string): Promise<Branch | null> {
    const doc = await firestore().collection(COL.branches).doc(id).get();
    return doc.exists ? (doc.data() as Branch) : null;
  }

  public async createBranch(branch: Omit<Branch, 'id'>): Promise<Branch> {
    const id = `br_${Date.now()}`;
    const newBranch: Branch = { ...branch, id } as Branch;
    await firestore().collection(COL.branches).doc(id).set(newBranch);
    return newBranch;
  }

  public async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch | null> {
    const ref = firestore().collection(COL.branches).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean: any = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return fresh.data() as Branch;
  }

  public async deleteBranch(id: string): Promise<boolean> {
    const ref = firestore().collection(COL.branches).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }

  // ----------------- SERVICES -----------------
  public async getServices(includeUnapproved = false): Promise<MedicalService[]> {
    const snap = await firestore().collection(COL.services).get();
    return snap.docs
      .map(d => d.data() as MedicalService)
      .filter(s => includeUnapproved || (s.isApproved && s.isVisible))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public async findServiceById(id: string): Promise<MedicalService | null> {
    const doc = await firestore().collection(COL.services).doc(id).get();
    return doc.exists ? (doc.data() as MedicalService) : null;
  }

  public async createService(service: Omit<MedicalService, 'id'>): Promise<MedicalService> {
    const id = `srv_${Date.now()}`;
    const newService: MedicalService = { ...service, id } as MedicalService;
    await firestore().collection(COL.services).doc(id).set(newService);
    return newService;
  }

  public async updateService(
    id: string,
    updates: Partial<MedicalService>
  ): Promise<MedicalService | null> {
    const ref = firestore().collection(COL.services).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean: any = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return fresh.data() as MedicalService;
  }

  public async deleteService(id: string): Promise<boolean> {
    const ref = firestore().collection(COL.services).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }

  // ----------------- WORKING HOURS & EXCEPTIONS -----------------
  public async getWorkingHours(branchId?: string): Promise<WorkingHourRule[]> {
    let q: Query = firestore().collection(COL.workingHours);
    if (branchId) q = q.where('branchId', '==', branchId);
    const snap = await q.get();
    return snap.docs.map(d => d.data() as WorkingHourRule);
  }

  public async updateWorkingHour(
    id: string,
    updates: Partial<WorkingHourRule>
  ): Promise<WorkingHourRule | null> {
    const ref = firestore().collection(COL.workingHours).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean: any = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return fresh.data() as WorkingHourRule;
  }

  public async getExceptions(branchId?: string): Promise<ScheduleException[]> {
    let q: Query = firestore().collection(COL.exceptions);
    if (branchId) q = q.where('branchId', '==', branchId);
    const snap = await q.get();
    return snap.docs.map(d => d.data() as ScheduleException);
  }

  public async createException(
    exception: Omit<ScheduleException, 'id'>
  ): Promise<ScheduleException> {
    const id = `ex_${Date.now()}`;
    const newEx: ScheduleException = { ...exception, id } as ScheduleException;
    await firestore().collection(COL.exceptions).doc(id).set(newEx);
    return newEx;
  }

  public async deleteException(id: string): Promise<boolean> {
    const ref = firestore().collection(COL.exceptions).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }

  // ----------------- AVAILABLE SLOTS -----------------
  public async calculateAvailableSlots(
    branchId: string,
    serviceId: string,
    dateStr: string
  ): Promise<AvailableSlot[]> {
    const dateObj = new Date(dateStr + 'T00:00:00');
    if (isNaN(dateObj.getTime())) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateObj);
    targetDate.setHours(0, 0, 0, 0);
    if (targetDate < today) return [];

    const dayOfWeek = dateObj.getDay();

    const excSnap = await firestore()
      .collection(COL.exceptions)
      .where('branchId', '==', branchId)
      .where('date', '==', dateStr)
      .limit(1)
      .get();
    const exception = excSnap.empty ? null : (excSnap.docs[0].data() as ScheduleException);

    if (exception && (exception.type === 'holiday' || exception.type === 'off_day')) {
      return [];
    }

    const ruleSnap = await firestore()
      .collection(COL.workingHours)
      .where('branchId', '==', branchId)
      .where('dayOfWeek', '==', dayOfWeek)
      .limit(1)
      .get();
    const rule = ruleSnap.empty ? null : (ruleSnap.docs[0].data() as WorkingHourRule);

    if (!rule || !rule.isOpen) return [];

    let startTimeStr = rule.startTime;
    let endTimeStr = rule.endTime;
    if (exception && exception.type === 'special_hours' && exception.startTime && exception.endTime) {
      startTimeStr = exception.startTime;
      endTimeStr = exception.endTime;
    }

    const service = serviceId ? await this.findServiceById(serviceId) : null;
    const slotDuration = service ? service.durationMinutes : rule.slotDurationMinutes || 20;
    const gap = rule.gapMinutes || 5;

    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const formatMins = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const startMins = parseMins(startTimeStr);
    const endMins = parseMins(endTimeStr);

    const bookingsSnap = await firestore()
      .collection(COL.appointments)
      .where('branchId', '==', branchId)
      .where('appointmentDate', '==', dateStr)
      .where('status', '!=', 'cancelled')
      .get();
    const existingBookings = bookingsSnap.docs.map(d => d.data() as Appointment);

    const breaks = rule.breaks || [];
    const slots: AvailableSlot[] = [];
    let currentMins = startMins;

    while (currentMins + slotDuration <= endMins) {
      const slotTimeStr = formatMins(currentMins);
      const inBreak = breaks.some(b => {
        const bStart = parseMins(b.startTime);
        const bEnd = parseMins(b.endTime);
        return currentMins >= bStart && currentMins < bEnd;
      });
      if (inBreak) {
        currentMins += slotDuration + gap;
        continue;
      }
      const isBooked = existingBookings.some(apt => apt.appointmentTime === slotTimeStr);
      slots.push({
        time: slotTimeStr,
        isAvailable: !isBooked,
        reason: isBooked ? 'محجوز' : undefined,
      });
      currentMins += slotDuration + gap;
    }

    return slots;
  }

  // ----------------- APPOINTMENTS -----------------
  public async getAppointments(filters?: {
    patientId?: string;
    branchId?: string;
    serviceId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<Appointment[]> {
    const snap = await firestore().collection(COL.appointments).get();
    let list = snap.docs.map(d => d.data() as Appointment);

    if (filters) {
      if (filters.patientId) {
        list = list.filter(a => a.patientId === filters.patientId);
      }
      if (filters.branchId && filters.branchId !== 'all') {
        list = list.filter(a => a.branchId === filters.branchId);
      }
      if (filters.serviceId && filters.serviceId !== 'all') {
        list = list.filter(a => a.serviceId === filters.serviceId);
      }
      if (filters.status && filters.status !== 'all') {
        list = list.filter(a => a.status === filters.status);
      }
      if (filters.dateFrom) {
        list = list.filter(a => (a.appointmentDate || '') >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        list = list.filter(a => (a.appointmentDate || '') <= filters.dateTo!);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase().trim();
        list = list.filter(
          a =>
            (a.bookingNumber || '').toLowerCase().includes(s) ||
            (a.patientName || '').toLowerCase().includes(s) ||
            (a.patientPhone || '').includes(s)
        );
      }
    }

    return list.sort((a, b) => {
      const adA = a.appointmentDate || '';
      const adB = b.appointmentDate || '';
      if (adA === adB) {
        return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
      }
      return adB.localeCompare(adA);
    });
  }

  public async findAppointmentById(id: string): Promise<Appointment | null> {
    const doc = await firestore().collection(COL.appointments).doc(id).get();
    return doc.exists ? (doc.data() as Appointment) : null;
  }

  public async findAppointmentByBookingNumber(
    bookingNumber: string
  ): Promise<Appointment | null> {
    const normalized = bookingNumber.toLowerCase().trim();
    const snap = await firestore()
      .collection(COL.appointments)
      .where('bookingNumber_lower', '==', normalized)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data() as Appointment;
  }

  public async createAppointment(data: {
    patientId?: string;
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
  }): Promise<Appointment> {
    const conflictQ = await firestore()
      .collection(COL.appointments)
      .where('branchId', '==', data.branchId)
      .where('appointmentDate', '==', data.appointmentDate)
      .where('appointmentTime', '==', data.appointmentTime)
      .where('status', '!=', 'cancelled')
      .limit(1)
      .get();
    if (!conflictQ.empty) {
      throw new Error('هذا الموعد تم حجزه بالفعل لمريض آخر، يرجى اختيار موعد آخر متاح.');
    }

    const [service, branch] = await Promise.all([
      this.findServiceById(data.serviceId),
      this.findBranchById(data.branchId),
    ]);

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `HM-${new Date().getFullYear()}-${randomDigits}`;
    const id = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newAppointment: Appointment = {
      id,
      bookingNumber,
      bookingNumber_lower: bookingNumber.toLowerCase(),
      patientId: data.patientId,
      patientName: data.patientName.trim(),
      patientPhone: data.patientPhone.trim(),
      patientEmail: data.patientEmail?.trim(),
      patientAge: data.patientAge,
      patientGender: data.patientGender || 'male',
      serviceId: data.serviceId,
      serviceName: service?.name || 'استشارة عظام',
      branchId: data.branchId,
      branchName: branch?.name || 'العيادة',
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      confirmationMethod: data.confirmationMethod || 'whatsapp',
      status: 'new',
      notes: data.notes?.trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await firestore().collection(COL.appointments).doc(id).set(newAppointment);

    await this.createNotification({
      appointmentId: newAppointment.id,
      recipientPhone: newAppointment.patientPhone,
      recipientEmail: newAppointment.patientEmail,
      type: 'booking_confirmation',
      channel: newAppointment.confirmationMethod === 'sms' ? 'sms' : 'whatsapp',
      content: `تم تسجيل حجزك بنجاح في عيادة د. حسام منصور برقم (${bookingNumber}) بتاريخ ${newAppointment.appointmentDate} الساعة ${newAppointment.appointmentTime} بـ ${newAppointment.branchName}.`,
    });

    return newAppointment;
  }

  public async updateAppointmentStatus(
    id: string,
    status: Appointment['status'],
    reason?: string,
    internalNotes?: string
  ): Promise<Appointment | null> {
    const ref = firestore().collection(COL.appointments).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const apt = doc.data() as Appointment;
    const updates: any = { status, updatedAt: new Date().toISOString() };
    if (reason) updates.cancellationReason = reason;
    if (internalNotes !== undefined) updates.clinicInternalNotes = internalNotes;
    await ref.update(updates);

    const fresh = (await ref.get()).data() as Appointment;

    if (status === 'confirmed') {
      await this.createNotification({
        appointmentId: apt.id,
        recipientPhone: apt.patientPhone,
        ...(apt.patientEmail ? { recipientEmail: apt.patientEmail } : {}),
        type: 'booking_confirmation',
        channel: apt.confirmationMethod === 'sms' ? 'sms' : 'whatsapp',
        content: `تم تأكيد موعدك رسمياً في عيادة د. حسام منصور برقم (${apt.bookingNumber}) في ${apt.branchName} يوم ${apt.appointmentDate} في تمام ${apt.appointmentTime}. نتشرف بخدمتكم.`,
      });
    } else if (status === 'cancelled') {
      await this.createNotification({
        appointmentId: apt.id,
        recipientPhone: apt.patientPhone,
        ...(apt.patientEmail ? { recipientEmail: apt.patientEmail } : {}),
        type: 'cancellation',
        channel: apt.confirmationMethod === 'sms' ? 'sms' : 'whatsapp',
        content: `تم إلغاء الموعد رقم (${apt.bookingNumber}) في عيادة د. حسام منصور بناءً على طلبكم/الإدارة. سبب الإلغاء: ${reason || 'بناء على رغبة المريض'}.`,
      });
    }

    return fresh;
  }

  public async rescheduleAppointment(
    id: string,
    newDate: string,
    newTime: string,
    newBranchId?: string
  ): Promise<Appointment | null> {
    const ref = firestore().collection(COL.appointments).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const apt = doc.data() as Appointment;
    const targetBranchId = newBranchId || apt.branchId;

    const conflictQ = await firestore()
      .collection(COL.appointments)
      .where('branchId', '==', targetBranchId)
      .where('appointmentDate', '==', newDate)
      .where('appointmentTime', '==', newTime)
      .where('status', '!=', 'cancelled')
      .get();
    const conflict = conflictQ.docs.find(d => d.id !== id);
    if (conflict) {
      throw new Error('الموعد الجديد المختار محجوز بالفعل، يرجى اختيار موعد آخر.');
    }

    const branch = await this.findBranchById(targetBranchId);
    const updates: any = {
      branchId: targetBranchId,
      branchName: branch?.name || apt.branchName,
      appointmentDate: newDate,
      appointmentTime: newTime,
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    };
    await ref.update(updates);

    const fresh = (await ref.get()).data() as Appointment;

    await this.createNotification({
      appointmentId: apt.id,
      recipientPhone: apt.patientPhone,
      recipientEmail: apt.patientEmail,
      type: 'reschedule',
      channel: apt.confirmationMethod === 'sms' ? 'sms' : 'whatsapp',
      content: `تم تعديل موعدك في عيادة د. حسام منصور إلى يوم ${newDate} الساعة ${newTime} في ${fresh.branchName}. رقم الحجز: ${apt.bookingNumber}.`,
    });

    return fresh;
  }

  // ----------------- DASHBOARD STATS -----------------
  public async getDashboardStats(): Promise<DashboardStats> {
    const [appointments, branches, patients] = await Promise.all([
      this.getAppointments(),
      this.getBranches(true),
      this.getUsers(),
    ]);

    const todayStr = new Date().toISOString().split('T')[0];

    const now = new Date();
    const day = now.getDay();
    const diffToWeekStart = (day + 1) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const todayBookings = appointments.filter(a => a.appointmentDate === todayStr).length;
    const weeklyBookings = appointments.filter(a => a.appointmentDate >= weekStartStr).length;
    const newBookings = appointments.filter(a => a.status === 'new').length;
    const confirmedBookings = appointments.filter(a => a.status === 'confirmed').length;
    const cancelledBookings = appointments.filter(a => a.status === 'cancelled').length;
    const completedBookings = appointments.filter(a => a.status === 'completed').length;
    const checkedInBookings = appointments.filter(a => a.status === 'checked_in').length;
    const noShowBookings = appointments.filter(a => a.status === 'no_show').length;

    const uniquePatients = new Set(appointments.map(a => a.patientPhone)).size;
    const totalResolved = completedBookings + checkedInBookings + noShowBookings;
    const attendanceRate = totalResolved > 0 ? Math.round(((completedBookings + checkedInBookings) / totalResolved) * 100) : 94;

    const branchBreakdown = branches.map(b => ({
      branchName: b.name,
      count: appointments.filter(a => a.branchId === b.id).length,
    }));

    return {
      todayBookings,
      weeklyBookings,
      newBookings,
      confirmedBookings,
      cancelledBookings,
      completedBookings,
      totalPatients: uniquePatients || patients.filter(u => u.role === 'patient').length,
      attendanceRate,
      branchBreakdown,
    };
  }

  // ----------------- CONTENT (Doctor Profile, FAQs, Reviews, Announcements) -----------------
  public async getDoctorProfile(): Promise<DoctorProfile> {
    const doc = await firestore()
      .collection(COL.doctorProfile)
      .doc(DOCTOR_PROFILE_DOC_ID)
      .get();
    if (!doc.exists) {
      const empty: DoctorProfile = {
        name: '',
        title: '',
        militaryTitle: '',
        bio: '',
        fullBiography: [],
        specialties: [],
        experiences: [],
        patientCareApproach: [],
        consultationFeeNote: '',
        isApproved: false,
        lastUpdatedBy: '',
        updatedAt: new Date().toISOString(),
      };
      await firestore().collection(COL.doctorProfile).doc(DOCTOR_PROFILE_DOC_ID).set(empty);
      return empty;
    }
    return doc.data() as DoctorProfile;
  }

  public async updateDoctorProfile(
    profile: Partial<DoctorProfile>,
    updatedBy: string
  ): Promise<DoctorProfile> {
    const ref = firestore().collection(COL.doctorProfile).doc(DOCTOR_PROFILE_DOC_ID);
    const current = (await ref.get()).data() as DoctorProfile | undefined;
    const merged: DoctorProfile = {
      ...(current || ({} as DoctorProfile)),
      ...profile,
      lastUpdatedBy: updatedBy,
      updatedAt: new Date().toISOString(),
    } as DoctorProfile;
    await ref.set(merged);
    return merged;
  }

  public async getReviews(includeUnapproved = false): Promise<Review[]> {
    const snap = await firestore().collection(COL.reviews).get();
    return snap.docs
      .map(d => d.data() as Review)
      .filter(r => includeUnapproved || r.isApproved)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public async createReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const id = `rev_${Date.now()}`;
    const newReview: Review = { ...review, id, createdAt: new Date().toISOString() } as Review;
    await firestore().collection(COL.reviews).doc(id).set(newReview);
    return newReview;
  }

  public async updateReviewApproval(
    id: string,
    isApproved: boolean,
    isFeatured = false
  ): Promise<Review | null> {
    const ref = firestore().collection(COL.reviews).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ isApproved, isFeatured });
    return (await ref.get()).data() as Review;
  }

  public async deleteReview(id: string): Promise<boolean> {
    const ref = firestore().collection(COL.reviews).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }

  public async getFaqs(includeUnapproved = false): Promise<FAQItem[]> {
    const snap = await firestore().collection(COL.faqs).get();
    return snap.docs
      .map(d => d.data() as FAQItem)
      .filter(f => includeUnapproved || f.isApproved)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  public async createFaq(faq: Omit<FAQItem, 'id' | 'createdAt'>): Promise<FAQItem> {
    const id = `faq_${Date.now()}`;
    const newFaq: FAQItem = { ...faq, id, createdAt: new Date().toISOString() } as FAQItem;
    await firestore().collection(COL.faqs).doc(id).set(newFaq);
    return newFaq;
  }

  public async updateFaq(id: string, updates: Partial<FAQItem>): Promise<FAQItem | null> {
    const ref = firestore().collection(COL.faqs).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean: any = { ...updates };
    delete clean.id;
    await ref.update(clean);
    return (await ref.get()).data() as FAQItem;
  }

  public async deleteFaq(id: string): Promise<boolean> {
    const ref = firestore().collection(COL.faqs).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }

  public async getAnnouncements(activeOnly = true): Promise<Announcement[]> {
    const snap = await firestore().collection(COL.announcements).get();
    return snap.docs
      .map(d => d.data() as Announcement)
      .filter(a => !activeOnly || a.isActive);
  }

  public async updateAnnouncement(
    id: string,
    updates: Partial<Announcement>
  ): Promise<Announcement | null> {
    const ref = firestore().collection(COL.announcements).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean: any = { ...updates };
    delete clean.id;
    await ref.update(clean);
    return (await ref.get()).data() as Announcement;
  }

  // ----------------- AUDIT LOGS & NOTIFICATIONS -----------------
  public async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const snap = await firestore()
      .collection(COL.auditLogs)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => {
      const data = d.data() as any;
      return { ...data, id: d.id, timestamp: toIso(data.timestamp) } as AuditLog;
    });
  }

  public async getNotifications(limit = 100): Promise<NotificationRecord[]> {
    const snap = await firestore()
      .collection(COL.notifications)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => {
      const data = d.data() as any;
      return { ...data, id: d.id, createdAt: toIso(data.createdAt) } as NotificationRecord;
    });
  }

  public async createNotification(
    data: Omit<NotificationRecord, 'id' | 'status' | 'createdAt'>
  ): Promise<NotificationRecord> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const record: NotificationRecord = {
      ...data,
      id,
      status: 'delivered',
      createdAt: new Date().toISOString(),
    } as NotificationRecord;
    const cleanRecord = Object.fromEntries(
      Object.entries(record).filter(([, value]) => value !== undefined)
    ) as NotificationRecord;
    await firestore().collection(COL.notifications).doc(id).set(cleanRecord);
    return cleanRecord;
  }

  // ----------------- CMS HELPERS -----------------
  public async updateReview(id: string, updates: Partial<Review>): Promise<Review | null> {
    const ref = firestore().collection(COL.reviews).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const clean: any = { ...updates };
    delete clean.id;
    await ref.update(clean);
    const fresh = await ref.get();
    return { ...fresh.data(), id: fresh.id } as Review;
  }

  public async deleteAnnouncement(id: string): Promise<boolean> {
    const ref = firestore().collection(COL.announcements).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }

  // ----------------- FIREBASE AUTH HELPERS (server-side) -----------------
  public async createAuthUser(opts: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<string> {
    const userRecord = await firebaseAuth().createUser({
      email: opts.email,
      password: opts.password,
      displayName: opts.displayName,
    });
    return userRecord.uid;
  }

  public async setAuthUserRole(uid: string, role: string): Promise<void> {
    await firebaseAuth().setCustomUserClaims(uid, { role });
  }

  // ----------------- ADMIN USER MANAGEMENT -----------------
  public async deleteUser(id: string): Promise<User | null> {
    const ref = firestore().collection(COL.users).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    const data = doc.data() as User;
    // Delete the Firebase Auth account too (best-effort)
    try { await firebaseAuth().deleteUser(id); } catch { /* ignore */ }
    await ref.delete();
    return data;
  }
}

// Suppress unused-var warning for writeAny if not used
void writeAny;
void ts;

export const db = new ClinicDatabase();