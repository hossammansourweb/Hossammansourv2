import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { User, UserRole } from './src/types/index.ts';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'doctor-hossam-mansour-medical-clinic-jwt-secret-key-2026';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Request Interface with User
export interface AuthRequest extends Request {
  user?: User;
}

// Authentication Middleware
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'يرجى تسجيل الدخول أولاً للوصول إلى هذه الخدمة.' });
  }

  jwt.verify(token, JWT_SECRET, (err, payload: any) => {
    if (err || !payload || !payload.id) {
      return res.status(403).json({ success: false, message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.' });
    }
    const user = db.findUserById(payload.id);
    if (!user) {
      return res.status(403).json({ success: false, message: 'المستخدم غير موجود بالنظام.' });
    }
    const { passwordHash: _, ...safeUser } = user;
    req.user = safeUser;
    next();
  });
}

// Role Authorization Middleware
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'ليس لديك الصلاحيات الكافية لتنفيذ هذا الإجراء.' });
    }
    next();
  };
}

// ----------------------------------------------------
// 1. PUBLIC API ROUTES
// ----------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Clinic Public Metadata & Content
app.get('/api/public/clinic-info', (req, res) => {
  try {
    const branches = db.getBranches(false);
    const services = db.getServices(false);
    const doctorProfile = db.getDoctorProfile();
    const reviews = db.getReviews(false);
    const faqs = db.getFaqs(false);
    const announcements = db.getAnnouncements(true);

    res.json({
      success: true,
      data: {
        branches,
        services,
        doctorProfile,
        reviews,
        faqs,
        announcements,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'خطأ في جلب بيانات العيادة' });
  }
});

// Calculate Available Slots for a given branch, service, and date
app.get('/api/public/available-slots', (req, res) => {
  try {
    const { branchId, serviceId, date } = req.query as { branchId: string; serviceId: string; date: string };

    if (!branchId || !date) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد الفرع وتاريخ الحجز.' });
    }

    const slots = db.calculateAvailableSlots(branchId, serviceId || '', date);
    res.json({ success: true, data: slots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'خطأ في حساب المواعيد المتاحة' });
  }
});

// Book an Appointment (Public or Authenticated Patient)
app.post('/api/public/appointments/book', (req: AuthRequest, res) => {
  try {
    const {
      patientName,
      patientPhone,
      patientEmail,
      patientAge,
      patientGender,
      serviceId,
      branchId,
      appointmentDate,
      appointmentTime,
      confirmationMethod,
      notes,
    } = req.body;

    if (!patientName || !patientPhone || !serviceId || !branchId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ success: false, message: 'يرجى إكمال جميع الحقول المطلوبة للحجز.' });
    }

    // Phone validation (Egypt 10-11 digits)
    const phoneRegex = /^01[0125][0-9]{8}$/;
    const cleanPhone = patientPhone.trim().replace(/\s+/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01100171817).' });
    }

    let patientId: string | undefined = undefined;

    // If request has auth token, link to user
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const payload: any = jwt.verify(token, JWT_SECRET);
        if (payload?.id) patientId = payload.id;
      } catch (e) {
        // Continue as unlinked patient if token invalid
      }
    }

    // If no logged in user, try to find existing patient by phone
    if (!patientId) {
      const existingUser = db.findUserByPhoneOrEmail(cleanPhone);
      if (existingUser) {
        patientId = existingUser.id;
      }
    }

    const appointment = db.createAppointment({
      patientId,
      patientName,
      patientPhone: cleanPhone,
      patientEmail,
      patientAge: patientAge ? Number(patientAge) : undefined,
      patientGender,
      serviceId,
      branchId,
      appointmentDate,
      appointmentTime,
      confirmationMethod,
      notes,
    });

    db.logAudit(
      patientId || 'anonymous_patient',
      patientName,
      'patient',
      'CREATE_APPOINTMENT',
      'Appointment',
      appointment.id,
      `حجز موعد كشف جديد برقم ${appointment.bookingNumber} في ${appointment.branchName} بتاريخ ${appointment.appointmentDate} الساعة ${appointment.appointmentTime}`
    );

    res.status(201).json({
      success: true,
      message: 'تم تسجيل موعد الكشف بنجاح.',
      data: appointment,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'فشل في إتمام الحجز.' });
  }
});

// Appointment Lookup by Booking Number & Phone
app.get('/api/public/appointments/lookup', (req, res) => {
  try {
    const { bookingNumber, phone } = req.query as { bookingNumber: string; phone: string };

    if (!bookingNumber || !phone) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال رقم الحجز ورقم الهاتف المسجل.' });
    }

    const appointment = db.findAppointmentByBookingNumber(bookingNumber);
    if (!appointment || appointment.patientPhone.replace(/\s+/g, '') !== phone.replace(/\s+/g, '')) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على حجز يطابق هذه البيانات.' });
    }

    res.json({ success: true, data: appointment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'خطأ في الاستعلام' });
  }
});

// Submit a Patient Review (Requires Admin Approval)
app.post('/api/public/reviews/submit', (req, res) => {
  try {
    const { patientName, rating, reviewText, treatmentType } = req.body;

    if (!patientName || !rating || !reviewText) {
      return res.status(400).json({ success: false, message: 'يرجى كتابة الاسم والتقييم ورأيكم.' });
    }

    const review = db.createReview({
      patientName: patientName.trim(),
      rating: Math.min(5, Math.max(1, Number(rating))),
      reviewText: reviewText.trim(),
      treatmentType: treatmentType?.trim() || 'كشف واستشارة عظام',
      visitDate: new Date().toISOString().split('T')[0],
      isApproved: false, // Strict Admin approval requirement
      isFeatured: false,
      order: 10,
    });

    db.logAudit(
      'anonymous_patient',
      patientName,
      'patient',
      'SUBMIT_REVIEW',
      'Review',
      review.id,
      `إرسال تقييم مريض جديد في انتظار موافقة الإدارة.`
    );

    res.status(201).json({
      success: true,
      message: 'شكراً لمشاركتنا تجربتكم! سيتم مراجعة التقييم واعتماده من إدارة العيادة قبل النشر.',
      data: review,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'فشل في إرسال التقييم.' });
  }
});

// ----------------------------------------------------
// 2. AUTHENTICATION ROUTES
// ----------------------------------------------------

// Register Patient Account
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, phone, email, password, gender, age } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'يرجى كتابة الاسم ورقم الهاتف وكلمة المرور.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const existing = db.findUserByPhoneOrEmail(cleanPhone);
    if (existing) {
      return res.status(409).json({ success: false, message: 'يوجد حساب مسجل بالفعل بهذا الرقم أو البريد.' });
    }

    const user = db.createUser({
      name: name.trim(),
      phone: cleanPhone,
      email: email?.trim(),
      password,
      role: 'patient',
      gender,
      age: age ? Number(age) : undefined,
    });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: '30d',
    });

    db.logAudit(user.id, user.name, user.role, 'USER_REGISTER', 'User', user.id, 'تسجيل حساب مريض جديد بالمنصة.');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح.',
      data: { user, token },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'فشل في إنشاء الحساب.' });
  }
});

// Login (Email or Phone + Password)
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال رقم الهاتف / البريد وكلمة المرور.' });
    }

    const userWithHash = db.findUserByPhoneOrEmail(identifier);
    if (!userWithHash) {
      return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة، يرجى التأكد من الرقم أو كلمة المرور.' });
    }

    const isMatch = bcrypt.compareSync(password, userWithHash.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة.' });
    }

    // Update last login
    db.updateUser(userWithHash.id, { lastLoginAt: new Date().toISOString() });

    const { passwordHash: _, ...safeUser } = userWithHash;
    const token = jwt.sign({ id: safeUser.id, role: safeUser.role, name: safeUser.name }, JWT_SECRET, {
      expiresIn: '30d',
    });

    db.logAudit(safeUser.id, safeUser.name, safeUser.role, 'USER_LOGIN', 'User', safeUser.id, 'تسجيل دخول ناجح للمنصة.');

    res.json({
      success: true,
      message: 'مرحباً بك مجدداً!',
      data: { user: safeUser, token },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'فشل في تسجيل الدخول.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({ success: true, data: req.user });
});

// Password Reset Request (Simulated secure reset token)
app.post('/api/auth/forgot-password', (req, res) => {
  const { identifier } = req.body;
  const user = db.findUserByPhoneOrEmail(identifier);
  if (!user) {
    return res.status(404).json({ success: false, message: 'لم يتم العثور على حساب مرتبط بهذا الرقم أو البريد.' });
  }

  // Simulation: Send reset code / link
  db.createNotification({
    recipientPhone: user.phone,
    recipientEmail: user.email,
    type: 'reminder',
    channel: 'sms',
    content: `رمز استعادة كلمة المرور لعيادة د. حسام منصور هو: ${Math.floor(100000 + Math.random() * 900000)} (صالح لمدة 15 دقيقة)`,
  });

  res.json({
    success: true,
    message: 'تم إرسال رمز التحقق واستعادة كلمة المرور عبر رسالة نصية/واتساب إلى رقمك المسجل.',
  });
});

// ----------------------------------------------------
// 3. PATIENT PORTAL ROUTES
// ----------------------------------------------------

// Get Patient's Own Appointments
app.get('/api/patient/appointments', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    // Match by patientId or phone
    const appointments = db.getAppointments().filter(
      a => a.patientId === user.id || a.patientPhone === user.phone
    );

    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Patient Cancel Appointment
app.post('/api/patient/appointments/:id/cancel', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const apt = db.findAppointmentById(req.params.id);

    if (!apt) {
      return res.status(404).json({ success: false, message: 'الموعد غير موجود.' });
    }

    if (apt.patientId !== user.id && apt.patientPhone !== user.phone) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بإلغاء هذا الحجز.' });
    }

    if (apt.status === 'completed' || apt.status === 'checked_in') {
      return res.status(400).json({ success: false, message: 'لا يمكن إلغاء موعد تم حضوره أو إكماله بالفعل.' });
    }

    const { reason } = req.body;
    const updated = db.updateAppointmentStatus(apt.id, 'cancelled', reason || 'إلغاء بواسطة المريض');

    db.logAudit(
      user.id,
      user.name,
      user.role,
      'PATIENT_CANCEL_APPOINTMENT',
      'Appointment',
      apt.id,
      `قام المريض بإلغاء الحجز رقم ${apt.bookingNumber}. السبب: ${reason || 'غير محدد'}`
    );

    res.json({ success: true, message: 'تم إلغاء الموعد بنجاح.', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Patient Request Reschedule
app.post('/api/patient/appointments/:id/reschedule', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const apt = db.findAppointmentById(req.params.id);

    if (!apt) {
      return res.status(404).json({ success: false, message: 'الموعد غير موجود.' });
    }

    if (apt.patientId !== user.id && apt.patientPhone !== user.phone) {
      return res.status(403).json({ success: false, message: 'غير مصرح لك بتعديل هذا الحجز.' });
    }

    const { newDate, newTime, newBranchId } = req.body;
    if (!newDate || !newTime) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد التاريخ والوقت الجديدين.' });
    }

    const updated = db.rescheduleAppointment(apt.id, newDate, newTime, newBranchId);

    db.logAudit(
      user.id,
      user.name,
      user.role,
      'PATIENT_RESCHEDULE_APPOINTMENT',
      'Appointment',
      apt.id,
      `قام المريض بتعديل موعد الحجز رقم ${apt.bookingNumber} إلى ${newDate} الساعة ${newTime}`
    );

    res.json({ success: true, message: 'تم تعديل موعد الكشف بنجاح.', data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Patient Update Profile
app.put('/api/patient/profile', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const { name, email, age, gender } = req.body;

    const updated = db.updateUser(user.id, {
      name: name?.trim() || user.name,
      email: email?.trim(),
      age: age ? Number(age) : user.age,
      gender: gender || user.gender,
    });

    res.json({ success: true, message: 'تم تحديث البيانات الشخصية بنجاح.', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 4. ADMIN & CLINIC MANAGEMENT ROUTES
// ----------------------------------------------------

// Admin Dashboard Stats
app.get('/api/admin/dashboard-stats', authenticateToken, requireRoles('super_admin', 'receptionist', 'content_editor'), (req, res) => {
  try {
    const stats = db.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Appointment List (Search & Filter)
app.get('/api/admin/appointments', authenticateToken, requireRoles('super_admin', 'receptionist'), (req, res) => {
  try {
    const { branchId, serviceId, status, dateFrom, dateTo, search } = req.query as any;
    const appointments = db.getAppointments({ branchId, serviceId, status, dateFrom, dateTo, search });
    res.json({ success: true, data: appointments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Create Manual Appointment (Receptionist Walk-in / Phone Call)
app.post('/api/admin/appointments', authenticateToken, requireRoles('super_admin', 'receptionist'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const {
      patientName,
      patientPhone,
      patientEmail,
      patientAge,
      patientGender,
      serviceId,
      branchId,
      appointmentDate,
      appointmentTime,
      confirmationMethod,
      notes,
      clinicInternalNotes,
    } = req.body;

    if (!patientName || !patientPhone || !serviceId || !branchId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ success: false, message: 'يرجى إكمال البيانات الأساسية للحجز.' });
    }

    const appointment = db.createAppointment({
      patientName,
      patientPhone,
      patientEmail,
      patientAge,
      patientGender,
      serviceId,
      branchId,
      appointmentDate,
      appointmentTime,
      confirmationMethod,
      notes,
    });

    if (clinicInternalNotes) {
      db.updateAppointmentStatus(appointment.id, appointment.status, undefined, clinicInternalNotes);
    }

    db.logAudit(
      adminUser.id,
      adminUser.name,
      adminUser.role,
      'ADMIN_CREATE_APPOINTMENT',
      'Appointment',
      appointment.id,
      `تسجيل حجز يدوي بواسطة موظف الاستقبال: ${appointment.patientName} (${appointment.bookingNumber})`
    );

    res.status(201).json({ success: true, message: 'تم تسجيل الحجز بنجاح.', data: appointment });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Admin Update Status (Confirm, Check-in, Complete, Cancel, No-show)
app.patch('/api/admin/appointments/:id/status', authenticateToken, requireRoles('super_admin', 'receptionist'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const { status, reason, clinicInternalNotes } = req.body;

    const apt = db.findAppointmentById(req.params.id);
    if (!apt) {
      return res.status(404).json({ success: false, message: 'الموعد غير موجود.' });
    }

    const updated = db.updateAppointmentStatus(apt.id, status, reason, clinicInternalNotes);

    db.logAudit(
      adminUser.id,
      adminUser.name,
      adminUser.role,
      'UPDATE_APPOINTMENT_STATUS',
      'Appointment',
      apt.id,
      `تعديل حالة الحجز ${apt.bookingNumber} من ${apt.status} إلى ${status}. ملاحظات: ${clinicInternalNotes || 'لا توجد'}`
    );

    res.json({ success: true, message: 'تم تحديث حالة الحجز بنجاح.', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Reschedule Appointment
app.put('/api/admin/appointments/:id/reschedule', authenticateToken, requireRoles('super_admin', 'receptionist'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const { newDate, newTime, newBranchId } = req.body;

    const updated = db.rescheduleAppointment(req.params.id, newDate, newTime, newBranchId);

    db.logAudit(
      adminUser.id,
      adminUser.name,
      adminUser.role,
      'ADMIN_RESCHEDULE_APPOINTMENT',
      'Appointment',
      req.params.id,
      `تعديل موعد كشف بواسطة الإدارة إلى تاريخ ${newDate} الساعة ${newTime}`
    );

    res.json({ success: true, message: 'تم تعديل موعد الكشف بنجاح.', data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Admin Calendar View Data (Grouped by Date)
app.get('/api/admin/calendar', authenticateToken, requireRoles('super_admin', 'receptionist'), (req, res) => {
  try {
    const { branchId, month } = req.query as { branchId?: string; month?: string };
    const all = db.getAppointments({ branchId });

    // Filter by month (YYYY-MM) if provided
    const filtered = month ? all.filter(a => a.appointmentDate.startsWith(month)) : all;

    res.json({ success: true, data: filtered });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Patients Directory
app.get('/api/admin/patients', authenticateToken, requireRoles('super_admin', 'receptionist'), (req, res) => {
  try {
    const { search } = req.query as { search?: string };
    const appointments = db.getAppointments();
    const registeredUsers = db.getUsers().filter(u => u.role === 'patient');

    // Aggregate unique patient profiles from appointments + user records
    const patientMap = new Map<string, any>();

    registeredUsers.forEach(u => {
      patientMap.set(u.phone, {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        age: u.age,
        gender: u.gender,
        isRegistered: true,
        totalBookings: 0,
        lastVisitDate: null,
      });
    });

    appointments.forEach(apt => {
      const existing = patientMap.get(apt.patientPhone) || {
        id: apt.patientId || `guest_${apt.patientPhone}`,
        name: apt.patientName,
        phone: apt.patientPhone,
        email: apt.patientEmail,
        age: apt.patientAge,
        gender: apt.patientGender,
        isRegistered: !!apt.patientId,
        totalBookings: 0,
        lastVisitDate: null,
      };

      existing.totalBookings += 1;
      if (!existing.lastVisitDate || apt.appointmentDate > existing.lastVisitDate) {
        existing.lastVisitDate = apt.appointmentDate;
      }
      patientMap.set(apt.patientPhone, existing);
    });

    let list = Array.from(patientMap.values());

    if (search) {
      const s = search.toLowerCase().trim();
      list = list.filter(p => p.name.toLowerCase().includes(s) || p.phone.includes(s));
    }

    res.json({ success: true, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin Patient Detailed History
app.get('/api/admin/patients/:phone/history', authenticateToken, requireRoles('super_admin', 'receptionist'), (req, res) => {
  try {
    const phone = req.params.phone;
    const history = db.getAppointments().filter(a => a.patientPhone === phone);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 5. WORKING HOURS & SCHEDULE MANAGEMENT
// ----------------------------------------------------

app.get('/api/admin/working-hours', authenticateToken, requireRoles('super_admin', 'receptionist'), (req, res) => {
  const { branchId } = req.query as { branchId?: string };
  res.json({ success: true, data: db.getWorkingHours(branchId) });
});

app.put('/api/admin/working-hours/:id', authenticateToken, requireRoles('super_admin'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const updated = db.updateWorkingHour(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'قاعدة المواعيد غير موجودة.' });

    db.logAudit(
      adminUser.id,
      adminUser.name,
      adminUser.role,
      'UPDATE_WORKING_HOURS',
      'WorkingHourRule',
      req.params.id,
      `تحديث مواعيد وساعات العمل للفرع.`
    );

    res.json({ success: true, message: 'تم حفظ مواعيد العمل بنجاح.', data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/exceptions', authenticateToken, requireRoles('super_admin', 'receptionist'), (req, res) => {
  const { branchId } = req.query as { branchId?: string };
  res.json({ success: true, data: db.getExceptions(branchId) });
});

app.post('/api/admin/exceptions', authenticateToken, requireRoles('super_admin'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const created = db.createException(req.body);

    db.logAudit(
      adminUser.id,
      adminUser.name,
      adminUser.role,
      'CREATE_SCHEDULE_EXCEPTION',
      'ScheduleException',
      created.id,
      `إضافة إجازة أو موعد استثنائي بتاريخ ${created.date}. السبب: ${created.reason}`
    );

    res.status(201).json({ success: true, message: 'تمت إضافة الاستثناء بنجاح.', data: created });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/exceptions/:id', authenticateToken, requireRoles('super_admin'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    db.deleteException(req.params.id);

    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_SCHEDULE_EXCEPTION', 'ScheduleException', req.params.id, 'حذف موعد استثنائي/إجازة.');

    res.json({ success: true, message: 'تم حذف الاستثناء بنجاح.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 6. BRANCH & SERVICE MANAGEMENT
// ----------------------------------------------------

// Branches CRUD
app.get('/api/admin/branches', authenticateToken, requireRoles('super_admin', 'receptionist', 'content_editor'), (req, res) => {
  res.json({ success: true, data: db.getBranches(true) });
});

app.post('/api/admin/branches', authenticateToken, requireRoles('super_admin'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const branch = db.createBranch(req.body);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_BRANCH', 'Branch', branch.id, `إضافة فرع جديد: ${branch.name}`);
    res.status(201).json({ success: true, message: 'تمت إضافة الفرع بنجاح.', data: branch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/branches/:id', authenticateToken, requireRoles('super_admin'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const branch = db.updateBranch(req.params.id, req.body);
    if (!branch) return res.status(404).json({ success: false, message: 'الفرع غير موجود.' });
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_BRANCH', 'Branch', branch.id, `تحديث بيانات الفرع: ${branch.name}`);
    res.json({ success: true, message: 'تم تحديث بيانات الفرع بنجاح.', data: branch });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/branches/:id', authenticateToken, requireRoles('super_admin'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    db.deleteBranch(req.params.id);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_BRANCH', 'Branch', req.params.id, `حذف فرع من النظام.`);
    res.json({ success: true, message: 'تم حذف الفرع بنجاح.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Services CRUD
app.get('/api/admin/services', authenticateToken, requireRoles('super_admin', 'receptionist', 'content_editor'), (req, res) => {
  res.json({ success: true, data: db.getServices(true) });
});

app.post('/api/admin/services', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const service = db.createService(req.body);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_SERVICE', 'MedicalService', service.id, `إضافة خدمة وتخصص طبي: ${service.name}`);
    res.status(201).json({ success: true, message: 'تمت إضافة التخصص بنجاح.', data: service });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/services/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const service = db.updateService(req.params.id, req.body);
    if (!service) return res.status(404).json({ success: false, message: 'الخدمة غير موجودة.' });
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_SERVICE', 'MedicalService', service.id, `تعديل بيانات الخدمة الطبية: ${service.name}`);
    res.json({ success: true, message: 'تم تحديث التخصص بنجاح.', data: service });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/services/:id', authenticateToken, requireRoles('super_admin'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    db.deleteService(req.params.id);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_SERVICE', 'MedicalService', req.params.id, `حذف تخصص طبي.`);
    res.json({ success: true, message: 'تم حذف التخصص بنجاح.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 7. CONTENT MANAGEMENT (CMS)
// ----------------------------------------------------

// Doctor Profile
app.get('/api/admin/content/doctor-profile', authenticateToken, requireRoles('super_admin', 'content_editor'), (req, res) => {
  res.json({ success: true, data: db.getDoctorProfile() });
});

app.put('/api/admin/content/doctor-profile', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const profile = db.updateDoctorProfile(req.body, adminUser.id);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_DOCTOR_PROFILE', 'DoctorProfile', 'root', 'تحديث السيرة الذاتية ومعلومات الطبيب واعتمادها.');
    res.json({ success: true, message: 'تم تحديث واعتماد الملف التعريفي للطبيب بنجاح.', data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reviews Management
app.get('/api/admin/content/reviews', authenticateToken, requireRoles('super_admin', 'content_editor'), (req, res) => {
  res.json({ success: true, data: db.getReviews(true) });
});

app.patch('/api/admin/content/reviews/:id/approval', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const { isApproved, isFeatured } = req.body;
    const review = db.updateReviewApproval(req.params.id, isApproved, isFeatured);
    if (!review) return res.status(404).json({ success: false, message: 'التقييم غير موجود.' });

    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'APPROVE_REVIEW', 'Review', review.id, `تغيير حالة اعتماد التقييم إلى: ${isApproved ? 'معتمد ومنشور' : 'محجوب'}`);
    res.json({ success: true, message: 'تم تحديث حالة اعتماد التقييم بنجاح.', data: review });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/content/reviews/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    db.deleteReview(req.params.id);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_REVIEW', 'Review', req.params.id, `حذف تقييم مريض.`);
    res.json({ success: true, message: 'تم حذف التقييم بنجاح.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// FAQs Management
app.get('/api/admin/content/faqs', authenticateToken, requireRoles('super_admin', 'content_editor'), (req, res) => {
  res.json({ success: true, data: db.getFaqs(true) });
});

app.post('/api/admin/content/faqs', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const faq = db.createFaq(req.body);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_FAQ', 'FAQItem', faq.id, `إضافة سؤال شائع جديد.`);
    res.status(201).json({ success: true, message: 'تمت إضافة السؤال بنجاح.', data: faq });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/content/faqs/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const faq = db.updateFaq(req.params.id, req.body);
    if (!faq) return res.status(404).json({ success: false, message: 'السؤال غير موجود.' });
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_FAQ', 'FAQItem', faq.id, `تحديث السؤال الشائع.`);
    res.json({ success: true, message: 'تم تحديث السؤال بنجاح.', data: faq });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/content/faqs/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    db.deleteFaq(req.params.id);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_FAQ', 'FAQItem', req.params.id, `حذف سؤال شائع.`);
    res.json({ success: true, message: 'تم حذف السؤال بنجاح.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Announcements
app.get('/api/admin/content/announcements', authenticateToken, requireRoles('super_admin', 'content_editor'), (req, res) => {
  res.json({ success: true, data: db.getAnnouncements(false) });
});

app.put('/api/admin/content/announcements/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const anc = db.updateAnnouncement(req.params.id, req.body);
    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_ANNOUNCEMENT', 'Announcement', req.params.id, `تحديث شريط الإعلانات والتنبيهات.`);
    res.json({ success: true, message: 'تم حفظ الإعلان بنجاح.', data: anc });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ----------------------------------------------------
// 8. SYSTEM, AUDIT LOGS & NOTIFICATIONS
// ----------------------------------------------------

app.get('/api/admin/audit-logs', authenticateToken, requireRoles('super_admin'), (req, res) => {
  res.json({ success: true, data: db.getAuditLogs(100) });
});

app.get('/api/admin/notifications', authenticateToken, requireRoles('super_admin', 'receptionist'), (req, res) => {
  res.json({ success: true, data: db.getNotifications(100) });
});

app.get('/api/admin/users', authenticateToken, requireRoles('super_admin'), (req, res) => {
  res.json({ success: true, data: db.getUsers() });
});

// Create Staff User
app.post('/api/admin/users', authenticateToken, requireRoles('super_admin'), (req: AuthRequest, res) => {
  try {
    const adminUser = req.user!;
    const { name, phone, email, password, role } = req.body;

    if (!name || !phone || !password || !role) {
      return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة للموظف.' });
    }

    const newUser = db.createUser({
      name,
      phone,
      email,
      password,
      role,
    });

    db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_STAFF_USER', 'User', newUser.id, `إضافة مستخدم طاقم جديد: ${newUser.name} بصلاحية ${newUser.role}`);
    res.status(201).json({ success: true, message: 'تم إنشاء حساب الموظف بنجاح.', data: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 404 JSON response for any unmatched API route to prevent HTML fallback
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `المسار البرمجي غير موجود (${req.method} ${req.originalUrl})`,
  });
});

// ----------------------------------------------------
// 9. VITE & STATIC SERVING INTEGRATION
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clinic Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
