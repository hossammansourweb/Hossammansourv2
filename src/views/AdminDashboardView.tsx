import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Appointment,
  Branch,
  MedicalService,
  DoctorProfile,
  Review,
  FAQItem,
  Announcement,
  AuditLog,
  AppointmentStatus,
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatArabicDate, formatArabicTime, getTodayDateString } from '../utils/date.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Modal } from '../components/common/Modal.tsx';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Stethoscope,
  FileEdit,
  ShieldCheck,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Star,
  DollarSign,
  TrendingUp,
  Eye,
  MessageSquare,
  Sparkles,
  ArrowUpDown,
  Lock,
  UserCheck,
  CheckCheck,
} from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const { user, isSuperAdmin, isReceptionist, isContentEditor } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'stats' | 'appointments' | 'branches' | 'services' | 'content' | 'audit'
  >('stats');

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Filter and Search for Appointments
  const [aptSearch, setAptSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Status Change Modal / Note Modal
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<AppointmentStatus>('confirmed');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptionInput, setPrescriptionInput] = useState('');

  // Announcement modal
  const [annModalOpen, setAnnModalOpen] = useState(false);
  const [annMessage, setAnnMessage] = useState('');
  const [annActive, setAnnActive] = useState(true);

  // Quick Walk-in booking modal
  const [walkinModalOpen, setWalkinModalOpen] = useState(false);
  const [walkinBranchId, setWalkinBranchId] = useState('');
  const [walkinServiceId, setWalkinServiceId] = useState('');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinDate, setWalkinDate] = useState(getTodayDateString());
  const [walkinTime, setWalkinTime] = useState('17:00');

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        aptsRes,
        branchesRes,
        servicesRes,
        reviewsRes,
        faqsRes,
        clinicInfoRes,
        profileRes,
        auditRes,
      ] = await Promise.all([
        api.getDashboardStats(),
        api.getAdminAppointments(),
        api.getAdminBranches(),
        api.getAdminServices(),
        api.getAdminReviews(),
        api.getAdminFaqs(),
        api.getClinicInfo(),
        api.getDoctorProfile(),
        isSuperAdmin ? api.getAuditLogs() : Promise.resolve({ success: true, data: [] }),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (aptsRes.success) setAppointments(aptsRes.data);
      if (branchesRes.success) setBranches(branchesRes.data);
      if (servicesRes.success) setServices(servicesRes.data);
      if (reviewsRes.success) setReviews(reviewsRes.data);
      if (faqsRes.success) setFaqs(faqsRes.data);
      if (clinicInfoRes.success) setAnnouncements(clinicInfoRes.data.announcements);
      if (profileRes.success) setDoctorProfile(profileRes.data);
      if (auditRes.success) setAuditLogs(auditRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const handleUpdateStatus = async () => {
    if (!selectedApt) return;
    try {
      const notes = [doctorNotes, prescriptionInput ? `الروشتة المقررة:\n${prescriptionInput}` : '']
        .filter(Boolean)
        .join('\n\n');

      await api.updateAppointmentStatus(
        selectedApt.id,
        newStatus,
        undefined,
        notes || undefined
      );
      setStatusModalOpen(false);
      setSelectedApt(null);
      fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'فشل تحديث حالة الموعد.');
    }
  };

  const handleReviewAction = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      await api.updateReviewApproval(reviewId, status === 'approved', false);
      fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'فشل تعديل حالة التقييم.');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (announcements.length > 0) {
        await api.updateAnnouncement(announcements[0].id, {
          message: annMessage,
          isActive: annActive,
        });
      }
      setAnnModalOpen(false);
      setAnnMessage('');
      fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'فشل إضافة التنويه.');
    }
  };

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.bookAppointment({
        branchId: walkinBranchId || (branches[0]?.id ?? ''),
        serviceId: walkinServiceId || (services[0]?.id ?? ''),
        appointmentDate: walkinDate,
        appointmentTime: walkinTime,
        patientName: walkinName,
        patientPhone: walkinPhone,
        confirmationMethod: 'whatsapp',
      });
      setWalkinModalOpen(false);
      setWalkinName('');
      setWalkinPhone('');
      fetchAllAdminData();
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل الكشف.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="جاري تجهيز لوحة التحكم والإحصائيات الطبية..." />;
  }

  // Filtered appointments
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(aptSearch.toLowerCase()) ||
      apt.patientPhone.includes(aptSearch) ||
      apt.bookingNumber.toLowerCase().includes(aptSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || apt.branchId === branchFilter;
    const matchesDate = !dateFilter || apt.appointmentDate === dateFilter;

    return matchesSearch && matchesStatus && matchesBranch && matchesDate;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-right">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 text-white shadow-lg border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30">
              {isSuperAdmin
                ? 'مدير النظام (د. حسام)'
                : isReceptionist
                ? 'موظف الاستقبال والمواعيد'
                : 'محرر المحتوى الطبي'}
            </span>
            <span className="text-xs text-slate-400">بوابة الإدارة السريرية</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-tajawal text-white mt-1">
            لوحة الإدارة والتحكم في العيادات
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (branches.length > 0) setWalkinBranchId(branches[0].id);
              if (services.length > 0) setWalkinServiceId(services[0].id);
              setWalkinModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل كشف مباشر / هاتفي</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'stats'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>المؤشرات والإحصائيات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'appointments'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>إدارة الحجوزات ({appointments.length})</span>
        </button>

        {(isSuperAdmin || isReceptionist) && (
          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'branches'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>الفروع والمواعيد ({branches.length})</span>
          </button>
        )}

        {(isSuperAdmin || isContentEditor) && (
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'services'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>الخدمات والأسعار ({services.length})</span>
          </button>
        )}

        {(isSuperAdmin || isContentEditor) && (
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'content'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileEdit className="w-4 h-4" />
            <span>محتوى الموقع والتقييمات</span>
          </button>
        )}

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>سجل العمليات والأمان ({auditLogs.length})</span>
          </button>
        )}
      </div>

      {/* 1. STATS OVERVIEW TAB */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-right space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                مواعيد اليوم ({formatArabicDate(getTodayDateString())})
              </span>
              <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 font-tajawal">
                {stats.todayBookings}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                حجوزات مسجلة لليوم
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-right space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                حجوزات الأسبوع
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-tajawal">
                {stats.weeklyBookings}
              </div>
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                في فرعي طنطا وزفتى
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-right space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                الحالات المكتملة
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-tajawal">
                {stats.completedBookings}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">
                تم توقيع الكشف بنجاح
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-right space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                إجمالي المرضى المسجلين
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-tajawal">
                {stats.totalPatients}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                نسبة الحضور: {stats.attendanceRate}%
              </span>
            </div>
          </div>

          {/* Status Breakdown Grid */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-tajawal">
              توزيع حالات المواعيد الحالية
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                <span className="text-xs text-blue-700 dark:text-blue-300 block font-bold">حجوزات جديدة</span>
                <span className="text-xl font-extrabold text-blue-900 dark:text-blue-200">
                  {stats.newBookings || 0}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block font-bold">مؤكدة</span>
                <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">
                  {stats.confirmedBookings || 0}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-700 dark:text-slate-300 block font-bold">مكتملة</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {stats.completedBookings || 0}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <span className="text-xs text-rose-700 dark:text-rose-300 block font-bold">ملغية</span>
                <span className="text-xl font-extrabold text-rose-900 dark:text-rose-200">
                  {stats.cancelledBookings || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. APPOINTMENTS MANAGEMENT TAB */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {/* Search & Filters Row */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الهاتف، أو كود الحجز..."
                  value={aptSearch}
                  onChange={e => setAptSearch(e.target.value)}
                  className="w-full px-3.5 py-2 pl-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="new">جديد</option>
                  <option value="confirmed">مؤكد</option>
                  <option value="checked_in">حضر بالعيادة</option>
                  <option value="completed">تم الكشف</option>
                  <option value="cancelled">ملغي</option>
                  <option value="no_show">لم يحضر</option>
                </select>
              </div>

              {/* Branch Filter */}
              <div>
                <select
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">جميع الفروع</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {dateFilter && (
              <div className="flex items-center gap-2 text-xs text-teal-600">
                <span>تصفية حسب التاريخ: {formatArabicDate(dateFilter)}</span>
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-slate-400 hover:text-slate-600 underline"
                >
                  إلغاء تصفية التاريخ
                </button>
              </div>
            )}
          </div>

          {/* Appointments Table */}
          <div className="overflow-x-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                <tr>
                  <th className="p-4">كود الحجز</th>
                  <th className="p-4">اسم المريض</th>
                  <th className="p-4">رقم الهاتف</th>
                  <th className="p-4">الفرع</th>
                  <th className="p-4">التاريخ والوقت</th>
                  <th className="p-4">الخدمة</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      لا توجد حجوزات مطابقة لمعايير البحث.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map(apt => (
                    <tr key={apt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {apt.bookingNumber}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {apt.patientName}
                      </td>
                      <td className="p-4 font-mono" dir="ltr">
                        {apt.patientPhone}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{apt.branchName}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        <div>{formatArabicDate(apt.appointmentDate)}</div>
                        <span className="font-bold text-teal-600">
                          {formatArabicTime(apt.appointmentTime)}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{apt.serviceName}</td>
                      <td className="p-4">
                        <StatusBadge status={apt.status} size="sm" />
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedApt(apt);
                            setNewStatus(apt.status);
                            setDoctorNotes(apt.doctorNotes || '');
                            setPrescriptionInput(apt.prescriptions?.join('\n') || '');
                            setStatusModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                        >
                          تحديث الحالة
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. BRANCHES MANAGEMENT TAB */}
      {activeTab === 'branches' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map(branch => (
            <div
              key={branch.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-tajawal">
                    {branch.name}
                  </h3>
                  <span className="text-xs text-teal-600">{branch.city}</span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                  نشط
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  <strong>العنوان:</strong> {branch.address}
                </p>
                <p>
                  <strong>المواعيد:</strong> {branch.workingHoursDescription}
                </p>
                <p>
                  <strong>الهاتف:</strong> {branch.phone}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 text-xs space-y-1">
                <strong>نظام ومواعيد الكشف:</strong>
                <p className="text-slate-600 dark:text-slate-400">
                  {branch.workingHoursDescription || 'متاح أيام العمل المحددة'}
                </p>
                {Array.isArray((branch as any).schedules) && (branch as any).schedules.length > 0 && (
                  <div className="pt-1 space-y-1">
                    {(branch as any).schedules.map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-slate-500">
                        <span>{s.dayName}</span>
                        <span>
                          {s.startTime} إلى {s.endTime} (بمعدل {s.slotDurationMinutes} دقيقة)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. SERVICES MANAGEMENT TAB */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(srv => (
              <div
                key={srv.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {srv.category}
                  </span>
                  <span className="text-xs font-bold text-teal-600">
                    {srv.price ? `${srv.price} ج.م` : 'استشارة'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-tajawal">
                  {srv.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                  {srv.description}
                </p>
                <div className="pt-2 text-xs text-slate-400">
                  مدة الكشف: {srv.durationMinutes} دقيقة
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. CONTENT & REVIEWS MANAGEMENT TAB */}
      {activeTab === 'content' && (
        <div className="space-y-8">
          {/* Announcements Banner Manager */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-tajawal">
                  شريط الإعلانات والتنويهات العاجلة
                </h3>
                <p className="text-xs text-slate-500">
                  يظهر في أعلى الموقع لتنبيه المرضى بمواعيد الإجازات أو التحديثات.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnnModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تنويه جديد</span>
              </button>
            </div>

            <div className="space-y-2">
              {announcements.map(ann => (
                <div
                  key={ann.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        ann.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {ann.message}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {ann.isActive ? 'مفعل ويظهر للزوار' : 'غير مفعل'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Reviews Moderation */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-tajawal">
              مراجعة واعتماد تقييمات المرضى
            </h3>
            <p className="text-xs text-slate-500">
              * التقييمات لا تظهر للعامة إلا بعد اعتماد وموافقة إدارة العيادة.
            </p>

            <div className="space-y-3">
              {reviews.map(rev => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 dark:text-white">{rev.patientName}</strong>
                      <span className="text-slate-400">• {rev.treatmentType}</span>
                      <div className="flex text-amber-400">
                        {Array.from({ length: Math.max(1, Math.min(5, rev.rating || 5)) }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">"{rev.reviewText}"</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!rev.isApproved ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleReviewAction(rev.id, 'approved')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                        >
                          اعتماد ونشر
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewAction(rev.id, 'rejected')}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
                        >
                          حذف / رفض
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        معتمد ومنشور
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT LOGS TAB (Super Admin Only) */}
      {activeTab === 'audit' && isSuperAdmin && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-tajawal">
                سجل النشاط والعمليات (Audit Trail)
              </h3>
              <p className="text-xs text-slate-500">
                تسجيل آلي لجميع الإجراءات والتعديلات التي يقوم بها موظفو الاستقبال والإدارة.
              </p>
            </div>
            <Lock className="w-5 h-5 text-teal-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">الوقت والتاريخ</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">نوع الإجراء</th>
                  <th className="p-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">
                      لا توجد سجلات بعد.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="p-3 text-slate-500 font-mono" dir="ltr">
                        {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {log.userName}
                      </td>
                      <td className="p-3 text-teal-600 font-semibold">{log.action}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`تحديث حالة الموعد: ${selectedApt?.bookingNumber}`}
        maxWidth="md"
      >
        {selectedApt && (
          <div className="space-y-4 text-right">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <p>
                <strong>المريض:</strong> {selectedApt.patientName} ({selectedApt.patientPhone})
              </p>
              <p>
                <strong>الموعد:</strong> {formatArabicDate(selectedApt.appointmentDate)} -{' '}
                {formatArabicTime(selectedApt.appointmentTime)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تغيير الحالة إلى:
              </label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="new">حجز جديد (New)</option>
                <option value="confirmed">تأكيد الموعد (Confirmed)</option>
                <option value="checked_in">حضر بالعيادة وفي الانتظار (Checked-In)</option>
                <option value="completed">تم توقيع الكشف (Completed)</option>
                <option value="cancelled">إلغاء الموعد (Cancelled)</option>
                <option value="no_show">لم يحضر (No-Show)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات الطبيب والتشخيص (اختياري)
              </label>
              <textarea
                rows={2}
                placeholder="التشخيص الإكلينيكي أو الملاحظات الطبية..."
                value={doctorNotes}
                onChange={e => setDoctorNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                الأدوية والروشتة المقررة (سطر لكل دواء)
              </label>
              <textarea
                rows={2}
                placeholder="Panadol Extra 500mg - قرص كل 8 ساعات&#10;Genu Phil - قرص بعد الأكل"
                value={prescriptionInput}
                onChange={e => setPrescriptionInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-colors"
              >
                حفظ التحديث
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Announcement Create Modal */}
      <Modal
        isOpen={annModalOpen}
        onClose={() => setAnnModalOpen(false)}
        title="إضافة تنويه جديد في الشريط العلوي"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-right">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              نص التنويه أو الإعلان
            </label>
            <input
              type="text"
              required
              placeholder="مثال: يرجى العلم بأن العيادة مغلقة يوم الخميس القادم بمناسبة..."
              value={annMessage}
              onChange={e => setAnnMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ann-active"
              checked={annActive}
              onChange={e => setAnnActive(e.target.checked)}
              className="w-4 h-4 text-teal-600 rounded-md"
            />
            <label htmlFor="ann-active" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              تفعيل التنويه وإظهاره فوراً لجميع الزوار
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAnnModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-colors"
            >
              نشر التنويه
            </button>
          </div>
        </form>
      </Modal>

      {/* Walk-in Booking Modal */}
      <Modal
        isOpen={walkinModalOpen}
        onClose={() => setWalkinModalOpen(false)}
        title="تسجيل حجز مباشر / تليفوني"
        maxWidth="md"
      >
        <form onSubmit={handleWalkinSubmit} className="space-y-4 text-right">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                الفرع
              </label>
              <select
                value={walkinBranchId}
                onChange={e => setWalkinBranchId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                الخدمة
              </label>
              <select
                value={walkinServiceId}
                onChange={e => setWalkinServiceId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اسم المريض
            </label>
            <input
              type="text"
              required
              placeholder="الاسم الثلاثي"
              value={walkinName}
              onChange={e => setWalkinName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              رقم الهاتف
            </label>
            <input
              type="tel"
              required
              placeholder="01100171817"
              value={walkinPhone}
              onChange={e => setWalkinPhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تاريخ الموعد
              </label>
              <input
                type="date"
                required
                value={walkinDate}
                onChange={e => setWalkinDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                الوقت
              </label>
              <input
                type="time"
                required
                value={walkinTime}
                onChange={e => setWalkinTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWalkinModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-colors"
            >
              تسجيل الكشف
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
