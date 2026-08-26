import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { User, UserRole } from './src/types/index.ts';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Request Interface with User
export interface AuthRequest extends Request {
  user?: User;
}

// Authentication Middleware
// Expects `Authorization: Bearer <firebase-id-token>` and resolves the user
// from Firebase Authentication + the Firestore users/{uid} profile doc.
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'يرجى تسجيل الدخول أولاً للوصول إلى هذه الخدمة.' });
  }

  try {
    const { firebaseAuth } = await import('./server/firebase.ts');
    const decoded = await firebaseAuth().verifyIdToken(token);
    let user = await db.findUserById(decoded.uid);
    if (!user) {
      // Self-heal: a valid Firebase session exists but the Firestore profile
      // doc is missing (e.g. a previous Google/external login whose sync failed,
      // or a registration whose profile write didn't persist). Provision a
      // patient profile from the verified token so the session can be used.
      const email = decoded.email || undefined;
      const name =
        (decoded.name as string) ||
        (email ? email.split('@')[0] : 'مستخدم جديد');
      user = await db.createUserWithId(decoded.uid, {
        name,
        phone: '',
        email,
        password: '',
        role: 'patient',
      });
    }
    const { passwordHash: _omit, ...safeUser } = user as any;
    req.user = safeUser as User;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.' });
  }
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

// Wrap async route handlers to forward errors to next()
const wrap = (fn: (req: AuthRequest, res: Response) => Promise<any>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

// ----------------------------------------------------
// 1. PUBLIC API ROUTES
// ----------------------------------------------------

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Clinic Public Metadata & Content
app.get('/api/public/clinic-info', wrap(async (req, res) => {
  const [branches, services, doctorProfile, reviews, faqs, announcements] = await Promise.all([
    db.getBranches(false),
    db.getServices(false),
    db.getDoctorProfile(),
    db.getReviews(false),
    db.getFaqs(false),
    db.getAnnouncements(true),
  ]);

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
}));

// Calculate Available Slots for a given branch, service, and date
app.get('/api/public/available-slots', wrap(async (req, res) => {
  const { branchId, serviceId, date } = req.query as { branchId: string; serviceId: string; date: string };

  if (!branchId || !date) {
    return res.status(400).json({ success: false, message: 'يرجى تحديد الفرع وتاريخ الحجز.' });
  }

  const slots = await db.calculateAvailableSlots(branchId, serviceId || '', date);
  res.json({ success: true, data: slots });
}));

// List of YYYY-MM-DD dates (next N days) that have at least one bookable slot
// for the given branch+service. Reuses the same source of truth as /available-slots.
app.get('/api/public/available-dates', wrap(async (req, res) => {
  const { branchId, serviceId, daysAhead } = req.query as { branchId?: string; serviceId?: string; daysAhead?: string };

  if (!branchId) {
    return res.status(400).json({ success: false, message: 'يرجى تحديد الفرع.' });
  }

  const days = Math.min(60, Math.max(1, parseInt(daysAhead || '14', 10) || 14));
  const dates = await db.getAvailableDates(branchId, serviceId || '', days);
  res.json({ success: true, data: dates });
}));

// Book an Appointment (Public or Authenticated Patient)
app.post('/api/public/appointments/book', wrap(async (req: AuthRequest, res) => {
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
      const { firebaseAuth } = await import('./server/firebase.ts');
      const decoded = await firebaseAuth().verifyIdToken(token);
      if (decoded?.uid) patientId = decoded.uid;
    } catch (e) {
      // Continue as unlinked patient if token invalid
    }
  }

  // If no logged in user, try to find existing patient by phone
  if (!patientId) {
    const existingUser = await db.findUserByPhoneOrEmail(cleanPhone);
    if (existingUser) {
      patientId = existingUser.id;
    }
  }

  const appointment = await db.createAppointment({
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

  await db.logAudit(
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
}));

// Appointment Lookup by Booking Number & Phone
app.get('/api/public/appointments/lookup', wrap(async (req, res) => {
  const { bookingNumber, phone } = req.query as { bookingNumber: string; phone: string };

  if (!bookingNumber || !phone) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال رقم الحجز ورقم الهاتف المسجل.' });
  }

  const appointment = await db.findAppointmentByBookingNumber(bookingNumber);
  if (!appointment || appointment.patientPhone.replace(/\s+/g, '') !== phone.replace(/\s+/g, '')) {
    return res.status(404).json({ success: false, message: 'لم يتم العثور على حجز يطابق هذه البيانات.' });
  }

  res.json({ success: true, data: appointment });
}));

// Submit a Patient Review (Requires Admin Approval)
app.post('/api/public/reviews/submit', wrap(async (req, res) => {
  const { patientName, rating, reviewText, treatmentType } = req.body;

  if (!patientName || !rating || !reviewText) {
    return res.status(400).json({ success: false, message: 'يرجى كتابة الاسم والتقييم ورأيكم.' });
  }

  const review = await db.createReview({
    patientName: patientName.trim(),
    rating: Math.min(5, Math.max(1, Number(rating))),
    reviewText: reviewText.trim(),
    treatmentType: treatmentType?.trim() || 'كشف واستشارة عظام',
    visitDate: new Date().toISOString().split('T')[0],
    isApproved: false, // Strict Admin approval requirement
    isFeatured: false,
    order: 10,
  });

  await db.logAudit(
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
}));

// ----------------------------------------------------
// 2. AUTHENTICATION ROUTES (Firebase Auth)
// ----------------------------------------------------

// Register Patient Account — creates Firebase Auth user + Firestore profile doc
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, phone, email, password, gender, age } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ success: false, message: 'يرجى كتابة الاسم ورقم الهاتف وكلمة المرور.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام.' });
  }

  const cleanPhone = phone.trim().replace(/\s+/g, '');
  const existing = await db.findUserByPhoneOrEmail(cleanPhone);
  if (existing) {
    return res.status(409).json({ success: false, message: 'يوجد حساب مسجل بالفعل بهذا الرقم أو البريد.' });
  }

  // Use phone-as-identifier for Firebase Auth. For login, we still accept email OR phone
  // and resolve to a Firebase Auth account via the local users/{uid} doc.
  // The Firebase Auth login (email/password) is performed on the client.
  // For registration, we need an email. Default to phone@hossam-clinic.local if no email.
  const authEmail = (email && email.trim()) || `${cleanPhone}@hossam-clinic.local`;

  // Check if a Firebase Auth account already uses this email
  const { firebaseAuth } = await import('./server/firebase.ts');
  try {
    await firebaseAuth().getUserByEmail(authEmail);
    return res.status(409).json({ success: false, message: 'يوجد حساب مرتبط بهذا البريد الإلكتروني بالفعل.' });
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') {
      throw e;
    }
  }

  let userRecord;
  try {
    userRecord = await firebaseAuth().createUser({
      email: authEmail,
      password,
      displayName: name,
    });
  } catch (e: any) {
    const code = e?.code || '';
    let friendly = 'فشل إنشاء الحساب، يرجى المحاولة مرة أخرى.';
    if (code === 'auth/email-already-exists') {
      friendly = 'البريد الإلكتروني مستخدم بالفعل.';
    } else if (code === 'auth/invalid-email') {
      friendly = 'البريد الإلكتروني غير صالح.';
    } else if (code === 'auth/invalid-password') {
      friendly = 'كلمة المرور يجب أن لا تقل عن 6 أحرف.';
    }
    return res.status(409).json({ success: false, message: friendly });
  }
  await firebaseAuth().setCustomUserClaims(userRecord.uid, { role: 'patient' });

  const user = await db.createUserWithId(userRecord.uid, {
    name: name.trim(),
    phone: cleanPhone,
    email: email?.trim(),
    password,
    role: 'patient',
    gender,
    age: age ? Number(age) : undefined,
  });

  await db.logAudit(userRecord.uid, user.name, user.role, 'USER_REGISTER', 'User', userRecord.uid, 'تسجيل حساب مريض جديد بالمنصة.');

  res.status(201).json({
    success: true,
    message: 'تم إنشاء الحساب بنجاح.',
    data: { user, token: 'client-side-firebase-auth' },
  });
}));

// Login is now handled client-side via Firebase Auth signInWithEmailAndPassword.
// This endpoint is kept for lookup-by-identifier (used by the client to figure out
// which Firebase Auth email to use when the user types a phone number) and
// for verifying the user has a Firestore profile.
app.post('/api/auth/login', wrap(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ success: false, message: 'يرجى إدخال رقم الهاتف / البريد.' });
  }
  const user = await db.findUserByPhoneOrEmail(identifier);
  if (!user) {
    return res.status(404).json({ success: false, message: 'بيانات الدخول غير صحيحة، يرجى التأكد من الرقم أو كلمة المرور.' });
  }
  res.json({
    success: true,
    message: 'يرجى إكمال تسجيل الدخول عبر Firebase Auth في الواجهة.',
    data: { email: user.email || `${user.phone}@hossam-clinic.local`, user },
  });
}));

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res) => {
  res.json({ success: true, data: req.user });
});

// Provision / fetch the Firestore profile for the signed-in Firebase user.
// Used by Google Sign-In / One Tap: a new Google user gets a NORMAL patient
// record (role 'patient'). Existing accounts are returned unchanged — their
// role/permissions are never overwritten, and Google users are NEVER admins.
app.post('/api/auth/sync', wrap(async (req: AuthRequest, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'غير مصرح.' });
  }
  let decoded: any;
  try {
    const { firebaseAuth } = await import('./server/firebase.ts');
    decoded = await firebaseAuth().verifyIdToken(token);
  } catch {
    return res.status(403).json({ success: false, message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.' });
  }

  const uid = decoded.uid;
  const existing = await db.findUserById(uid);
  if (existing) {
    return res.json({ success: true, data: existing });
  }

  const email = decoded.email || undefined;
  const name = (decoded.name as string) || (email ? email.split('@')[0] : 'مستخدم Google');
  const newUser = await db.createUserWithId(uid, {
    name,
    phone: '',
    email,
    password: '',
    role: 'patient',
  });
  await db.logAudit(newUser.id, newUser.name, newUser.role, 'USER_GOOGLE_REGISTER', 'User', newUser.id, 'تسجيل دخول عبر Google (مريض جديد).');
  res.status(201).json({ success: true, data: newUser });
}));

// Password Reset — Firebase Auth sends the email/sms
app.post('/api/auth/forgot-password', wrap(async (req, res) => {
  const { identifier } = req.body;
  const user = await db.findUserByPhoneOrEmail(identifier);
  if (!user) {
    return res.status(404).json({ success: false, message: 'لم يتم العثور على حساب مرتبط بهذا الرقم أو البريد.' });
  }
  const email = user.email || `${user.phone}@hossam-clinic.local`;
  const { firebaseAuth } = await import('./server/firebase.ts');
  try {
    const link = await firebaseAuth().generatePasswordResetLink(email);
    await db.createNotification({
      recipientPhone: user.phone,
      recipientEmail: user.email,
      type: 'reminder',
      channel: 'sms',
      content: `تم إنشاء رابط استعادة كلمة المرور لحسابك في عيادة د. حسام منصور. الرابط: ${link}`,
    });
  } catch (e) {
    // Fall through with a generic message
  }
  res.json({
    success: true,
    message: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني المسجل.',
  });
}));

// ----------------------------------------------------
// 3. PATIENT PORTAL ROUTES
// ----------------------------------------------------

// Get Patient's Own Appointments
app.get('/api/patient/appointments', authenticateToken, wrap(async (req: AuthRequest, res) => {
  const user = req.user!;
  const all = await db.getAppointments();
  const appointments = all.filter(
    a => a.patientId === user.id || a.patientPhone === user.phone
  );
  res.json({ success: true, data: appointments });
}));

// Patient Cancel Appointment
app.post('/api/patient/appointments/:id/cancel', authenticateToken, wrap(async (req: AuthRequest, res) => {
  const user = req.user!;
  const apt = await db.findAppointmentById(req.params.id);

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
  const updated = await db.updateAppointmentStatus(apt.id, 'cancelled', reason || 'إلغاء بواسطة المريض');

  await db.logAudit(
    user.id,
    user.name,
    user.role,
    'PATIENT_CANCEL_APPOINTMENT',
    'Appointment',
    apt.id,
    `قام المريض بإلغاء الحجز رقم ${apt.bookingNumber}. السبب: ${reason || 'غير محدد'}`
  );

  res.json({ success: true, message: 'تم إلغاء الموعد بنجاح.', data: updated });
}));

// Patient Request Reschedule
app.post('/api/patient/appointments/:id/reschedule', authenticateToken, wrap(async (req: AuthRequest, res) => {
  const user = req.user!;
  const apt = await db.findAppointmentById(req.params.id);

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

  const updated = await db.rescheduleAppointment(apt.id, newDate, newTime, newBranchId);

  await db.logAudit(
    user.id,
    user.name,
    user.role,
    'PATIENT_RESCHEDULE_APPOINTMENT',
    'Appointment',
    apt.id,
    `قام المريض بتعديل موعد الحجز رقم ${apt.bookingNumber} إلى ${newDate} الساعة ${newTime}`
  );

  res.json({ success: true, message: 'تم تعديل موعد الكشف بنجاح.', data: updated });
}));

// Patient Update Profile
app.put('/api/patient/profile', authenticateToken, wrap(async (req: AuthRequest, res) => {
  const user = req.user!;
  const { name, email, age, gender } = req.body;

  const updated = await db.updateUser(user.id, {
    name: name?.trim() || user.name,
    email: email?.trim(),
    age: age ? Number(age) : user.age,
    gender: gender || user.gender,
  });

  res.json({ success: true, message: 'تم تحديث البيانات الشخصية بنجاح.', data: updated });
}));

// ----------------------------------------------------
// 4. ADMIN & CLINIC MANAGEMENT ROUTES
// ----------------------------------------------------

app.get('/api/admin/dashboard-stats', authenticateToken, requireRoles('super_admin', 'receptionist', 'content_editor'), wrap(async (req, res) => {
  const stats = await db.getDashboardStats();
  res.json({ success: true, data: stats });
}));

app.get('/api/admin/appointments', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  const { branchId, serviceId, status, dateFrom, dateTo, search } = req.query as any;
  const appointments = await db.getAppointments({ branchId, serviceId, status, dateFrom, dateTo, search });
  res.json({ success: true, data: appointments });
}));

app.post('/api/admin/appointments', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req: AuthRequest, res) => {
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

  const appointment = await db.createAppointment({
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
    await db.updateAppointmentStatus(appointment.id, appointment.status, undefined, clinicInternalNotes);
  }

  await db.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'ADMIN_CREATE_APPOINTMENT',
    'Appointment',
    appointment.id,
    `تسجيل حجز يدوي بواسطة موظف الاستقبال: ${appointment.patientName} (${appointment.bookingNumber})`
  );

  res.status(201).json({ success: true, message: 'تم تسجيل الحجز بنجاح.', data: appointment });
}));

app.patch('/api/admin/appointments/:id/status', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const { status, reason, clinicInternalNotes } = req.body;

  const allowedStatuses = ['new', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'حالة الحجز غير صالحة.' });
  }

  const apt = await db.findAppointmentById(req.params.id);
  if (!apt) {
    return res.status(404).json({ success: false, message: 'الموعد غير موجود.' });
  }

  const updated = await db.updateAppointmentStatus(apt.id, status, reason, clinicInternalNotes);

  await db.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'UPDATE_APPOINTMENT_STATUS',
    'Appointment',
    apt.id,
    `تعديل حالة الحجز ${apt.bookingNumber} من ${apt.status} إلى ${status}. ملاحظات: ${clinicInternalNotes || 'لا توجد'}`
  );

  res.json({ success: true, message: 'تم تحديث حالة الحجز بنجاح.', data: updated });
}));

app.delete('/api/admin/appointments/:id', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const apt = await db.findAppointmentById(req.params.id);
  if (!apt) {
    return res.status(404).json({ success: false, message: 'الموعد غير موجود.' });
  }

  const deleted = await db.deleteAppointment(req.params.id);

  await db.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'DELETE_APPOINTMENT',
    'Appointment',
    apt.id,
    `حذف الحجز رقم ${apt.bookingNumber} للمريض ${apt.patientName} من النظام بواسطة الإدارة.`
  );

  res.json({ success: true, message: 'تم حذف الموعد بشكل دائم من النظام.', data: deleted });
}));

app.put('/api/admin/appointments/:id/reschedule', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const { newDate, newTime, newBranchId } = req.body;

  const updated = await db.rescheduleAppointment(req.params.id, newDate, newTime, newBranchId);

  await db.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'ADMIN_RESCHEDULE_APPOINTMENT',
    'Appointment',
    req.params.id,
    `تعديل موعد كشف بواسطة الإدارة إلى تاريخ ${newDate} الساعة ${newTime}`
  );

  res.json({ success: true, message: 'تم تعديل موعد الكشف بنجاح.', data: updated });
}));

app.get('/api/admin/calendar', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  const { branchId, month } = req.query as { branchId?: string; month?: string };
  const all = await db.getAppointments({ branchId });
  const filtered = month ? all.filter(a => a.appointmentDate.startsWith(month)) : all;
  res.json({ success: true, data: filtered });
}));

app.get('/api/admin/patients', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  const { search } = req.query as { search?: string };
  const [appointments, registeredUsers] = await Promise.all([
    db.getAppointments(),
    db.getUsers(),
  ]);
  const patients = registeredUsers.filter(u => u.role === 'patient');

  const patientMap = new Map<string, any>();

  patients.forEach(u => {
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
}));

app.get('/api/admin/patients/:phone/history', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  const phone = req.params.phone;
  const all = await db.getAppointments();
  const history = all.filter(a => a.patientPhone === phone);
  res.json({ success: true, data: history });
}));

// Deactivate patient (soft delete) — super_admin only
app.delete('/api/admin/patients/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const deactivated = await db.deactivatePatient(req.params.id);
  if (!deactivated) {
    return res.status(404).json({ success: false, message: 'المريض غير موجود.' });
  }

  await db.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'DEACTIVATE_PATIENT',
    'User',
    req.params.id,
    `إيقاف تنشيط حساب المريض: ${deactivated.name}. لن يتمكن من تسجيل الدخول ولن يظهر في دليل المرضى.`
  );

  res.json({ success: true, message: 'تم إيقاف تنشيط الحساب بنجاح.', data: deactivated });
}));

// Hard-delete a patient (permanently removes the users/{uid} doc) — super_admin only.
// Distinct from the deactivate route so the UI can offer both "suspend" and "delete".
app.delete('/api/admin/patients/:id/permanent', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const deleted = await db.deletePatient(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'المريض غير موجود.' });
  }
  await db.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'DELETE_PATIENT',
    'User',
    req.params.id,
    `حذف حساب المريض نهائياً من النظام: ${deleted.name}.`
  );
  res.json({ success: true, message: 'تم حذف حساب المريض نهائياً من النظام.', data: deleted });
}));

// ----------------------------------------------------
// 5. WORKING HOURS & SCHEDULE MANAGEMENT
// ----------------------------------------------------

app.get('/api/admin/working-hours', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  const { branchId } = req.query as { branchId?: string };
  res.json({ success: true, data: await db.getWorkingHours(branchId) });
}));

app.put('/api/admin/working-hours/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const updated = await db.updateWorkingHour(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'قاعدة المواعيد غير موجودة.' });

  await db.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'UPDATE_WORKING_HOURS',
    'WorkingHourRule',
    req.params.id,
    `تحديث مواعيد وساعات العمل للفرع.`
  );

  res.json({ success: true, message: 'تم حفظ مواعيد العمل بنجاح.', data: updated });
}));

app.get('/api/admin/exceptions', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  const { branchId } = req.query as { branchId?: string };
  res.json({ success: true, data: await db.getExceptions(branchId) });
}));

app.post('/api/admin/exceptions', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const created = await db.createException(req.body);

  await db.logAudit(
    adminUser.id,
    adminUser.name,
    adminUser.role,
    'CREATE_SCHEDULE_EXCEPTION',
    'ScheduleException',
    created.id,
    `إضافة إجازة أو موعد استثنائي بتاريخ ${created.date}. السبب: ${created.reason}`
  );

  res.status(201).json({ success: true, message: 'تمت إضافة الاستثناء بنجاح.', data: created });
}));

app.delete('/api/admin/exceptions/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  await db.deleteException(req.params.id);

  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_SCHEDULE_EXCEPTION', 'ScheduleException', req.params.id, 'حذف موعد استثنائي/إجازة.');

  res.json({ success: true, message: 'تم حذف الاستثناء بنجاح.' });
}));

app.put('/api/admin/exceptions/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const updated = await db.updateException(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'الاستثناء غير موجود.' });
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_SCHEDULE_EXCEPTION', 'ScheduleException', req.params.id, `تحديث استثناء المواعيد: ${updated.reason}`);
  res.json({ success: true, message: 'تم تحديث الاستثناء بنجاح.', data: updated });
}));

// ----------------------------------------------------
// 6. BRANCH & SERVICE MANAGEMENT
// ----------------------------------------------------

app.get('/api/admin/branches', authenticateToken, requireRoles('super_admin', 'receptionist', 'content_editor'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getBranches(true) });
}));

app.post('/api/admin/branches', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const branch = await db.createBranch(req.body);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_BRANCH', 'Branch', branch.id, `إضافة فرع جديد: ${branch.name}`);
  res.status(201).json({ success: true, message: 'تمت إضافة الفرع بنجاح.', data: branch });
}));

app.put('/api/admin/branches/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const branch = await db.updateBranch(req.params.id, req.body);
  if (!branch) return res.status(404).json({ success: false, message: 'الفرع غير موجود.' });
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_BRANCH', 'Branch', branch.id, `تحديث بيانات الفرع: ${branch.name}`);
  res.json({ success: true, message: 'تم تحديث بيانات الفرع بنجاح.', data: branch });
}));

app.delete('/api/admin/branches/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  await db.deleteBranch(req.params.id);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_BRANCH', 'Branch', req.params.id, `حذف فرع من النظام.`);
  res.json({ success: true, message: 'تم حذف الفرع بنجاح.' });
}));

app.get('/api/admin/services', authenticateToken, requireRoles('super_admin', 'receptionist', 'content_editor'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getServices(true) });
}));

app.post('/api/admin/services', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const service = await db.createService(req.body);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_SERVICE', 'MedicalService', service.id, `إضافة خدمة وتخصص طبي: ${service.name}`);
  res.status(201).json({ success: true, message: 'تمت إضافة التخصص بنجاح.', data: service });
}));

app.put('/api/admin/services/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const service = await db.updateService(req.params.id, req.body);
  if (!service) return res.status(404).json({ success: false, message: 'الخدمة غير موجودة.' });
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_SERVICE', 'MedicalService', service.id, `تعديل بيانات الخدمة الطبية: ${service.name}`);
  res.json({ success: true, message: 'تم تحديث التخصص بنجاح.', data: service });
}));

app.delete('/api/admin/services/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  await db.deleteService(req.params.id);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_SERVICE', 'MedicalService', req.params.id, `حذف تخصص طبي.`);
  res.json({ success: true, message: 'تم حذف التخصص بنجاح.' });
}));

// ----------------------------------------------------
// 7. CONTENT MANAGEMENT (CMS)
// ----------------------------------------------------

app.get('/api/admin/content/doctor-profile', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getDoctorProfile() });
}));

app.put('/api/admin/content/doctor-profile', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const profile = await db.updateDoctorProfile(req.body, adminUser.id);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_DOCTOR_PROFILE', 'DoctorProfile', 'root', 'تحديث السيرة الذاتية ومعلومات الطبيب واعتمادها.');
  res.json({ success: true, message: 'تم تحديث واعتماد الملف التعريفي للطبيب بنجاح.', data: profile });
}));

app.get('/api/admin/content/reviews', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getReviews(true) });
}));

app.patch('/api/admin/content/reviews/:id/approval', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const { isApproved, isFeatured } = req.body;
  const review = await db.updateReviewApproval(req.params.id, isApproved, isFeatured);
  if (!review) return res.status(404).json({ success: false, message: 'التقييم غير موجود.' });

  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'APPROVE_REVIEW', 'Review', review.id, `تغيير حالة اعتماد التقييم إلى: ${isApproved ? 'معتمد ومنشور' : 'محجوب'}`);
  res.json({ success: true, message: 'تم تحديث حالة اعتماد التقييم بنجاح.', data: review });
}));

app.delete('/api/admin/content/reviews/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  await db.deleteReview(req.params.id);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_REVIEW', 'Review', req.params.id, `حذف تقييم مريض.`);
  res.json({ success: true, message: 'تم حذف التقييم بنجاح.' });
}));

app.put('/api/admin/content/reviews/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const updated = await db.updateReview(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'التقييم غير موجود.' });
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_REVIEW', 'Review', updated.id, `تحديث بيانات تقييم مريض.`);
  res.json({ success: true, message: 'تم تحديث التقييم بنجاح.', data: updated });
}));

app.get('/api/admin/content/announcements', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getAnnouncements(true) });
}));

app.post('/api/admin/content/announcements', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const { message, type, isActive } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ success: false, message: 'يرجى كتابة نص الإعلان.' });
  }
  const anc = await db.createAnnouncement({
    message: String(message).trim(),
    type: (type === 'alert' || type === 'success' || type === 'info') ? type : 'info',
    isActive: isActive !== false,
  });
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_ANNOUNCEMENT', 'Announcement', anc.id, `إضافة إعلان جديد لشريط الإعلانات.`);
  res.status(201).json({ success: true, message: 'تمت إضافة الإعلان بنجاح.', data: anc });
}));

app.delete('/api/admin/content/announcements/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  await db.deleteAnnouncement(req.params.id);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_ANNOUNCEMENT', 'Announcement', req.params.id, `حذف شريط إعلان.`);
  res.json({ success: true, message: 'تم حذف الإعلان بنجاح.' });
}));

app.get('/api/admin/content/faqs', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getFaqs(true) });
}));

app.post('/api/admin/content/faqs', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const faq = await db.createFaq(req.body);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_FAQ', 'FAQItem', faq.id, `إضافة سؤال شائع جديد.`);
  res.status(201).json({ success: true, message: 'تمت إضافة السؤال بنجاح.', data: faq });
}));

app.put('/api/admin/content/faqs/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const faq = await db.updateFaq(req.params.id, req.body);
  if (!faq) return res.status(404).json({ success: false, message: 'السؤال غير موجود.' });
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_FAQ', 'FAQItem', faq.id, `تحديث السؤال الشائع.`);
  res.json({ success: true, message: 'تم تحديث السؤال بنجاح.', data: faq });
}));

app.delete('/api/admin/content/faqs/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  await db.deleteFaq(req.params.id);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_FAQ', 'FAQItem', req.params.id, `حذف سؤال شائع.`);
  res.json({ success: true, message: 'تم حذف السؤال بنجاح.' });
}));

app.get('/api/admin/content/announcements', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getAnnouncements(false) });
}));

app.put('/api/admin/content/announcements/:id', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const anc = await db.updateAnnouncement(req.params.id, req.body);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_ANNOUNCEMENT', 'Announcement', req.params.id, `تحديث شريط الإعلانات والتنبيهات.`);
  res.json({ success: true, message: 'تم حفظ الإعلان بنجاح.', data: anc });
}));

// ----------------------------------------------------
// 8. NOTIFICATIONS
// ----------------------------------------------------

app.get('/api/admin/notifications', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getNotifications(100) });
}));

app.get('/api/admin/users', authenticateToken, requireRoles('super_admin'), wrap(async (req, res) => {
  res.json({ success: true, data: await db.getUsers() });
}));

// ----------------------------------------------------
// 9. SEARCH ENDPOINTS (read-only, role-based access)
// ----------------------------------------------------

// Search appointments — super_admin, receptionist
app.get('/api/search/appointments', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  const { q, status, branchId, serviceId, dateFrom, dateTo } = req.query as any;
  const appointments = await db.getAppointments({ search: String(q), status: String(status || ''), branchId: String(branchId || ''), serviceId: String(serviceId || ''), dateFrom: String(dateFrom || ''), dateTo: String(dateTo || '') });
  res.json({ success: true, data: appointments });
}));

// Search patients — super_admin, receptionist
app.get('/api/search/patients', authenticateToken, requireRoles('super_admin', 'receptionist'), wrap(async (req, res) => {
  const { q } = req.query as { q?: string };
  const [appointments, registeredUsers] = await Promise.all([
    db.getAppointments(),
    db.getUsers(),
  ]);
  const patients = registeredUsers.filter(u => u.role === 'patient');

  const patientMap = new Map<string, any>();

  patients.forEach(u => {
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
  if (q) {
    const s = String(q).toLowerCase().trim();
    list = list.filter(p => p.name.toLowerCase().includes(s) || p.phone.includes(s));
  }

  res.json({ success: true, data: list });
}));

// Search branches — super_admin, receptionist, content_editor
app.get('/api/search/branches', authenticateToken, requireRoles('super_admin', 'receptionist', 'content_editor'), wrap(async (req, res) => {
  const { q } = req.query as { q?: string };
  const branches = await db.getBranches(true);
  let list = branches;
  if (q) {
    const s = String(q).toLowerCase().trim();
    list = branches.filter(b => b.name.toLowerCase().includes(s) || b.city.toLowerCase().includes(s));
  }
  res.json({ success: true, data: list });
}));

// Search services — super_admin, receptionist, content_editor
app.get('/api/search/services', authenticateToken, requireRoles('super_admin', 'receptionist', 'content_editor'), wrap(async (req, res) => {
  const { q } = req.query as { q?: string };
  const services = await db.getServices(true);
  let list = services;
  if (q) {
    const needle = String(q).toLowerCase().trim();
    list = services.filter(svc => svc.name.toLowerCase().includes(needle) || (svc.description && svc.description.toLowerCase().includes(needle)));
  }
  res.json({ success: true, data: list });
}));

app.post('/api/admin/users', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const { name, phone, email, password, role } = req.body;

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ success: false, message: 'يرجى ملء جميع الحقول المطلوبة للموظف.' });
  }
  if (!['super_admin', 'receptionist', 'content_editor'].includes(role)) {
    return res.status(400).json({ success: false, message: 'الصلاحية غير صالحة.' });
  }

  const cleanPhone = phone.trim().replace(/\s+/g, '');
  const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : '';
  const authEmail = cleanEmail || `${cleanPhone}@hossam-clinic.local`;

  // Pre-check duplicate against the local users mirror — by phone AND by email.
  // findUserByPhoneOrEmail checks both, so calling it twice (once per identifier)
  // catches the case where a phone is unique but the email is already in use, and
  // vice-versa.
  const existingByPhone = await db.findUserByPhoneOrEmail(cleanPhone);
  if (existingByPhone) {
    return res.status(409).json({ success: false, message: 'يوجد حساب مسجل بالفعل بهذا الرقم.' });
  }
  if (cleanEmail) {
    const existingByEmail = await db.findUserByPhoneOrEmail(cleanEmail);
    if (existingByEmail) {
      return res.status(409).json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل من قبل موظف آخر.' });
    }
  }

  const { firebaseAuth } = await import('./server/firebase.ts');

  // Pre-check duplicate Firebase Auth email
  try {
    await firebaseAuth().getUserByEmail(authEmail);
    return res.status(409).json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل في نظام المصادقة.' });
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') {
      throw e;
    }
  }

  let uid: string;
  try {
    const userRecord = await firebaseAuth().createUser({
      email: authEmail,
      password,
      displayName: name,
    });
    await firebaseAuth().setCustomUserClaims(userRecord.uid, { role });
    uid = userRecord.uid;
  } catch (e: any) {
    // Translate the most common Firebase Auth error codes to friendly Arabic
    // messages instead of leaking raw English to the UI.
    const code = e?.code || '';
    let friendly = 'فشل إنشاء المستخدم في نظام المصادقة.';
    if (code === 'auth/email-already-exists') {
      friendly = 'البريد الإلكتروني مستخدم بالفعل في نظام المصادقة.';
    } else if (code === 'auth/invalid-email') {
      friendly = 'البريد الإلكتروني غير صالح.';
    } else if (code === 'auth/invalid-password') {
      friendly = 'كلمة المرور يجب أن لا تقل عن 6 أحرف.';
    } else if (code === 'auth/phone-number-already-exists') {
      friendly = 'رقم الهاتف مرتبط بحساب آخر بالفعل.';
    }
    return res.status(409).json({ success: false, message: friendly });
  }

  // Store the Firestore profile doc id == Firebase Auth uid so that
  // authenticateToken (findUserById(uid)) can resolve the user on login.
  const newUser = await db.createUserWithId(uid, {
    name,
    phone: cleanPhone,
    email: cleanEmail || undefined,
    password,
    role,
  });

  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'CREATE_STAFF_USER', 'User', uid, `إضافة مستخدم طاقم جديد: ${newUser.name} بصلاحية ${newUser.role}`);
  res.status(201).json({ success: true, message: 'تم إنشاء حساب الموظف بنجاح.', data: { ...newUser, id: uid } });
}));

app.put('/api/admin/users/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const updated = await db.updateUser(req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_USER', 'User', updated.id, `تحديث بيانات المستخدم.`);
  res.json({ success: true, message: 'تم تحديث المستخدم بنجاح.', data: updated });
}));

app.delete('/api/admin/users/:id', authenticateToken, requireRoles('super_admin'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const deleted = await db.deleteUser(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'DELETE_USER', 'User', req.params.id, `حذف حساب الموظف: ${deleted.name}.`);
  res.json({ success: true, message: 'تم حذف الحساب بنجاح.' });
}));

app.put('/api/admin/content/doctorProfile', authenticateToken, requireRoles('super_admin', 'content_editor'), wrap(async (req: AuthRequest, res) => {
  const adminUser = req.user!;
  const profile = await db.updateDoctorProfile(req.body, adminUser.id);
  await db.logAudit(adminUser.id, adminUser.name, adminUser.role, 'UPDATE_DOCTOR_PROFILE', 'DoctorProfile', 'main', `تحديث ملف الدكتور.`);
  res.json({ success: true, message: 'تم حفظ ملف الدكتور بنجاح.', data: profile });
}));

// 404 JSON response for any unmatched API route to prevent HTML fallback
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `المسار البرمجي غير موجود (${req.method} ${req.originalUrl})`,
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[API Error] ${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    success: false,
    message: err?.message || 'حدث خطأ غير متوقع في الخادم.',
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

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
