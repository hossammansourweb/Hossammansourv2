import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Appointment, Prescription } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatArabicDate, formatArabicTime, formatPrescriptionDateTime } from '../utils/date.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { CalendarExportButton } from '../components/common/CalendarExportButton.tsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Modal } from '../components/common/Modal.tsx';
import { useToast } from '../components/common/Toast.tsx';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Image as ImageIcon,
  User,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Search,
  Trash2,
  Eye,
  Loader2,
  UploadCloud,
  RefreshCw,
  LogOut,
} from 'lucide-react';

interface PatientPortalViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  initialTab?: 'appointments' | 'records' | 'profile' | 'lookup' | 'prescriptions';
}

const TABS = {
  appointments: { label: 'مواعيدي', icon: Calendar },
  records: { label: 'سجل الكشوفات', icon: FileText },
  prescriptions: { label: 'روشتاتي', icon: ImageIcon },
  profile: { label: 'بياناتي', icon: User },
} as const;

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getDateParts(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return { day: d, month: MONTHS[m - 1], weekday: WEEKDAYS[date.getDay()] };
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({ onNavigate, onOpenAuth, initialTab }) => {
  const { user, logout, updateUser } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'appointments' | 'records' | 'profile' | 'lookup' | 'prescriptions'>(
    initialTab || (user ? 'appointments' : 'lookup')
  );

  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [recordsCount, setRecordsCount] = useState(0);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [aptError, setAptError] = useState<string | null>(null);

  // Guest lookup by code & phone
  const [lookupCode, setLookupCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookedUpApt, setLookedUpApt] = useState<Appointment | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Cancel appointment modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [targetApt, setTargetApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Profile update state
  const [profName, setProfName] = useState(user?.name || '');
  const [profPhone, setProfPhone] = useState(user?.phone || '');
  const [profEmail, setProfEmail] = useState(user?.email || '');
  const [profGender, setProfGender] = useState<'male' | 'female'>(user?.gender || 'male');
  const [profAge, setProfAge] = useState<string>(user?.age ? String(user?.age) : '');
  const [profSuccess, setProfSuccess] = useState<string | null>(null);

  const fetchPatientData = async () => {
    if (!user) return;
    setLoading(true);
    setAptError(null);
    try {
      const aptsRes = await api.getPatientAppointments();
      if (aptsRes.success && aptsRes.data) {
        setAppointments(aptsRes.data);
        setRecordsCount(aptsRes.data.filter(a => a.status === 'completed' || a.clinicInternalNotes).length);
      } else {
        setAptError('تعذر تحميل مواعيدك في الوقت الحالي.');
      }
    } catch (err) {
      console.error(err);
      setAptError('حدث خطأ أثناء تحميل المواعيد. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setActiveTab('appointments');
      fetchPatientData();
      setProfName(user.name);
      setProfPhone(user.phone);
      setProfEmail(user.email || '');
      setProfGender(user.gender || 'male');
      setProfAge(user.age ? String(user.age) : '');
    } else {
      setActiveTab('lookup');
    }
  }, [user]);

  // Keep the active tab in sync when navigation requests a specific tab
  // (e.g. clicking "روشتاتي" in the navbar while already on the portal).
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const upcomingApts = appointments
    .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => `${a.appointmentDate}${a.appointmentTime}`.localeCompare(`${b.appointmentDate}${b.appointmentTime}`));
  const nextApt = upcomingApts[0];

  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookedUpApt(null);
    setLookupLoading(true);
    try {
      const res = await api.lookupAppointment(lookupCode.trim(), lookupPhone.trim());
      if (res.success && res.data) {
        setLookedUpApt(res.data);
      } else {
        setLookupError('لم يتم العثور على حجز بهذه البيانات.');
      }
    } catch (err: any) {
      setLookupError(err.message || 'فشل في الاستعلام عن الحجز.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!targetApt) return;
    setCancelling(true);
    try {
      const res = await api.patientCancelAppointment(targetApt.id, cancelReason);
      if (res.success) {
        setCancelModalOpen(false);
        setTargetApt(null);
        setCancelReason('');
        toast.push({ kind: 'success', title: 'تم إلغاء الموعد', description: 'تم إلغاء الحجز بنجاح.' });
        if (user) {
          fetchPatientData();
        } else if (lookedUpApt) {
          setLookedUpApt(prev => (prev ? { ...prev, status: 'cancelled' } : null));
        }
      } else {
        toast.push({ kind: 'error', title: 'تعذر إلغاء الحجز', description: res.message || 'يرجى المحاولة مرة أخرى.' });
      }
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'فشل الإلغاء', description: err.message || 'حدث خطأ أثناء الإلغاء.' });
    } finally {
      setCancelling(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfSuccess(null);
    try {
      const res = await api.updatePatientProfile({
        name: profName.trim(),
        phone: profPhone.trim(),
        email: profEmail.trim() || undefined,
        gender: profGender,
        age: profAge ? parseInt(profAge, 10) : undefined,
      });
      if (res.success && res.data) {
        updateUser(res.data);
        setProfSuccess('تم حفظ التعديلات بنجاح في ملفك الشخصي.');
        setTimeout(() => setProfSuccess(null), 3000);
      } else {
        toast.push({ kind: 'error', title: 'فشل الحفظ', description: res.message || 'تعذر تحديث البيانات.' });
      }
    } catch (err: any) {
      toast.push({ kind: 'error', title: 'فشل الحفظ', description: err.message || 'حدث خطأ أثناء حفظ البيانات.' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-9 space-y-6 sm:space-y-8 text-right" dir="rtl">

        {/* ============ WELCOME / HEADER ============ */}
        {user ? (
          <div className="relative overflow-hidden rounded-3xl bg-[#0E3847] text-white shadow-lg shadow-[#0E3847]/10">
            <div className="absolute inset-0 opacity-60 pointer-events-none hero-glow" aria-hidden />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 sm:p-7">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/15">
                  <span className="text-xl sm:text-2xl font-extrabold text-white">
                    {(user.name || 'م').trim().charAt(0)}
                  </span>
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-2 text-[11px] font-bold text-[#F8A89C]">
                    <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
                    <span>بوابة المريض</span>
                  </div>
                  <h1 className="text-lg sm:text-2xl font-extrabold text-white truncate">
                    أهلاً بك، {user.name}
                  </h1>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {nextApt
                      ? `موعدك القادم: ${formatArabicDate(nextApt.appointmentDate)} — ${formatArabicTime(nextApt.appointmentTime)}`
                      : 'متابعة مواعيدك، الروشتات، والملف الطبي في مكان واحد.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('booking')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-3 sm:py-2.5 rounded-2xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs sm:text-sm shadow-md transition-colors active:scale-[0.98] cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>حجز موعد جديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  aria-label="تسجيل الخروج"
                  className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 ring-1 ring-white/15 text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-[#0E3847] text-white shadow-lg shadow-[#0E3847]/10">
            <div className="absolute inset-0 opacity-60 pointer-events-none hero-glow" aria-hidden />
            <div className="relative p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold text-[#F8A89C]">
                  <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
                  <span>بوابة المريض</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-extrabold text-white">
                  متابعة المواعيد والملف الطبي
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                  استعلم عن حجزك برقم الحجز ورقم الهاتف، أو سجّل دخولك لإدارة مواعيدك وروشتاتك بسهولة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm shadow-md transition-colors active:scale-[0.98] cursor-pointer shrink-0"
              >
                <User className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
            </div>
          </div>
        )}

        {/* ============ QUICK ACTIONS ============ */}
        {user ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <QuickAction
              icon={Calendar}
              label="مواعيدي"
              hint={`${appointments.length} موعد`}
              active={activeTab === 'appointments'}
              onClick={() => setActiveTab('appointments')}
              accent="teal"
            />
            <QuickAction
              icon={ImageIcon}
              label="روشتاتي"
              hint={prescriptionCount ? `${prescriptionCount} روشتة` : 'لا يوجد'}
              active={activeTab === 'prescriptions'}
              onClick={() => setActiveTab('prescriptions')}
              accent="coral"
            />
            <QuickAction
              icon={FileText}
              label="سجل الكشوفات"
              hint={recordsCount ? `${recordsCount} تقرير` : 'لا يوجد'}
              active={activeTab === 'records'}
              onClick={() => setActiveTab('records')}
              accent="blue"
            />
            <QuickAction
              icon={User}
              label="بياناتي الشخصية"
              hint="تعديل الحساب"
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              accent="slate"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs hover:border-[#E05A47]/40 transition-colors text-right cursor-pointer"
            >
              <span className="w-11 h-11 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">تسجيل الدخول لحسابي</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lookup')}
              className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs hover:border-[#E05A47]/40 transition-colors text-right cursor-pointer"
            >
              <span className="w-11 h-11 rounded-xl bg-[#E05A47] text-white flex items-center justify-center shrink-0">
                <Search className="w-5 h-5" />
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">الاستعلام عن موعد</span>
            </button>
          </div>
        )}

        {/* ============ SECTION TITLE ============ */}
        {user && activeTab !== 'lookup' && (
          <div className="flex items-center gap-2 pt-1">
            <span className="w-1.5 h-6 rounded-full bg-[#E05A47]" aria-hidden />
            <h2 className="text-base sm:text-lg font-extrabold text-[#0E3847] dark:text-white">
              {TABS[activeTab].label}
            </h2>
          </div>
        )}

        {/* ============ TAB: GUEST LOOKUP ============ */}
        {activeTab === 'lookup' && (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs">
            <div className="max-w-md mx-auto space-y-5">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0E3847] dark:bg-teal-700 text-white flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <h2 className="text-sm font-bold text-[#0E3847] dark:text-white">
                  الاستعلام عن تفاصيل الموعد برقم الحجز
                </h2>
              </div>
              <form onSubmit={handleLookupSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الحجز المرجعي (Booking Ref)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: HM-749213"
                    value={lookupCode}
                    onChange={e => setLookupCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47] text-center font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الهاتف المسجل في الحجز
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01100171817"
                    value={lookupPhone}
                    onChange={e => setLookupPhone(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47] text-center"
                    dir="ltr"
                  />
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="w-full py-3.5 rounded-2xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
                >
                  {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {lookupLoading ? 'جاري البحث...' : 'استعلام عن الموعد'}
                </button>
              </form>

              {lookupError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              {lookedUpApt && (
                <div className="motion-safe:animate-in motion-safe:fade-in duration-300 p-4 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#17424C]">
                    <div>
                      <span className="text-xs text-slate-400 block">رقم الحجز</span>
                      <span className="text-sm font-bold font-mono text-[#E05A47]">
                        {lookedUpApt.bookingNumber}
                      </span>
                    </div>
                    <StatusBadge status={lookedUpApt.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><strong className="text-slate-400 block mb-0.5">المريض:</strong> <span className="text-slate-700 dark:text-slate-100">{lookedUpApt.patientName}</span></div>
                    <div><strong className="text-slate-400 block mb-0.5">الفرع:</strong> <span className="text-slate-700 dark:text-slate-100">{lookedUpApt.branchName}</span></div>
                    <div><strong className="text-slate-400 block mb-0.5">التاريخ:</strong> <span className="text-slate-700 dark:text-slate-100">{formatArabicDate(lookedUpApt.appointmentDate)}</span></div>
                    <div><strong className="text-slate-400 block mb-0.5">الوقت:</strong> <span className="text-[#E05A47] font-bold">{formatArabicTime(lookedUpApt.appointmentTime)}</span></div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-[#17424C]">
                    <CalendarExportButton appointment={lookedUpApt} />
                    {lookedUpApt.status !== 'cancelled' && lookedUpApt.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetApt(lookedUpApt);
                          setCancelModalOpen(true);
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold cursor-pointer"
                      >
                        طلب إلغاء الموعد
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ TAB: APPOINTMENTS ============ */}
        {activeTab === 'appointments' && user && (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300 space-y-4">
            {loading ? (
              <LoadingSpinner message="جاري تحميل مواعيدك..." />
            ) : aptError ? (
              <div className="p-5 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300">{aptError}</p>
                <button
                  type="button"
                  onClick={fetchPatientData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> إعادة المحاولة
                </button>
              </div>
            ) : appointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="لا توجد مواعيد مسجلة حتى الآن"
                description="يمكنك حجز موعد كشف جديد بكل سهولة واختيار الفرع المناسب."
                action={{
                  label: 'احجز كشف طبي الآن',
                  onClick: () => onNavigate('booking'),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map(apt => (
                  <React.Fragment key={apt.id}>
                    <AppointmentCard
                      apt={apt}
                      onCancel={() => {
                        setTargetApt(apt);
                        setCancelModalOpen(true);
                      }}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ TAB: MEDICAL RECORDS ============ */}
        {activeTab === 'records' && user && (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300 space-y-4">
            {loading ? (
              <LoadingSpinner message="جاري تحميل السجل الطبي..." />
            ) : recordsCount === 0 ? (
              <EmptyState
                icon={FileText}
                title="لا توجد تقارير أو كشوفات سابقة مكتملة"
                description="ستظهر هنا تشخيصات الكشف والملاحظات الطبية بعد إتمام الزيارة بالعيادة."
              />
            ) : (
              <div className="space-y-3">
                {appointments
                  .filter(a => a.status === 'completed' || a.clinicInternalNotes)
                  .map(apt => (
                    <div
                      key={apt.id}
                      className="surface-card p-5 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#17424C]">
                        <div>
                          <span className="text-xs text-slate-400 block mb-0.5">
                            {formatArabicDate(apt.appointmentDate)} — {apt.branchName}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {apt.serviceName || 'كشف عظام ومفاصل'}
                          </h3>
                        </div>
                        <StatusBadge status={apt.status} size="sm" />
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <strong className="text-slate-500 dark:text-slate-400 ml-1">كود الحجز:</strong>
                          <span className="font-mono text-[#E05A47]">{apt.bookingNumber}</span>
                        </div>

                        {apt.clinicInternalNotes && (
                          <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-[#123842] border border-teal-100 dark:border-[#1F4E5A] text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
                            <strong>ملاحظات وتشخيص العيادة: </strong>
                            {apt.clinicInternalNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ============ TAB: PROFILE ============ */}
        {activeTab === 'profile' && user && (
          <form
            onSubmit={handleProfileSave}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300 p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-5"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#0E3847] dark:bg-teal-700 text-white flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#0E3847] dark:text-white">تحديث البيانات الشخصية</h2>
                <p className="text-[11px] text-slate-400">يمكنك تعديل بياناتك في أي وقت.</p>
              </div>
            </div>

            {profSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الاسم بالكامل
                </label>
                <input
                  type="text"
                  required
                  value={profName}
                  onChange={e => setProfName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  required
                  value={profPhone}
                  onChange={e => setProfPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={profEmail}
                  onChange={e => setProfEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    النوع
                  </label>
                  <select
                    value={profGender}
                    onChange={e => setProfGender(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    العمر
                  </label>
                  <input
                    type="number"
                    value={profAge}
                    onChange={e => setProfAge(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs sm:text-sm shadow-md transition-colors cursor-pointer active:scale-[0.98]"
              >
                حفظ التعديلات
              </button>
            </div>
          </form>
        )}

        {/* ============ TAB: PRESCRIPTIONS ============ */}
        {activeTab === 'prescriptions' && user && (
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300">
            <PrescriptionsPanel onCountChange={setPrescriptionCount} />
          </div>
        )}

        {/* ============ CANCEL CONFIRMATION MODAL ============ */}
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="تأكيد إلغاء موعد الكشف"
          maxWidth="sm"
        >
          <div className="space-y-4 text-right" dir="rtl">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              هل أنت متأكد من رغبتك في إلغاء حجز الموعد رقم{' '}
              <strong className="font-mono text-[#E05A47]">{targetApt?.bookingNumber}</strong> بتاريخ{' '}
              {targetApt && formatArabicDate(targetApt.appointmentDate)}؟
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سبب الإلغاء (اختياري)
              </label>
              <input
                type="text"
                placeholder="مثال: تغيير الموعد، ظرف طارئ..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
              >
                تراجع
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                {cancelling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
  );
};

// ----------------------------------------------------
// Quick action tile
// ----------------------------------------------------
const ACCENTS: Record<string, string> = {
  teal: 'bg-[#0E3847] dark:bg-teal-700 text-white',
  coral: 'bg-[#E05A47] text-white',
  blue: 'bg-blue-500 text-white',
  slate: 'bg-slate-500 text-white',
};

function QuickAction({
  icon: Icon,
  label,
  hint,
  active,
  onClick,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  accent: 'teal' | 'coral' | 'blue' | 'slate';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex flex-col gap-3 rounded-3xl p-4 text-right border transition-all duration-200 active:scale-[0.98] cursor-pointer bg-white dark:bg-[#10333C] ${
        active
          ? 'border-[#E05A47] ring-2 ring-[#E05A47]/20 shadow-md'
          : 'border-slate-200/80 dark:border-[#17424C] shadow-2xs hover:border-[#E05A47]/40'
      }`}
    >
      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${ACCENTS[accent]}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{label}</div>
        <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{hint}</div>
      </div>
      {active && (
        <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-[#E05A47]" aria-hidden />
      )}
    </button>
  );
}

// ----------------------------------------------------
// Appointment card — compact, scannable, mobile-friendly
// ----------------------------------------------------
function AppointmentCard({ apt, onCancel }: { apt: Appointment; onCancel: () => void }) {
  const parts = getDateParts(apt.appointmentDate);
  return (
    <div className="surface-card flex gap-3 p-4 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C]">
      <div className="shrink-0 w-16 rounded-2xl bg-[#0E3847] dark:bg-[#123842] text-white flex flex-col items-center justify-center py-2.5">
        <span className="text-lg font-extrabold leading-none">{parts.day}</span>
        <span className="text-[10px] text-slate-300 mt-0.5">{parts.month}</span>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#153E48] text-slate-600 dark:text-slate-200">
            {apt.bookingNumber}
          </span>
          <StatusBadge status={apt.status} size="sm" />
        </div>

        <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate">
          {apt.serviceName || 'كشف عظام واستشارة'}
        </h3>

        <div className="mt-2 space-y-1.5 text-xs text-slate-500 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0E3847] dark:text-teal-300 shrink-0" />
            <span className="truncate">{apt.branchName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#E05A47] shrink-0" />
            <span className="font-bold text-[#E05A47]">{formatArabicTime(apt.appointmentTime)}</span>
            <span className="text-slate-400">· {parts.weekday}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#17424C] flex items-center justify-between gap-2">
          <CalendarExportButton appointment={apt} />
          {apt.status !== 'cancelled' && apt.status !== 'completed' && (
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline cursor-pointer"
            >
              إلغاء الموعد
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Prescriptions panel — Digital Prescription Storage (patient side)
// ----------------------------------------------------
function PrescriptionsPanel({
  onCountChange,
}: {
  onCountChange: (n: number) => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [list, setList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const [viewRx, setViewRx] = useState<Prescription | null>(null);
  const [deleteRx, setDeleteRx] = useState<Prescription | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.getPatientPrescriptions();
      if (r.success) {
        setList(r.data || []);
        onCountChange(r.data?.length || 0);
      } else {
        setError('تعذر تحميل الروشتات.');
      }
    } catch (e: any) {
      setError(e.message || 'فشل تحميل الروشتات.');
    } finally {
      setLoading(false);
    }
  }, [user, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) {
      toast.push({ kind: 'error', title: 'صيغة غير مدعومة', description: 'استخدم ملف JPG أو PNG أو WEBP.' });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.push({ kind: 'error', title: 'الحجم كبير جداً', description: 'الحد الأقصى لحجم الصورة 10 ميجابايت.' });
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setNote('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file || !preview) {
      toast.push({ kind: 'error', title: 'اختر صورة', description: 'يرجى اختيار صورة الروشتة أولاً.' });
      return;
    }
    setUploading(true);
    try {
      const r = await api.createPrescription({ image: preview, note: note.trim() });
      if (r.success) {
        toast.push({ kind: 'success', title: 'تم الحفظ', description: 'تم حفظ الروشتة في حسابك.' });
        if (r.data.provider === 'freeimage') {
          toast.push({ kind: 'info', title: 'تم الرفع عبر خادم بديل', description: 'تعذّر الرفع عبر الخادم الأساسي، تم الحفظ عبر خادم احتياطي.' });
        }
        resetForm();
        load();
      } else {
        toast.push({ kind: 'error', title: 'فشل الحفظ', description: r.message });
      }
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل رفع الصورة', description: e.message || 'تعذّر رفع الصورة، يمكنك المحاولة مجدداً.' });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRx) return;
    setDeleting(true);
    try {
      const r = await api.deletePrescription(deleteRx.id);
      if (r.success) {
        toast.push({ kind: 'success', title: 'تم حذف الروشتة' });
        setList(prev => prev.filter(x => x.id !== deleteRx.id));
        onCountChange(list.length - 1);
        setDeleteRx(null);
      } else {
        toast.push({ kind: 'error', title: 'فشل الحذف', description: r.message });
      }
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل الحذف', description: e.message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#0E3847] dark:bg-teal-700 text-white flex items-center justify-center shrink-0">
            <UploadCloud className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[#0E3847] dark:text-white">إضافة روشتة جديدة</h2>
            <p className="text-[11px] text-slate-400">ارفع صورة الروشتة واضافة ملاحظة اختيارية.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-full sm:w-44 h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-[#1F4E5A] bg-slate-50 dark:bg-[#123842] hover:border-[#E05A47] transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-400 overflow-hidden shrink-0"
          >
            {preview ? (
              <img src={preview} alt="معاينة الروشتة" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <ImageIcon className="w-7 h-7" />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 text-center px-2">اضغط لاختيار صورة الروشتة</span>
                <span className="text-[10px] text-slate-400">JPG · PNG · WEBP</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ملاحظات على الروشتة (اختياري)
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="مثال: نوع العلاج، سبب الروشتة، اسم الطبيب..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47] resize-none"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-60 active:scale-[0.98]"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {uploading ? 'جاري الرفع...' : 'حفظ الروشتة'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner message="جاري تحميل روشتاتك..." />
      ) : error ? (
        <div className="p-5 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300">{error}</p>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </button>
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="لا توجد روشتات محفوظة"
          description="يمكنك حفظ صورة أي روشتة هنا لتكون متاحة بأمان في حسابك في أي وقت."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(rx => (
            <div
              key={rx.id}
              className="rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs overflow-hidden flex flex-col"
            >
              <button
                type="button"
                onClick={() => setViewRx(rx)}
                className="block w-full h-44 bg-slate-100 dark:bg-[#0E2C33] overflow-hidden cursor-pointer"
                aria-label="عرض الروشتة"
              >
                <img
                  src={rx.imageUrl}
                  alt="روشتة"
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </button>

              <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-[#E05A47] shrink-0" />
                  <span className="font-bold text-[#E05A47]">{formatPrescriptionDateTime(rx.createdAt)}</span>
                </div>

                {rx.note && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 bg-slate-50 dark:bg-[#123842] rounded-xl p-2.5">
                    {rx.note}
                  </p>
                )}

                <div className="pt-1 mt-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewRx(rx)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    <Eye className="w-3.5 h-3.5" /> عرض
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteRx(rx)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Viewer modal */}
      <Modal isOpen={!!viewRx} onClose={() => setViewRx(null)} title="عرض الروشتة" maxWidth="2xl">
        {viewRx && (
          <div className="space-y-4 text-right" dir="rtl">
            <div className="max-h-[60vh] overflow-auto rounded-2xl bg-slate-100 dark:bg-[#0E2C33] flex items-center justify-center">
              <img src={viewRx.imageUrl} alt="روشتة" className="max-w-full max-h-[60vh] object-contain" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">تاريخ الإضافة</span>
                <span className="font-bold text-[#E05A47]">{formatPrescriptionDateTime(viewRx.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">مزوّد الرفع</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{viewRx.provider === 'imgbb' ? 'ImgBB' : 'FreeImage'}</span>
              </div>
            </div>
            {viewRx.note && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                <strong className="text-slate-500 dark:text-slate-400 ml-1">الملاحظات:</strong>
                {viewRx.note}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal isOpen={!!deleteRx} onClose={() => setDeleteRx(null)} title="حذف الروشتة" maxWidth="sm">
        <div className="space-y-4 text-right" dir="rtl">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            هل أنت متأكد من حذف هذه الروشتة؟ لا يمكن التراجع بعد الحذف.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeleteRx(null)}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
            >
              تراجع
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
