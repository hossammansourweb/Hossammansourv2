import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
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

interface DatabaseSchema {
  users: (User & { passwordHash: string })[];
  branches: Branch[];
  services: MedicalService[];
  appointments: Appointment[];
  workingHours: WorkingHourRule[];
  exceptions: ScheduleException[];
  doctorProfile: DoctorProfile;
  reviews: Review[];
  faqs: FAQItem[];
  announcements: Announcement[];
  auditLogs: AuditLog[];
  notifications: NotificationRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'clinic_db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);

  const initialUsers: (User & { passwordHash: string })[] = [
    {
      id: 'usr_super_admin',
      name: 'د. حسام منصور أبو كحلة (الإدارة العليا)',
      phone: '01100171817',
      email: 'admin@hossammansour.clinic',
      passwordHash: bcrypt.hashSync('AdminPassword2026!', salt),
      role: 'super_admin',
      gender: 'male',
      age: 48,
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'usr_receptionist',
      name: 'أحمد محمود (الاستقبال والحجوزات)',
      phone: '01113244403',
      email: 'reception@hossammansour.clinic',
      passwordHash: bcrypt.hashSync('Reception2026!', salt),
      role: 'receptionist',
      gender: 'male',
      age: 29,
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'usr_content_editor',
      name: 'سارة إبراهيم (إدارة المحتوى الطبي)',
      phone: '01000111819',
      email: 'editor@hossammansour.clinic',
      passwordHash: bcrypt.hashSync('Editor2026!', salt),
      role: 'content_editor',
      gender: 'female',
      age: 27,
      createdAt: '2026-01-01T08:00:00.000Z',
    },
    {
      id: 'usr_demo_patient',
      name: 'محمد عبد الرحمن (مريض تجريبي)',
      phone: '01012345678',
      email: 'patient@demo.com',
      passwordHash: bcrypt.hashSync('Patient2026!', salt),
      role: 'patient',
      gender: 'male',
      age: 38,
      createdAt: '2026-01-10T10:00:00.000Z',
    },
  ];

  const initialBranches: Branch[] = [
    {
      id: 'br_tanta',
      name: 'فرع طنطا الرئيسي',
      city: 'طنطا',
      address: 'شارع البحر الرئيسي تقاطع طه الحكيم - أعلى مطعم حضرموت - طنطا',
      mapUrl: 'https://maps.app.goo.gl/qFXEkfuCqfQcto',
      phone: '01100171817',
      secondaryPhone: '01113244403',
      workingHoursDescription: 'السبت، الإثنين، الأربعاء من 4:00 عصراً إلى 10:00 مساءً',
      isActive: true,
      order: 1,
    },
    {
      id: 'br_zefta',
      name: 'فرع زفتى',
      city: 'زفتى',
      address: 'أمام مستشفى زفتى العام - زفتى - محافظة الغربية',
      mapUrl: 'https://maps.app.goo.gl/qFXEkfuCqfQcto',
      phone: '01000111819',
      secondaryPhone: '0404724242',
      workingHoursDescription: 'الأحد، الثلاثاء، الخميس من 5:00 مساءً إلى 10:00 مساءً',
      isActive: true,
      order: 2,
    },
  ];

  const initialServices: MedicalService[] = [
    {
      id: 'srv_arthroscopy',
      name: 'مناظير المفاصل وإصابات الملاعب',
      category: 'مناظير وجراحة',
      description: 'تشخيص وعلاج قطع الرباط الصليبي الأمامي والخلفي، تمزق الغضروف الهلالي، وإصابات أوتار الكتف بأحدث تقنيات المناظير الجراحية الدقيقة.',
      durationMinutes: 20,
      price: 350,
      isPriceVisible: true,
      iconName: 'Activity',
      order: 1,
      isApproved: true,
      isVisible: true,
      faqs: [
        {
          question: 'كم تستغرق فترة التعافي بعد منظار الركبة؟',
          answer: 'تختلف فترة التعافي حسب نوع الإجراء؛ ففي حالات تهذيب الغضروف يمكن المشي خلال أيام، بينما يحتاج الرباط الصليبي لبرنامج تأهيل يمتد من 3 إلى 6 أشهر.',
        },
      ],
    },
    {
      id: 'srv_joint_replacement',
      name: 'جراحة وتغيير مفاصل الركبة والحوض',
      category: 'جراحة المفاصل',
      description: 'علاج حالات الخشونة المتقدمة وتآكل المفاصل، وإجراء عمليات الاستبدال الكلي والجزئي لمفصل الركبة ومفصل الحوض باستخدام مفاصل صناعية عالية الجودة.',
      durationMinutes: 25,
      price: 350,
      isPriceVisible: true,
      iconName: 'ShieldPlus',
      order: 2,
      isApproved: true,
      isVisible: true,
    },
    {
      id: 'srv_spine_care',
      name: 'علاج آلام العمود الفقري والانزلاق الغضروفي',
      category: 'العمود الفقري',
      description: 'تقييم شامل لآلام الظهر والرقبة، عرق النسا، ضيق القناة العصبية، مع وضع خطة علاج تحفظي وتداخلي متكاملة تناسب كل حالة.',
      durationMinutes: 20,
      price: 350,
      isPriceVisible: true,
      iconName: 'ActivitySquare',
      order: 3,
      isApproved: true,
      isVisible: true,
    },
    {
      id: 'srv_fractures_trauma',
      name: 'تثبيت الكسور والإصابات والحوادث',
      category: 'كسور وطوارئ',
      description: 'علاج الكسور البسيطة والمركبة بأحدث الشرائح والمسامير ذاتية الغلق والجبائر الطبية الحديثة مع متابعة التئام العظام بالأشعة.',
      durationMinutes: 20,
      price: 350,
      isPriceVisible: true,
      iconName: 'Bone',
      order: 4,
      isApproved: true,
      isVisible: true,
    },
    {
      id: 'srv_pediatric_ortho',
      name: 'عظام الأطفال والتشوهات الخلقية',
      category: 'طب عظام الأطفال',
      description: 'متابعة وعلاج خلع الورك الولادي، تقوس الساقين، الفلات فوت، والقدم المخلبية للأطفال بأحدث البروتوكولات الطبية المعتمدة.',
      durationMinutes: 20,
      price: 350,
      isPriceVisible: true,
      iconName: 'Smile',
      order: 5,
      isApproved: true,
      isVisible: true,
    },
    {
      id: 'srv_joint_injections',
      name: 'الحقن العلاجي للمفاصل وبلازما الدم (PRP)',
      category: 'علاج تحفظي',
      description: 'جلسات الحقن الموضعي للركبة والكتف وحقن البلازما الغنية بالصفائح الدموية والجيل الهيالوروني لتخفيف آلام الخشونة والالتهابات.',
      durationMinutes: 15,
      price: 350,
      isPriceVisible: true,
      iconName: 'Syringe',
      order: 6,
      isApproved: true,
      isVisible: true,
    },
  ];

  const initialWorkingHours: WorkingHourRule[] = [
    // Tanta branch: Saturday (6), Monday (1), Wednesday (3) - 16:00 to 22:00
    { id: 'wh_tnt_sat', branchId: 'br_tanta', dayOfWeek: 6, isOpen: true, startTime: '16:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [{ startTime: '19:00', endTime: '19:30', label: 'استراحة وصلاة المغرب' }] },
    { id: 'wh_tnt_sun', branchId: 'br_tanta', dayOfWeek: 0, isOpen: false, startTime: '16:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [] },
    { id: 'wh_tnt_mon', branchId: 'br_tanta', dayOfWeek: 1, isOpen: true, startTime: '16:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [{ startTime: '19:00', endTime: '19:30', label: 'استراحة وصلاة المغرب' }] },
    { id: 'wh_tnt_tue', branchId: 'br_tanta', dayOfWeek: 2, isOpen: false, startTime: '16:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [] },
    { id: 'wh_tnt_wed', branchId: 'br_tanta', dayOfWeek: 3, isOpen: true, startTime: '16:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [{ startTime: '19:00', endTime: '19:30', label: 'استراحة وصلاة المغرب' }] },
    { id: 'wh_tnt_thu', branchId: 'br_tanta', dayOfWeek: 4, isOpen: false, startTime: '16:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [] },
    { id: 'wh_tnt_fri', branchId: 'br_tanta', dayOfWeek: 5, isOpen: false, startTime: '16:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [] },

    // Zefta branch: Sunday (0), Tuesday (2), Thursday (4) - 17:00 to 22:00
    { id: 'wh_zft_sun', branchId: 'br_zefta', dayOfWeek: 0, isOpen: true, startTime: '17:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [{ startTime: '19:15', endTime: '19:45', label: 'استراحة' }] },
    { id: 'wh_zft_mon', branchId: 'br_zefta', dayOfWeek: 1, isOpen: false, startTime: '17:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [] },
    { id: 'wh_zft_tue', branchId: 'br_zefta', dayOfWeek: 2, isOpen: true, startTime: '17:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [{ startTime: '19:15', endTime: '19:45', label: 'استراحة' }] },
    { id: 'wh_zft_wed', branchId: 'br_zefta', dayOfWeek: 3, isOpen: false, startTime: '17:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [] },
    { id: 'wh_zft_thu', branchId: 'br_zefta', dayOfWeek: 4, isOpen: true, startTime: '17:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [{ startTime: '19:15', endTime: '19:45', label: 'استراحة' }] },
    { id: 'wh_zft_fri', branchId: 'br_zefta', dayOfWeek: 5, isOpen: false, startTime: '17:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [] },
    { id: 'wh_zft_sat', branchId: 'br_zefta', dayOfWeek: 6, isOpen: false, startTime: '17:00', endTime: '22:00', slotDurationMinutes: 20, gapMinutes: 5, breaks: [] },
  ];

  const initialDoctorProfile: DoctorProfile = {
    name: 'د. حسام منصور أبو كحلة',
    title: 'استشاري جراحة العظام والعمود الفقري والمفاصل',
    militaryTitle: 'استشاري جراحة العظام بالقوات المسلحة',
    bio: 'استشاري جراحة العظام والعمود الفقري والمفاصل والمناظير بالقوات المسلحة. خبرة سريرية وجراحية متخصصة في مناظير الركبة والكتف، استبدال المفاصل، تثبيت الكسور المعقدة، والتدخلات الدقيقة للعمود الفقري.',
    fullBiography: [
      'استشاري جراحة العظام والمفاصل والمناظير وإصابات الملاعب بمستشفيات القوات المسلحة.',
      'متخصص في جراحات مناظير المفاصل الدقيقة وإعادة بناء أربطة الركبة والكتف.',
      'خبرة واسعة في جراحات المفاصل الصناعية (تغيير مفصل الركبة والحوض) وعلاج حالات الخشونة المتقدمة.',
      'اتباع أحدث البروتوكولات العالمية في تقييم آلام الظهر والانزلاق الغضروفي والكسور المعقدة.',
    ],
    specialties: [
      'مناظير الركبة والكتف وإصابات الملاعب',
      'جراحات استبدال وتغيير مفاصل الركبة والحوض',
      'جراحات العمود الفقري والانزلاق الغضروفي',
      'علاج وتثبيت الكسور المعقدة وإصابات الحوادث',
      'علاج تشوهات العظام وعظام الأطفال',
      'الحقن العلاجي الموضعي وبلازما المفاصل',
    ],
    experiences: [
      {
        period: 'مستمر',
        title: 'استشاري جراحة العظام والعمود الفقري',
        institution: 'مستشفيات القوات المسلحة',
      },
      {
        period: 'مستمر',
        title: 'استشاري ورئيس العيادة',
        institution: 'عيادات د. حسام منصور (طنطا وزفتى)',
      },
    ],
    patientCareApproach: [
      'التشخيص السريري الدقيق والفحص الشامل قبل اللجوء لأي تدخل جراحي.',
      'تفضيل الحلول التحفظية والتدخلات غير الجراحية متى ما كانت ملائمة للمريض.',
      'شرح خطة العلاج للمريض وأسرته بوضوح وشفافية متناهية.',
      'متابعة مستمرة ما بعد الإجراءات والعمليات لضمان العودة الآمنة للنشاط الطبيعي.',
    ],
    consultationFeeNote: 'سعر الكشف شامل المتابعة وإعادة الفحص خلال مدة الاستشارة المحددة.',
    isApproved: true,
    lastUpdatedBy: 'usr_super_admin',
    updatedAt: new Date().toISOString(),
  };

  const initialAppointments: Appointment[] = [
    {
      id: 'apt_1001',
      bookingNumber: 'HM-2026-1001',
      patientId: 'usr_demo_patient',
      patientName: 'محمد عبد الرحمن',
      patientPhone: '01012345678',
      patientEmail: 'patient@demo.com',
      patientAge: 38,
      patientGender: 'male',
      serviceId: 'srv_arthroscopy',
      serviceName: 'مناظير المفاصل وإصابات الملاعب',
      branchId: 'br_tanta',
      branchName: 'فرع طنطا الرئيسي',
      appointmentDate: '2026-08-26',
      appointmentTime: '17:00',
      confirmationMethod: 'whatsapp',
      status: 'confirmed',
      notes: 'ألم مستمر في الركبة اليمنى بعد التواء أثناء ممارسة الرياضة.',
      clinicInternalNotes: 'تم تأكيد الحضور هاتفياً وإرسال رسالة واتساب برقم الحجز.',
      createdAt: '2026-08-20T12:30:00.000Z',
      updatedAt: '2026-08-20T12:30:00.000Z',
    },
    {
      id: 'apt_1002',
      bookingNumber: 'HM-2026-1002',
      patientName: 'فاطمة السيد علي',
      patientPhone: '01123456789',
      patientAge: 54,
      patientGender: 'female',
      serviceId: 'srv_joint_replacement',
      serviceName: 'جراحة وتغيير مفاصل الركبة والحوض',
      branchId: 'br_tanta',
      branchName: 'فرع طنطا الرئيسي',
      appointmentDate: '2026-08-26',
      appointmentTime: '17:30',
      confirmationMethod: 'sms',
      status: 'new',
      notes: 'خشونة من الدرجة الرابعة في الركبة اليسرى وصعوبة في صعود الدرج.',
      createdAt: '2026-08-24T09:15:00.000Z',
      updatedAt: '2026-08-24T09:15:00.000Z',
    },
    {
      id: 'apt_1003',
      bookingNumber: 'HM-2026-1003',
      patientName: 'كريم محمود يوسف',
      patientPhone: '01234567890',
      patientAge: 29,
      patientGender: 'male',
      serviceId: 'srv_spine_care',
      serviceName: 'علاج آلام العمود الفقري والانزلاق الغضروفي',
      branchId: 'br_zefta',
      branchName: 'فرع زفتى',
      appointmentDate: '2026-08-27',
      appointmentTime: '18:00',
      confirmationMethod: 'whatsapp',
      status: 'confirmed',
      notes: 'آلام أسفل الظهر تمتد للساق اليمنى.',
      createdAt: '2026-08-22T14:00:00.000Z',
      updatedAt: '2026-08-22T14:00:00.000Z',
    },
  ];

  const initialReviews: Review[] = [
    {
      id: 'rev_1',
      patientName: 'م. سامح الشناوي',
      rating: 5,
      reviewText: 'دكتور حسام قمة في الذوق والمهنية والأمانة العلمية. أجرى لي عملية منظار للركبة لتنظيف الغضروف وعدت لممارسة المشي الطبيعي بفضل الله.',
      treatmentType: 'منظار الركبة',
      visitDate: '2026-07-15',
      isApproved: true,
      isFeatured: true,
      order: 1,
      createdAt: '2026-07-18T10:00:00.000Z',
    },
    {
      id: 'rev_2',
      patientName: 'أ. هدى عبد العال',
      rating: 5,
      reviewText: 'عيادة مجهزة ومنظمة جداً ومواعيد دقيقة. شرح لي دكتور حسام حالة خشونة الركبة بالتفصيل وبدأنا علاج تحفظي ممتاز مع تحسن كبير.',
      treatmentType: 'علاج خشونة المفاصل',
      visitDate: '2026-07-28',
      isApproved: true,
      isFeatured: true,
      order: 2,
      createdAt: '2026-07-30T11:30:00.000Z',
    },
    {
      id: 'rev_3',
      patientName: 'كابتن عمرو الخولي',
      rating: 5,
      reviewText: 'أشكر الدكتور حسام على سرعة التشخيص لإصابة الرباط الصليبي في فرع زفتى. اهتمام رائع ومتابعة دورية بكل تفانٍ.',
      treatmentType: 'إصابات ملاعب والرباط الصليبي',
      visitDate: '2026-08-05',
      isApproved: true,
      isFeatured: true,
      order: 3,
      createdAt: '2026-08-08T15:20:00.000Z',
    },
  ];

  const initialFaqs: FAQItem[] = [
    {
      id: 'faq_1',
      question: 'كيف يمكنني حجز موعد كشف في العيادة؟',
      answer: 'يمكنك الحجز بسهولة عبر هذه المنصة باختيار التخصص والفرع (طنطا أو زفتى) واليوم والوقت المناسب لك، وسيصلك رقم حجز فوري ورسالة تأكيد عبر الواتساب أو الرسائل النصية.',
      category: 'الحجز والمواعيد',
      isApproved: true,
      order: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'faq_2',
      question: 'ما هي مواعيد العمل في فرعي طنطا وزفتى؟',
      answer: 'فرع طنطا: السبت، الإثنين، والأربعاء من 4:00 عصراً حتى 10:00 مساءً. فرع زفتى: الأحد، الثلاثاء، والخميس من 5:00 مساءً حتى 10:00 مساءً.',
      category: 'المواعيد والفروع',
      isApproved: true,
      order: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'faq_3',
      question: 'هل يلزم إحضار الأشعة والفحوصات السابقة عند الكشف؟',
      answer: 'نعم، يُفضل دائماً إحضار كافة الأشعات السابقة (عادية أو رنين مغناطيسي أو مقطعية) وأي تقارير طبية سابقة للمساعدة في دقة التقييم وتاريخ الحالة.',
      category: 'تعليمات الزيارة',
      isApproved: true,
      order: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'faq_4',
      question: 'هل يمكن تعديل أو إلغاء الموعد بعد تأكيده؟',
      answer: 'نعم، يمكنك تعديل أو إلغاء موعدك إما من خلال حساب المريض في المنصة قبل موعد الكشف، أو بالتواصل مع أرقام الاستقبال مباشرة.',
      category: 'الحجز والمواعيد',
      isApproved: true,
      order: 4,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const initialAnnouncements: Announcement[] = [
    {
      id: 'anc_1',
      message: 'أهلاً بكم في المنصة الطبية لعيادة د. حسام منصور - يرجى الحجز المسبق لضمان تنظيم المواعيد والحد من فترات الانتظار.',
      type: 'info',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const initialAuditLogs: AuditLog[] = [
    {
      id: 'log_init',
      userId: 'usr_super_admin',
      userName: 'د. حسام منصور أبو كحلة',
      userRole: 'super_admin',
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      entityId: 'root',
      details: 'تهيئة النظام والبيانات الأولية للعيادة وقواعد المواعيد والفروع بنجاح.',
      timestamp: '2026-01-01T08:00:00.000Z',
    },
  ];

  const initialNotifications: NotificationRecord[] = [
    {
      id: 'notif_1',
      appointmentId: 'apt_1001',
      recipientPhone: '01012345678',
      type: 'booking_confirmation',
      channel: 'whatsapp',
      content: 'تم تأكيد حجز موعدك رقم HM-2026-1001 في عيادة د. حسام منصور - فرع طنطا يوم الأربعاء 2026-08-26 الساعة 17:00.',
      status: 'delivered',
      createdAt: '2026-08-20T12:30:00.000Z',
    },
  ];

  return {
    users: initialUsers,
    branches: initialBranches,
    services: initialServices,
    appointments: initialAppointments,
    workingHours: initialWorkingHours,
    exceptions: [],
    doctorProfile: initialDoctorProfile,
    reviews: initialReviews,
    faqs: initialFaqs,
    announcements: initialAnnouncements,
    auditLogs: initialAuditLogs,
    notifications: initialNotifications,
  };
}

class ClinicDatabase {
  private data: DatabaseSchema;

  constructor() {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading database file, re-initializing...', err);
        this.data = getInitialData();
        this.save();
      }
    } else {
      this.data = getInitialData();
      this.save();
    }
  }

  private save() {
    try {
      ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database file:', err);
    }
  }

  // Audit Logger
  public logAudit(userId: string, userName: string, userRole: string, action: string, entityType: string, entityId: string, details: string) {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  // Users
  public getUsers() {
    return this.data.users.map(({ passwordHash, ...u }) => u);
  }

  public findUserById(id: string) {
    return this.data.users.find(u => u.id === id);
  }

  public findUserByPhoneOrEmail(identifier: string) {
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(
      u => u.phone === clean || (u.email && u.email.toLowerCase() === clean)
    );
  }

  public createUser(userData: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    role?: 'patient' | 'super_admin' | 'receptionist' | 'content_editor';
    gender?: 'male' | 'female';
    age?: number;
  }) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(userData.password, salt);
    const newUser: User & { passwordHash: string } = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: userData.name,
      phone: userData.phone,
      email: userData.email,
      role: userData.role || 'patient',
      gender: userData.gender,
      age: userData.age,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  }

  public updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    const { passwordHash: _, ...safeUser } = this.data.users[idx];
    return safeUser;
  }

  public updateUserPassword(id: string, newPassword: string) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    const salt = bcrypt.genSaltSync(10);
    this.data.users[idx].passwordHash = bcrypt.hashSync(newPassword, salt);
    this.save();
    return true;
  }

  // Branches
  public getBranches(includeInactive = false) {
    return this.data.branches
      .filter(b => includeInactive || b.isActive)
      .sort((a, b) => a.order - b.order);
  }

  public findBranchById(id: string) {
    return this.data.branches.find(b => b.id === id);
  }

  public createBranch(branch: Omit<Branch, 'id'>) {
    const newBranch: Branch = {
      ...branch,
      id: `br_${Date.now()}`,
    };
    this.data.branches.push(newBranch);
    this.save();
    return newBranch;
  }

  public updateBranch(id: string, updates: Partial<Branch>) {
    const idx = this.data.branches.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.data.branches[idx] = { ...this.data.branches[idx], ...updates };
    this.save();
    return this.data.branches[idx];
  }

  public deleteBranch(id: string) {
    const idx = this.data.branches.findIndex(b => b.id === id);
    if (idx === -1) return false;
    this.data.branches.splice(idx, 1);
    this.save();
    return true;
  }

  // Services
  public getServices(includeUnapproved = false) {
    return this.data.services
      .filter(s => includeUnapproved || (s.isApproved && s.isVisible))
      .sort((a, b) => a.order - b.order);
  }

  public findServiceById(id: string) {
    return this.data.services.find(s => s.id === id);
  }

  public createService(service: Omit<MedicalService, 'id'>) {
    const newService: MedicalService = {
      ...service,
      id: `srv_${Date.now()}`,
    };
    this.data.services.push(newService);
    this.save();
    return newService;
  }

  public updateService(id: string, updates: Partial<MedicalService>) {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.services[idx] = { ...this.data.services[idx], ...updates };
    this.save();
    return this.data.services[idx];
  }

  public deleteService(id: string) {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.services.splice(idx, 1);
    this.save();
    return true;
  }

  // Working Hours & Exceptions
  public getWorkingHours(branchId?: string) {
    if (branchId) {
      return this.data.workingHours.filter(wh => wh.branchId === branchId);
    }
    return this.data.workingHours;
  }

  public updateWorkingHour(id: string, updates: Partial<WorkingHourRule>) {
    const idx = this.data.workingHours.findIndex(wh => wh.id === id);
    if (idx === -1) return null;
    this.data.workingHours[idx] = { ...this.data.workingHours[idx], ...updates };
    this.save();
    return this.data.workingHours[idx];
  }

  public getExceptions(branchId?: string) {
    if (branchId) {
      return this.data.exceptions.filter(e => e.branchId === branchId);
    }
    return this.data.exceptions;
  }

  public createException(exception: Omit<ScheduleException, 'id'>) {
    const newEx: ScheduleException = {
      ...exception,
      id: `ex_${Date.now()}`,
    };
    this.data.exceptions.push(newEx);
    this.save();
    return newEx;
  }

  public deleteException(id: string) {
    const idx = this.data.exceptions.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.data.exceptions.splice(idx, 1);
    this.save();
    return true;
  }

  // Available Slots Algorithm
  public calculateAvailableSlots(branchId: string, serviceId: string, dateStr: string): AvailableSlot[] {
    const dateObj = new Date(dateStr + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return [];
    }

    // Check if date is in the past (before today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateObj);
    targetDate.setHours(0, 0, 0, 0);
    if (targetDate < today) {
      return [];
    }

    const dayOfWeek = dateObj.getDay(); // 0=Sunday, 6=Saturday

    // Check for explicit holiday/exception on this date
    const exception = this.data.exceptions.find(
      e => e.branchId === branchId && e.date === dateStr
    );

    if (exception && (exception.type === 'holiday' || exception.type === 'off_day')) {
      return [];
    }

    // Find standard working hour rule for this branch & day
    const rule = this.data.workingHours.find(
      wh => wh.branchId === branchId && wh.dayOfWeek === dayOfWeek
    );

    if (!rule || !rule.isOpen) {
      return [];
    }

    let startTimeStr = rule.startTime;
    let endTimeStr = rule.endTime;

    if (exception && exception.type === 'special_hours' && exception.startTime && exception.endTime) {
      startTimeStr = exception.startTime;
      endTimeStr = exception.endTime;
    }

    // Find service duration
    const service = this.data.services.find(s => s.id === serviceId);
    const slotDuration = service ? service.durationMinutes : (rule.slotDurationMinutes || 20);
    const gap = rule.gapMinutes || 5;

    // Convert HH:MM to total minutes from midnight
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

    // Existing active bookings on this branch and date
    const existingBookings = this.data.appointments.filter(
      apt =>
        apt.branchId === branchId &&
        apt.appointmentDate === dateStr &&
        apt.status !== 'cancelled'
    );

    const breaks = rule.breaks || [];

    const slots: AvailableSlot[] = [];
    let currentMins = startMins;

    while (currentMins + slotDuration <= endMins) {
      const slotTimeStr = formatMins(currentMins);

      // Check if slot falls in a break
      const inBreak = breaks.some(b => {
        const bStart = parseMins(b.startTime);
        const bEnd = parseMins(b.endTime);
        return currentMins >= bStart && currentMins < bEnd;
      });

      if (inBreak) {
        currentMins += slotDuration + gap;
        continue;
      }

      // Check if already booked
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

  // Appointments
  public getAppointments(filters?: {
    patientId?: string;
    branchId?: string;
    serviceId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    let list = [...this.data.appointments];

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
        list = list.filter(a => a.appointmentDate >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        list = list.filter(a => a.appointmentDate <= filters.dateTo!);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase().trim();
        list = list.filter(
          a =>
            a.bookingNumber.toLowerCase().includes(s) ||
            a.patientName.toLowerCase().includes(s) ||
            a.patientPhone.includes(s)
        );
      }
    }

    return list.sort((a, b) => {
      // Sort upcoming dates first, then descending creation
      if (a.appointmentDate === b.appointmentDate) {
        return a.appointmentTime.localeCompare(b.appointmentTime);
      }
      return b.appointmentDate.localeCompare(a.appointmentDate);
    });
  }

  public findAppointmentById(id: string) {
    return this.data.appointments.find(a => a.id === id);
  }

  public findAppointmentByBookingNumber(bookingNumber: string) {
    return this.data.appointments.find(
      a => a.bookingNumber.toLowerCase() === bookingNumber.toLowerCase().trim()
    );
  }

  public createAppointment(data: {
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
  }) {
    // Check duplicate slot conflict
    const conflict = this.data.appointments.find(
      a =>
        a.branchId === data.branchId &&
        a.appointmentDate === data.appointmentDate &&
        a.appointmentTime === data.appointmentTime &&
        a.status !== 'cancelled'
    );

    if (conflict) {
      throw new Error('هذا الموعد تم حجزه بالفعل لمريض آخر، يرجى اختيار موعد آخر متاح.');
    }

    const service = this.data.services.find(s => s.id === data.serviceId);
    const branch = this.data.branches.find(b => b.id === data.branchId);

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `HM-${new Date().getFullYear()}-${randomDigits}`;

    const newAppointment: Appointment = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookingNumber,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.appointments.push(newAppointment);

    // Queue notification
    this.createNotification({
      appointmentId: newAppointment.id,
      recipientPhone: newAppointment.patientPhone,
      recipientEmail: newAppointment.patientEmail,
      type: 'booking_confirmation',
      channel: newAppointment.confirmationMethod === 'sms' ? 'sms' : 'whatsapp',
      content: `تم تسجيل حجزك بنجاح في عيادة د. حسام منصور برقم (${bookingNumber}) بتاريخ ${newAppointment.appointmentDate} الساعة ${newAppointment.appointmentTime} بـ ${newAppointment.branchName}.`,
    });

    this.save();
    return newAppointment;
  }

  public updateAppointmentStatus(
    id: string,
    status: Appointment['status'],
    reason?: string,
    internalNotes?: string
  ) {
    const idx = this.data.appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const apt = this.data.appointments[idx];
    apt.status = status;
    if (reason) apt.cancellationReason = reason;
    if (internalNotes !== undefined) apt.clinicInternalNotes = internalNotes;
    apt.updatedAt = new Date().toISOString();

    // Trigger notification if status is confirmed or cancelled
    if (status === 'confirmed') {
      this.createNotification({
        appointmentId: apt.id,
        recipientPhone: apt.patientPhone,
        recipientEmail: apt.patientEmail,
        type: 'booking_confirmation',
        channel: apt.confirmationMethod === 'sms' ? 'sms' : 'whatsapp',
        content: `تم تأكيد موعدك رسمياً في عيادة د. حسام منصور برقم (${apt.bookingNumber}) في ${apt.branchName} يوم ${apt.appointmentDate} في تمام ${apt.appointmentTime}. نتشرف بخدمتكم.`,
      });
    } else if (status === 'cancelled') {
      this.createNotification({
        appointmentId: apt.id,
        recipientPhone: apt.patientPhone,
        recipientEmail: apt.patientEmail,
        type: 'cancellation',
        channel: apt.confirmationMethod === 'sms' ? 'sms' : 'whatsapp',
        content: `تم إلغاء الموعد رقم (${apt.bookingNumber}) في عيادة د. حسام منصور بناءً على طلبكم/الإدارة. سبب الإلغاء: ${reason || 'بناء على رغبة المريض'}.`,
      });
    }

    this.save();
    return apt;
  }

  public rescheduleAppointment(
    id: string,
    newDate: string,
    newTime: string,
    newBranchId?: string
  ) {
    const idx = this.data.appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;

    const apt = this.data.appointments[idx];
    const targetBranchId = newBranchId || apt.branchId;

    // Check slot conflict
    const conflict = this.data.appointments.find(
      a =>
        a.id !== id &&
        a.branchId === targetBranchId &&
        a.appointmentDate === newDate &&
        a.appointmentTime === newTime &&
        a.status !== 'cancelled'
    );

    if (conflict) {
      throw new Error('الموعد الجديد المختار محجوز بالفعل، يرجى اختيار موعد آخر.');
    }

    const branch = this.data.branches.find(b => b.id === targetBranchId);

    apt.branchId = targetBranchId;
    if (branch) apt.branchName = branch.name;
    apt.appointmentDate = newDate;
    apt.appointmentTime = newTime;
    apt.status = 'confirmed';
    apt.updatedAt = new Date().toISOString();

    this.createNotification({
      appointmentId: apt.id,
      recipientPhone: apt.patientPhone,
      recipientEmail: apt.patientEmail,
      type: 'reschedule',
      channel: apt.confirmationMethod === 'sms' ? 'sms' : 'whatsapp',
      content: `تم تعديل موعدك في عيادة د. حسام منصور إلى يوم ${newDate} الساعة ${newTime} في ${apt.branchName}. رقم الحجز: ${apt.bookingNumber}.`,
    });

    this.save();
    return apt;
  }

  // Dashboard Stats
  public getDashboardStats(): DashboardStats {
    const todayStr = new Date().toISOString().split('T')[0];
    const appointments = this.data.appointments;

    // Calculate start of current week (Saturday or Sunday)
    const now = new Date();
    const day = now.getDay();
    const diffToWeekStart = (day + 1) % 7; // Saturday as week start in Egypt
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

    // Total unique patient phone numbers
    const uniquePatients = new Set(appointments.map(a => a.patientPhone)).size;

    const totalResolved = completedBookings + checkedInBookings + appointments.filter(a => a.status === 'no_show').length;
    const attendanceRate = totalResolved > 0 ? Math.round(((completedBookings + checkedInBookings) / totalResolved) * 100) : 94;

    const branchBreakdown = this.data.branches.map(b => ({
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
      totalPatients: uniquePatients || this.data.users.filter(u => u.role === 'patient').length,
      attendanceRate,
      branchBreakdown,
    };
  }

  // Content (Doctor Profile, FAQs, Reviews, Announcements)
  public getDoctorProfile() {
    return this.data.doctorProfile;
  }

  public updateDoctorProfile(profile: Partial<DoctorProfile>, updatedBy: string) {
    this.data.doctorProfile = {
      ...this.data.doctorProfile,
      ...profile,
      lastUpdatedBy: updatedBy,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.doctorProfile;
  }

  public getReviews(includeUnapproved = false) {
    return this.data.reviews
      .filter(r => includeUnapproved || r.isApproved)
      .sort((a, b) => a.order - b.order);
  }

  public createReview(review: Omit<Review, 'id' | 'createdAt'>) {
    const newReview: Review = {
      ...review,
      id: `rev_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.reviews.push(newReview);
    this.save();
    return newReview;
  }

  public updateReviewApproval(id: string, isApproved: boolean, isFeatured = false) {
    const idx = this.data.reviews.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data.reviews[idx].isApproved = isApproved;
    this.data.reviews[idx].isFeatured = isFeatured;
    this.save();
    return this.data.reviews[idx];
  }

  public deleteReview(id: string) {
    const idx = this.data.reviews.findIndex(r => r.id === id);
    if (idx === -1) return false;
    this.data.reviews.splice(idx, 1);
    this.save();
    return true;
  }

  public getFaqs(includeUnapproved = false) {
    return this.data.faqs
      .filter(f => includeUnapproved || f.isApproved)
      .sort((a, b) => a.order - b.order);
  }

  public createFaq(faq: Omit<FAQItem, 'id' | 'createdAt'>) {
    const newFaq: FAQItem = {
      ...faq,
      id: `faq_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.faqs.push(newFaq);
    this.save();
    return newFaq;
  }

  public updateFaq(id: string, updates: Partial<FAQItem>) {
    const idx = this.data.faqs.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.data.faqs[idx] = { ...this.data.faqs[idx], ...updates };
    this.save();
    return this.data.faqs[idx];
  }

  public deleteFaq(id: string) {
    const idx = this.data.faqs.findIndex(f => f.id === id);
    if (idx === -1) return false;
    this.data.faqs.splice(idx, 1);
    this.save();
    return true;
  }

  public getAnnouncements(activeOnly = true) {
    return this.data.announcements.filter(a => !activeOnly || a.isActive);
  }

  public updateAnnouncement(id: string, updates: Partial<Announcement>) {
    const idx = this.data.announcements.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.data.announcements[idx] = { ...this.data.announcements[idx], ...updates };
    this.save();
    return this.data.announcements[idx];
  }

  // Audit Logs & Notifications
  public getAuditLogs(limit = 100) {
    return this.data.auditLogs.slice(0, limit);
  }

  public getNotifications(limit = 100) {
    return this.data.notifications.slice(0, limit);
  }

  public createNotification(data: Omit<NotificationRecord, 'id' | 'status' | 'createdAt'>) {
    const record: NotificationRecord = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'delivered', // Delivered via mock provider architecture
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(record);
    if (this.data.notifications.length > 300) {
      this.data.notifications = this.data.notifications.slice(0, 300);
    }
    this.save();
    return record;
  }
}

export const db = new ClinicDatabase();
