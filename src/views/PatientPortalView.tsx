import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Appointment } from '../types/index.ts';
import { api } from '../services/api.ts';
import { formatArabicDate, formatArabicTime } from '../utils/date.ts';
import { StatusBadge } from '../components/common/StatusBadge.tsx';
import { CalendarExportButton } from '../components/common/CalendarExportButton.tsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import { EmptyState } from '../components/common/EmptyState.tsx';
import { Modal } from '../components/common/Modal.tsx';
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Search,
} from 'lucide-react';

interface PatientPortalViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const PatientPortalView: React.FC<PatientPortalViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'appointments' | 'records' | 'profile' | 'lookup'>(
    user ? 'appointments' : 'lookup'
  );

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

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
    try {
      const aptsRes = await api.getPatientAppointments();
      if (aptsRes.success && aptsRes.data) {
        setAppointments(aptsRes.data);
      }
    } catch (err) {
      console.error(err);
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
        if (user) {
          fetchPatientData();
        } else if (lookedUpApt) {
          setLookedUpApt(prev => (prev ? { ...prev, status: 'cancelled' } : null));
        }
      } else {
        alert(res.message || 'تعذر إلغاء الحجز.');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الإلغاء.');
    } finally {
      setCancelling(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfSuccess('تم حفظ التعديلات بنجاح في ملفك الشخصي.');
    setTimeout(() => setProfSuccess(null), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-[#0E3847] text-white shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47]">
            <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
            <span>بوابة المريض</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {user ? `أهلاً بك، ${user.name}` : 'متابعة المواعيد والملف الطبي'}
          </h1>
          <p className="text-xs text-slate-300">
            {user
              ? 'متابعة مواعيدك القادمة، تحميل تفاصيل الكشوفات، وإدارة بياناتك.'
              : 'استعلم عن حجزك برقم الحجز ورقم الهاتف، أو سجل دخولك لإدارة حسابك.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <button
              type="button"
              onClick={() => onNavigate('booking')}
              className="px-4 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>حجز موعد جديد</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-xl bg-slate-100 dark:bg-[#10333C] p-1 gap-1 border border-transparent dark:border-[#17424C]">
        {user ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('appointments')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'appointments'
                  ? 'bg-white dark:bg-[#123842] text-[#0E3847] dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>مواعيدي ({appointments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('records')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-white dark:bg-[#123842] text-[#0E3847] dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>سجل الكشوفات ({appointments.filter(a => a.status === 'completed' || a.clinicInternalNotes).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#123842] text-[#0E3847] dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>بياناتي الشخصية</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('lookup')}
            className="flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-white dark:bg-[#123842] text-[#0E3847] dark:text-white shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>الاستعلام السريع عن موعد برقم الحجز</span>
          </button>
        )}
      </div>

      {/* TAB 1: GUEST LOOKUP */}
      {activeTab === 'lookup' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-6">
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-sm font-bold text-[#0E3847] dark:text-white text-center">
              الاستعلام عن تفاصيل الموعد برقم الحجز
            </h2>
            <form onSubmit={handleLookupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الحجز المرجعي (Booking Ref)
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: HM-749213"
                  value={lookupCode}
                  onChange={e => setLookupCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47] text-center font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف المسجل في الحجز
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01100171817"
                  value={lookupPhone}
                  onChange={e => setLookupPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47] text-center"
                  dir="ltr"
                />
              </div>
              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-3 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                {lookupLoading ? 'جاري البحث...' : 'استعلام عن الموعد'}
              </button>
            </form>

            {lookupError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            {lookedUpApt && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#17424C]">
                  <div>
                    <span className="text-xs text-slate-400 block">رقم الحجز</span>
                    <span className="text-sm font-bold font-mono text-[#E05A47]">
                      {lookedUpApt.bookingNumber}
                    </span>
                  </div>
                  <StatusBadge status={lookedUpApt.status} />
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div><strong className="text-slate-400 block">المريض:</strong> {lookedUpApt.patientName}</div>
                  <div><strong className="text-slate-400 block">الفرع:</strong> {lookedUpApt.branchName}</div>
                  <div><strong className="text-slate-400 block">التاريخ:</strong> {formatArabicDate(lookedUpApt.appointmentDate)}</div>
                  <div><strong className="text-slate-400 block">الوقت:</strong> <span className="text-[#E05A47] font-bold">{formatArabicTime(lookedUpApt.appointmentTime)}</span></div>
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

      {/* TAB 2: APPOINTMENTS LIST */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {loading ? (
            <LoadingSpinner message="جاري تحميل مواعيدك..." />
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
              {(appointments || []).map(apt => (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#153E48] text-slate-700 dark:text-slate-200">
                        {apt.bookingNumber}
                      </span>
                      <StatusBadge status={apt.status} />
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {apt.serviceName || 'كشف عظام واستشارة'}
                    </h3>

                    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>{apt.branchName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                        <span>{formatArabicDate(apt.appointmentDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#E05A47] shrink-0" />
                        <span className="font-bold text-[#E05A47]">
                          {formatArabicTime(apt.appointmentTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-[#17424C] flex items-center justify-between gap-2">
                    <CalendarExportButton appointment={apt} />

                    {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetApt(apt);
                          setCancelModalOpen(true);
                        }}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        إلغاء الموعد
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEDICAL RECORDS */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          {appointments.filter(a => a.status === 'completed' || a.clinicInternalNotes).length === 0 ? (
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
                    className="p-5 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#17424C]">
                      <div>
                        <span className="text-xs text-slate-400 block">
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
                        <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-[#123842] border border-teal-100 dark:border-[#1F4E5A] text-xs text-teal-900 dark:text-teal-200">
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

      {/* TAB 4: PROFILE SETTINGS */}
      {activeTab === 'profile' && user && (
        <form
          onSubmit={handleProfileSave}
          className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-5"
        >
          <h2 className="text-sm font-bold text-[#0E3847] dark:text-white">
            تحديث البيانات الشخصية
          </h2>

          {profSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الاسم بالكامل
              </label>
              <input
                type="text"
                required
                value={profName}
                onChange={e => setProfName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                required
                value={profPhone}
                onChange={e => setProfPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={profEmail}
                onChange={e => setProfEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  النوع
                </label>
                <select
                  value={profGender}
                  onChange={e => setProfGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  العمر
                </label>
                <input
                  type="number"
                  value={profAge}
                  onChange={e => setProfAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      )}

      {/* Cancel Confirmation Modal */}
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              سبب الإلغاء (اختياري)
            </label>
            <input
              type="text"
              placeholder="مثال: تغيير الموعد، ظرف طارئ..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            >
              تراجع
            </button>
            <button
              type="button"
              disabled={cancelling}
              onClick={handleConfirmCancel}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              {cancelling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
