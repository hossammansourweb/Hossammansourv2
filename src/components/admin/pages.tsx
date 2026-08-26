import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Users as UsersIcon,
  Plus,
  Phone,
  Stethoscope,
  FileEdit,
  Minus,
  Eye,
  Building2,
  Clock as ClockIcon,
  TrendingUp,
  BadgeCheck,
  UserCog,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useAdminCtx } from './shell.tsx';
import { formatArabicDate, formatArabicTime, formatTime12h, getTodayDateString, getDayOfWeekArabic, formatPrescriptionDateTime } from '../../utils/date.ts';
import type {
  Appointment,
  Branch,
  MedicalService,
  WorkingHourRule,
  ScheduleException,
  DoctorProfile,
  Review,
  FAQItem,
  Announcement,
  User,
  DashboardStats,
  AdminPrescription,
} from '../../types/index.ts';
import {
  StatCard,
  SearchBar,
  FilterBar,
  StatusBadge,
  Pill,
  Stars,
  ConfirmDialog,
  FormModal,
  FormField,
  inputCls,
  selectCls,
  DataTable,
  LoadingState,
  ErrorState,
  EmptyState,
  Pagination,
  DropdownMenu,
  useToast,
  ViewAppointmentModal,
  HistoryModal,
  BranchModal,
  ServiceModal,
  ExceptionModal,
  AnnouncementModal,
  FaqModal,
  UserModal,
} from './ui.tsx';
import { Modal } from '../common/Modal.tsx';

type Toast = ReturnType<typeof useToast>;

function money(n: number | undefined | null): string {
  const num = Number(n) || 0;
  return num.toLocaleString('ar-EG');
}

/* ============================================================
   DASHBOARD
   ============================================================ */
export function Dashboard() {
  const toast = useToast();
  const { navigate } = useAdminCtx();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getDashboardStats();
      if (r.success) {
        setStats(r.data);
        setError(null);
      } else {
        // Handle API error response with message
        setError(r.message || 'فشل في جلب البيانات');
        setStats(null);
      }
    } catch (e: any) {
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  void toast;

  if (loading) return <LoadingState label="جاري تحميل المؤشرات..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  const s = stats || ({} as DashboardStats);

  return (
    <div>
      {/* First section: Quick Actions */}
      <div className="surface-card rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-tajawal">إجراءات سريعة</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">وصول مباشر للأقسام الأكثر استخداماً</p>
          </div>
          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">الوصول السريع</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <QuickAction label="الحجوزات" hint="إدارة المواعيد" icon={Calendar} tone="teal" onClick={() => navigate('appointments')} />
          <QuickAction label="المرضى" hint="الملفات والسجلات" icon={UsersIcon} tone="emerald" onClick={() => navigate('patients')} />
          <QuickAction label="الخدمات" hint="الأسعار والتخصصات" icon={Stethoscope} tone="amber" onClick={() => navigate('services')} />
          <QuickAction label="الفروع" hint="العناوين والمواعيد" icon={Building2} tone="slate" onClick={() => navigate('branches')} />
          <QuickAction label="مواعيد العمل" hint="الإجازات والاستثناءات" icon={ClockIcon} tone="teal" onClick={() => navigate('working-hours')} />
          <QuickAction label="محتوى الموقع" hint="الإعلانات والتقييمات" icon={FileEdit} tone="coral" onClick={() => navigate('cms')} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="مواعيد اليوم" value={s.todayBookings ?? 0} hint={formatArabicDate(getTodayDateString())} icon={Calendar} tone="teal" />
        <StatCard label="مواعيد الأسبوع" value={s.weeklyBookings ?? 0} icon={TrendingUp} tone="emerald" />
        <StatCard label="حالات مكتملة" value={s.completedBookings ?? 0} icon={BadgeCheck} tone="emerald" />
        <StatCard label="إجمالي المرضى" value={s.totalPatients ?? 0} hint={`نسبة الحضور ${s.attendanceRate ?? 0}%`} icon={UsersIcon} tone="coral" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MiniStat label="حجوزات جديدة" value={s.newBookings ?? 0} cls="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200" />
        <MiniStat label="مؤكدة" value={s.confirmedBookings ?? 0} cls="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200" />
        <MiniStat label="ملغاة" value={s.cancelledBookings ?? 0} cls="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200" />
        <MiniStat label="تم الكشف" value={s.completedBookings ?? 0} cls="bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200" />
      </div>

      <WidgetBox title="توزيع المواعيد حسب الفرع">
        {!Array.isArray(s.branchBreakdown) || s.branchBreakdown.length === 0 ? (
          <EmptyState title="لا بيانات" description="لا توجد مواعيد بعد لمحاولة التوزيع." />
        ) : (
          <div className="space-y-3">
            {s.branchBreakdown.map(b => (
              <div key={b.branchName} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 w-28 truncate">{b.branchName}</span>
                <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-[#123842] overflow-hidden">
                  <div className="h-full rounded-full bg-teal-500 dark:bg-teal-400" style={{ width: `${barWidth(b.count, s.branchBreakdown)}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-8 text-left">{b.count}</span>
              </div>
            ))}
          </div>
        )}
      </WidgetBox>
    </div>
  );
}

function MiniStat({ label, value, cls }: { label: string; value: React.ReactNode; cls: string }) {
  return (
    <div className={`p-3.5 rounded-2xl border ${cls} border-transparent`}>
      <span className="text-[11px] font-bold block">{label}</span>
      <span className="text-xl font-extrabold">{value}</span>
    </div>
  );
}
function WidgetBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card rounded-2xl p-5">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}
function QuickAction({ label, icon: Icon, onClick, hint, tone = 'teal' }: { label: string; icon: React.ElementType; onClick: () => void; hint?: string; tone?: 'teal' | 'coral' | 'emerald' | 'amber' | 'slate' }) {
  const toneCls: Record<string, string> = {
    teal: 'from-teal-500/15 to-teal-500/0 text-teal-700 dark:text-teal-300 group-hover:from-teal-500/25',
    coral: 'from-[#E05A47]/15 to-[#E05A47]/0 text-[#E05A47] dark:text-[#f27463] group-hover:from-[#E05A47]/25',
    emerald: 'from-emerald-500/15 to-emerald-500/0 text-emerald-700 dark:text-emerald-300 group-hover:from-emerald-500/25',
    amber: 'from-amber-500/15 to-amber-500/0 text-amber-700 dark:text-amber-300 group-hover:from-amber-500/25',
    slate: 'from-slate-500/10 to-slate-500/0 text-slate-700 dark:text-slate-300 group-hover:from-slate-500/20',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden flex flex-col items-start gap-2 p-4 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#1E4F5A] hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md text-slate-800 dark:text-slate-100 cursor-pointer transition-all"
    >
      <span className={`absolute inset-0 bg-gradient-to-br ${toneCls[tone]} opacity-100 transition-opacity`} aria-hidden />
      <span className="relative w-10 h-10 rounded-xl bg-white dark:bg-[#123842] border border-slate-200/70 dark:border-[#1E4F5A] flex items-center justify-center shadow-xs">
        <Icon className="w-5 h-5" />
      </span>
      <span className="relative text-sm font-extrabold">{label}</span>
      {hint && <span className="relative text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>}
    </button>
  );
}
function barWidth(count: number, arr: { branchName: string; count: number }[]): number {
  const max = Math.max(1, ...arr.map(b => b.count || 0));
  return Math.round((count / max) * 100);
}

/* ============================================================
   APPOINTMENTS
   ============================================================ */
export function Appointments() {
  const toast = useToast();
  const [data, setData] = useState<Appointment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [branch, setBranch] = useState('all');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;
  const [viewing, setViewing] = useState<Appointment | null>(null);
  const [statusModal, setStatusModal] = useState<Appointment | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [a, b, s] = await Promise.all([api.getAdminAppointments(), api.getAdminBranches(), api.getAdminServices()]);
      setData(a.success ? a.data : []);
      setBranches(b.success ? b.data : []);
      setServices(s.success ? s.data : []);
      if (!a.success) setError(a.message);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [search, status, branch, date]);

  const filtered = data.filter(ap => {
    const q = search.toLowerCase();
    const mSearch = !q || ap.patientName.toLowerCase().includes(q) || ap.patientPhone.includes(q) || ap.bookingNumber.toLowerCase().includes(q);
    const mStatus = status === 'all' || ap.status === status;
    const mBranch = branch === 'all' || ap.branchId === branch;
    const mDate = !date || ap.appointmentDate === date;
    return mSearch && mStatus && mBranch && mDate;
  });
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteAppointment(confirmDelete.id);
      toast.push({ kind: 'success', title: 'تم حذف الموعد', description: 'تم حذف الموعد بشكل دائم من النظام.' });
      setConfirmDelete(null); setViewing(null); load();
    } catch (e: any) { toast.push({ kind: 'error', title: 'فشل الحذف', description: e.message }); }
    finally { setDeleting(false); }
  };

  const doStatusChange = async () => {
    if (!statusModal || !selectedStatus) return;
    setStatusUpdating(true);
    try {
      await api.updateAppointmentStatus(statusModal.id, selectedStatus, `تغيير الحالة إلى ${selectedStatus} بواسطة الإدارة`);
      toast.push({ kind: 'success', title: 'تم تحديث الحالة', description: `تغيير حالة الحجز إلى ${selectedStatus}` });
      setStatusModal(null); setSelectedStatus(''); load();
    } catch (e: any) { toast.push({ kind: 'error', title: 'فشل تحديث الحالة', description: e.message }); }
    finally { setStatusUpdating(false); }
  };

  return (
    <div>
      <div className="surface-card rounded-2xl p-4 mb-4">
        <div className="flex flex-col gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث بالاسم، الهاتف، أو كود الحجز..." />
          <div className="flex flex-wrap items-end gap-3">
            <FilterBar
              onReset={() => { setStatus('all'); setBranch('all'); setDate(''); setSearch(''); setPage(1); }}
              filters={[
                { id: 'status', label: 'الحالة', value: status, onChange: setStatus, options: [
                  { v: 'all', label: 'كل الحالات' }, { v: 'new', label: 'حجز جديد' }, { v: 'confirmed', label: 'مؤكد' }, { v: 'checked_in', label: 'حضر' }, { v: 'completed', label: 'تم الكشف' }, { v: 'cancelled', label: 'ملغي' }, { v: 'no_show', label: 'لم يحضر' },
                ] },
                { id: 'branch', label: 'الفرع', value: branch, onChange: setBranch, options: [{ v: 'all', label: 'كل الفروع' }, ...branches.map(b => ({ v: b.id, label: b.name }))] },
                { id: 'date', label: 'التاريخ', value: date, onChange: setDate, options: [{ v: '', label: 'كل التواريخ' }, { v: getTodayDateString(), label: 'اليوم' }] },
              ]}
            />
            <div className="md:hidden flex items-center gap-1 bg-slate-100 dark:bg-[#123842] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setMobileView('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${mobileView === 'cards' ? 'bg-white dark:bg-[#1E4F5A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                بطاقات
              </button>
              <button
                type="button"
                onClick={() => setMobileView('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${mobileView === 'table' ? 'bg-white dark:bg-[#1E4F5A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                جدول
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <LoadingState label="جارِ تحميل المواعيد..." /> : error ? <ErrorState message={error} onRetry={load} /> :
        data.length === 0 ? <EmptyState icon={Calendar} title="لا توجد مواعيد" description="لم يتم تسجيل أي مواعيد بعد." /> :
        filtered.length === 0 ? <EmptyState title="لا نتائج" description="غيِّر معايير البحث أو الفلتر." /> : (
          <>
            {/* Mobile: Card View */}
            <div className={`${mobileView === 'cards' ? 'block' : 'hidden'} md:hidden space-y-3`}>
              {visible.map(a => (
                <div key={a.id} className="surface-card rounded-2xl p-4 border-r-4 border-r-teal-500 dark:border-r-teal-400">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">{a.patientName}</span>
                      <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 block">{a.bookingNumber}</span>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> <span dir="ltr">{a.patientPhone}</span></span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-400" /> {formatArabicDate(a.appointmentDate)}</span>
                    <span className="flex items-center gap-1.5"><ClockIcon className="w-3 h-3 text-slate-400" /> {formatArabicTime(a.appointmentTime)}</span>
                    <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-slate-400" /> {a.branchName || '—'}</span>
                  </div>
                  {a.serviceName && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">{a.serviceName}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-[#1E4F5A]">
                    <button
                      type="button"
                      onClick={() => setViewing(a)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> عرض
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedStatus(a.status); setStatusModal(a); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" /> حالة
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(a)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" /> حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table + Mobile Table (when table view selected) */}
            <div className={`${mobileView === 'table' ? 'block' : 'hidden'} md:block`}>
              <DataTable columns={[
                { header: 'كود الحجز', render: (a: Appointment) => <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{a.bookingNumber}</span> },
                { header: 'المريض', render: (a: Appointment) => <span className="font-bold">{a.patientName}</span> },
                { header: 'الهاتف', render: (a: Appointment) => <span dir="ltr" className="font-mono">{a.patientPhone}</span> },
                { header: 'الخدمة', render: (a: Appointment) => <span className="text-slate-500 dark:text-slate-400">{a.serviceName || '—'}</span> },
                { header: 'الفرع', render: (a: Appointment) => <span>{a.branchName || '—'}</span> },
                { header: 'الموعد', render: (a: Appointment) => <div><span className="text-slate-500 dark:text-slate-400 text-[11px] block">{formatArabicDate(a.appointmentDate)}</span><span className="font-bold text-teal-600 dark:text-teal-400">{formatArabicTime(a.appointmentTime)}</span></div> },
                { header: 'الحالة', render: (a: Appointment) => <StatusBadge status={a.status} /> },
              ]} rows={visible}
                onRowClick={setViewing}
                actions={(a) => (
                  <div onClick={e => e.stopPropagation()}>
                    <DropdownMenu align="left" items={[
                      { label: 'عرض التفاصيل', icon: Eye, onClick: () => setViewing(a) },
                      { label: 'تعديل الحالة', icon: FileEdit, onClick: () => { setSelectedStatus(a.status); setStatusModal(a); } },
                      { label: 'حذف', icon: Minus, onClick: () => setConfirmDelete(a), danger: true },
                    ]} />
                  </div>
                )}
              />
            </div>
            <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
          </>
        )}

      <ViewAppointmentModal open={!!viewing} appointment={viewing} loading={false}
        onClose={() => setViewing(null)}
        onChangeStatus={(a) => { setSelectedStatus(a.status); setStatusModal(a); }}
        onDelete={(a) => setConfirmDelete(a)}
        onChanged={(a) => { setViewing(null); load(); toast.push({ kind: 'success', title: 'تم تحديث الحالة' }); void a; }} />

      {/* Status Change Modal */}
      <ConfirmDialog open={!!statusModal} title="تعديل حالة الحجز" confirmLabel="حفظ"
        description={statusModal ? <>
          <p className="mb-3">تغيير حالة الحجز للمريض <b>{statusModal.patientName}</b> (كود {statusModal.bookingNumber}):</p>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1E4F5A] text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="new">حجز جديد</option>
            <option value="confirmed">مؤكد</option>
            <option value="checked_in">حضر</option>
            <option value="completed">تم الكشف</option>
            <option value="cancelled">ملغي</option>
            <option value="no_show">لم يحضر</option>
          </select>
        </> : null}
        loading={statusUpdating} onConfirm={doStatusChange} onClose={() => { setStatusModal(null); setSelectedStatus(''); }} />

      <ConfirmDialog open={!!confirmDelete} title="حذف الموعد" danger confirmLabel="حذف"
        description={confirmDelete ? <>هل تريد حذف موعد <b>{confirmDelete.patientName}</b> (كود {confirmDelete.bookingNumber})؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.</> : null}
        loading={deleting} onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />
      <span className="hidden">{services.length}</span>
    </div>
  );
}

const statusFilter = [
  { v: 'all', label: 'كل الحالات' }, { v: 'new', label: 'حجز جديد' }, { v: 'confirmed', label: 'مؤكد' }, { v: 'checked_in', label: 'حضر' }, { v: 'completed', label: 'تم الكشف' }, { v: 'cancelled', label: 'ملغي' }, { v: 'no_show', label: 'لم يحضر' },
];

const columns = [
  { title: 'كود الحجز', render: (a: Appointment) => <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{a.bookingNumber}</span> },
  { title: 'المريض', render: (a: Appointment) => <span className="font-bold">{a.patientName}</span> },
  { title: 'الهاتف', render: (a: Appointment) => <span dir="ltr" className="font-mono">{a.patientPhone}</span> },
  { title: 'الخدمة', render: (a: Appointment) => <span className="text-slate-500 dark:text-slate-400">{a.serviceName || '—'}</span> },
  { title: 'الفرع', render: (a: Appointment) => <span>{a.branchName || '—'}</span> },
  { title: 'الموعد', render: (a: Appointment) => <div><span className="text-slate-500 dark:text-slate-400 text-[11px] block">{formatArabicDate(a.appointmentDate)}</span><span className="font-bold text-teal-600 dark:text-teal-400">{formatArabicTime(a.appointmentTime)}</span></div> },
  { title: 'الحالة', render: (a: Appointment) => <StatusBadge status={a.status} /> },
];

/* ============================================================
   PATIENTS
   ============================================================ */
export function Patients() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDeactivate, setConfirmDeactivate] = useState<any>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<any>(null);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getAdminPatients();
      if (r.success) setData(r.data); else setError(r.message);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = data.map((p, i) => ({ ...p, id: String(p.phone || i) }));
  const filtered = rows.filter(p => {
    const q = search.toLowerCase();
    return !q || String(p.name || '').toLowerCase().includes(q) || String(p.phone || '').includes(q);
  });

  const openHistory = async (p: any) => {
    setHistoryPatient(p);
    setHistory([]);
    if (!p?.phone) {
      // Guests without a phone have no linked history; skip the API call
      // (otherwise it hits /admin/patients//history and 404s).
      setHistoryLoading(false);
      toast.push({ kind: 'info', title: 'لا يوجد رقم هاتف', description: 'هذا المريض غير مرتبط برقم هاتف لعرض سجله.' });
      return;
    }
    setHistoryLoading(true);
    try {
      const r = await api.getPatientHistory(p.phone);
      setHistory(r.success ? r.data : []);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  };

  const doDeactivate = async () => {
    if (!confirmDeactivate) return;
    setDeactivating(true);
    try {
      if (confirmDeactivate.isRegistered && confirmDeactivate.uid) {
        await api.deactivatePatient(confirmDeactivate.uid);
        toast.push({ kind: 'success', title: 'تم إيقاف تنشيط الحساب' });
      } else {
        toast.push({ kind: 'info', title: 'زائر غير مسجل', description: 'هذا المريض ليس لديه حساب على النظام، لذا لا يمكن تعطيل الحساب.' });
      }
      setConfirmDeactivate(null); load();
    } catch (e: any) { toast.push({ kind: 'error', title: 'فشلت العملية', description: e.message }); }
    finally { setDeactivating(false); }
  };

  // Permanently delete a registered patient (users/{uid} doc). Guest patients
  // (no account) cannot be deleted since the only record of them is the
  // appointment history, which we preserve for the booking record.
  const doDelete = async () => {
    if (!confirmDelete) return;
    if (!confirmDelete.isRegistered || !confirmDelete.uid) {
      toast.push({ kind: 'info', title: 'زائر غير مسجل', description: 'لا يوجد حساب مرتبط بهذا المريض لحذفه.' });
      setConfirmDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await api.deletePatient(confirmDelete.uid);
      toast.push({ kind: 'success', title: 'تم حذف المريض', description: 'تم حذف حساب المريض نهائياً. سجل المواعيد يبقى محفوظاً.' });
      // If the deleted patient is currently open in the history modal, close it
      if (historyPatient && historyPatient.uid === confirmDelete.uid) {
        setHistoryPatient(null);
      }
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل الحذف', description: e?.message || 'حدث خطأ غير متوقع' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="surface-card rounded-2xl p-4 mb-4">
        <div className="flex flex-col gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث عن مريض بالاسم أو الهاتف..." />
          <div className="flex items-center justify-between">
            <div />
            <div className="md:hidden flex items-center gap-1 bg-slate-100 dark:bg-[#123842] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setMobileView('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${mobileView === 'cards' ? 'bg-white dark:bg-[#1E4F5A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                بطاقات
              </button>
              <button
                type="button"
                onClick={() => setMobileView('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${mobileView === 'table' ? 'bg-white dark:bg-[#1E4F5A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
              >
                جدول
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <LoadingState label="جارِ تحميل المرضى..." /> : error ? <ErrorState message={error} onRetry={load} /> :
        filtered.length === 0 ? <EmptyState icon={UsersIcon} title={data.length === 0 ? 'لا يوجد مرضى' : 'لا نتائج'} description={data.length === 0 ? 'لم يُسجَّل أي مرضى بعد.' : 'جرِّب بحثاً آخر.'} /> : (
          <>
            {/* Mobile: Card View */}
            <div className={`${mobileView === 'cards' ? 'block' : 'hidden'} md:hidden space-y-3`}>
              {filtered.map(p => (
                <div key={p.id} className="surface-card rounded-2xl p-4 border-r-4 border-r-teal-500 dark:border-r-teal-400">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">{p.name || '—'}</span>
                      <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 block" dir="ltr">{p.phone || '—'}</span>
                    </div>
                    {p.isRegistered ? <Pill label="مسجّل" tone="teal" /> : <Pill label="زائر" tone="slate" />}
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-400" /> <b>{p.totalBookings ?? 0}</b> زيارة</span>
                    <span className="flex items-center gap-1.5"><ClockIcon className="w-3 h-3 text-slate-400" /> {p.lastVisitDate ? formatArabicDate(p.lastVisitDate) : '—'}</span>
                    {p.age != null && <span className="flex items-center gap-1.5"><UsersIcon className="w-3 h-3 text-slate-400" /> {p.age} سنة</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-[#1E4F5A]">
                    <button
                      type="button"
                      onClick={() => openHistory(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> عرض السجل
                    </button>
                    {isSuperAdmin && p.isRegistered && (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirmDeactivate(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" /> تعطيل
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(p)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" /> حذف
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table + Mobile Table */}
            <div className={`${mobileView === 'table' ? 'block' : 'hidden'} md:block`}>
              <DataTable columns={[
                { header: 'الاسم', render: (p: any) => <span className="font-bold">{p.name || '—'}</span> },
                { header: 'الهاتف', render: (p: any) => <span dir="ltr" className="font-mono">{p.phone || '—'}</span> },
                { header: 'النوع', render: (p: any) => <span>{p.isRegistered ? <Pill label="مسجّل" tone="teal" /> : <Pill label="زائر" tone="slate" />}</span> },
                { header: 'الزيارات', render: (p: any) => <span className="font-bold">{p.totalBookings ?? 0}</span> },
                { header: 'آخر زيارة', render: (p: any) => <span className="text-slate-500 dark:text-slate-400">{p.lastVisitDate ? formatArabicDate(p.lastVisitDate) : '—'}</span> },
                { header: 'العمر', render: (p: any) => <span>{p.age != null ? `${p.age} سنة` : '—'}</span> },
              ]} rows={filtered}
                onRowClick={openHistory}
                actions={(p) => (
                  <div onClick={e => e.stopPropagation()}>
                    <DropdownMenu align="left" items={[
                      { label: 'عرض السجل', icon: Eye, onClick: () => openHistory(p) },
                      ...(isSuperAdmin && p.isRegistered ? [
                        { label: 'تعطيل الحساب', icon: Minus, onClick: () => setConfirmDeactivate(p) },
                        { label: 'حذف نهائي', icon: Minus, danger: true as const, onClick: () => setConfirmDelete(p) },
                      ] : []),
                    ]} />
                  </div>
                )}
              />
            </div>
          </>
        )}

      <ConfirmDialog open={!!confirmDeactivate} title="إيقاف تنشيط الحساب؟" danger confirmLabel="إيقاف التنشيط"
        description={confirmDeactivate ? <>هل تريد إيقاف تنشيط حساب <b>{confirmDeactivate.name}</b>؟ لن يتمكن من تسجيل الدخول ولن يظهر في دليل المرضى، مع الإبقاء على سجل مواعيده.</> : null}
        loading={deactivating} onConfirm={doDeactivate} onClose={() => setConfirmDeactivate(null)} />

      <ConfirmDialog open={!!confirmDelete} title="حذف المريض نهائياً؟" danger confirmLabel="حذف الحساب"
        description={confirmDelete ? (
          confirmDelete.isRegistered
            ? <>سيتم حذف حساب <b>{confirmDelete.name}</b> نهائياً من النظام. لن يستطيع تسجيل الدخول بعد ذلك. <br /><br /><span className="text-[11px] text-slate-400">ملاحظة: سجل المواعيد يبقى محفوظاً للحفاظ على التقارير.</span></>
            : <>هذا المريض <b>{confirmDelete.name}</b> زائر وليس لديه حساب على النظام، لذا لا يمكن حذفه من هنا. سجل المواعيد يبقى محفوظاً بشكل دائم.</>
        ) : null}
        loading={deleting} onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />

      <HistoryModal open={!!historyPatient} patient={historyPatient} loading={historyLoading} appointments={history}
        onClose={() => setHistoryPatient(null)} />
    </div>
  );
}

/* ============================================================
   BRANCHES
   ============================================================ */
export function Branches() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await api.getAdminBranches(); if (r.success) setData(r.data); else setError(r.message); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.deleteBranch(confirmDelete.id);
      toast.push({ kind: 'success', title: 'تم حذف الفرع' });
      setConfirmDelete(null); load();
    } catch (e: any) { toast.push({ kind: 'error', title: 'فشل الحذف', description: e.message }); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        {isSuperAdmin && (
          <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] cursor-pointer">
            <Plus className="w-4 h-4" /> إضافة فرع
          </button>
        )}
      </div>

      {loading ? <LoadingState label="جارِ تحميل الفروع..." /> : error ? <ErrorState message={error} onRetry={load} /> :
        data.length === 0 ? <EmptyState icon={Building2} title="لا توجد فروع" description="لم تُضف أي فروع بعد." /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {data.map(b => (
              <div key={b.id} className="surface-card rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{b.name}</h3>
                    <span className="text-xs text-teal-600 dark:text-teal-400">{b.city}</span>
                  </div>
                  {b.isActive ? <Pill label="نشط" tone="emerald" /> : <Pill label="غير نشط" tone="slate" />}
                </div>
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <p className="flex items-start gap-2"><Building2 className="w-3.5 h-3.5 mt-0.5 text-slate-400" /> {b.address}</p>
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span dir="ltr">{b.phone}</span></p>
                  <p className="flex items-start gap-2"><ClockIcon className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" /><span>{b.workingHoursDescription}</span></p>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1E4F5A]">
                    <button type="button" onClick={() => { setEditing(b); setModal(true); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 cursor-pointer"><FileEdit className="w-3.5 h-3.5" /> تعديل</button>
                    <button type="button" onClick={() => setConfirmDelete(b)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer"><Minus className="w-3.5 h-3.5" /> حذف</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      <ConfirmDialog open={!!confirmDelete} title="حذف الفرع؟" confirmLabel="حذف"
        description={confirmDelete ? <>هل تريد حذف فرع <b>{confirmDelete.name}</b>؟ هذه العملية لا يمكن التراجع عنها.</> : null}
        loading={deleting} danger onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />

      <BranchModal open={modal} editing={editing} onClose={() => { setModal(false); setEditing(null); }}
        onSaved={() => { setModal(false); setEditing(null); load(); toast.push({ kind: 'success', title: 'تم الحفظ' }); }} />
    </div>
  );
}

/* ============================================================
   SERVICES
   ============================================================ */
export function Services() {
  const toast = useToast();
  const { isSuperAdmin, isContentEditor } = useAuth();
  const canWrite = isSuperAdmin || isContentEditor;
  const [data, setData] = useState<MedicalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<MedicalService | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MedicalService | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await api.getAdminServices(); if (r.success) setData(r.data); else setError(r.message); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cats = Array.from(new Set(data.map(s => s.category).filter(Boolean)));
  const filtered = data.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.name.toLowerCase().includes(q)) && (cat === 'all' || s.category === cat);
  });

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try { await api.deleteService(confirmDelete.id); toast.push({ kind: 'success', title: 'تم حذف الخدمة' }); setConfirmDelete(null); load(); }
    catch (e: any) { toast.push({ kind: 'error', title: 'فشل الحذف', description: e.message }); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <div className="surface-card rounded-2xl p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث عن خدمة..." />
          <FilterBar onReset={() => setCat('all')} filters={[{ id: 'cat', label: 'الفئة', value: cat, onChange: setCat, options: [{ v: 'all', label: 'كل الفئات' }, ...cats.map((c: string) => ({ v: c, label: c }))] }]} />
          {canWrite && (
            <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] cursor-pointer whitespace-nowrap">
              <Plus className="w-4 h-4" /> إضافة خدمة
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingState label="جارِ تحميل الخدمات..." /> : error ? <ErrorState message={error} onRetry={load} /> :
        filtered.length === 0 ? <EmptyState icon={Stethoscope} title={data.length === 0 ? 'لا توجد خدمات' : 'لا نتائج'} description="جرِّب تغيير البحث أو الفلتر." /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(s => (
              <div key={s.id} className="surface-card rounded-2xl p-5 space-y-3 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  {s.category ? <Pill label={s.category} tone="teal" /> : <span />}
                  <span className="text-sm font-extrabold text-teal-700 dark:text-teal-300">{s.price != null && s.isPriceVisible ? `${money(s.price)} ج.م` : 'استشارة'}</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{s.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">{s.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {s.durationMinutes} دقيقة</span>
                  {s.isVisible ? <Pill label="مرئي" tone="emerald" /> : <Pill label="مخفي" tone="slate" />}
                  {!s.isApproved && <Pill label="قيد المراجعة" tone="amber" />}
                </div>
                <div className="flex-1" />
                {canWrite && (
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#1E4F5A]">
                    <button type="button" onClick={() => { setEditing(s); setModal(true); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 cursor-pointer"><FileEdit className="w-3.5 h-3.5" /> تعديل</button>
                    {isSuperAdmin && <button type="button" onClick={() => setConfirmDelete(s)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-bold hover:bg-rose-100 cursor-pointer"><Minus className="w-3.5 h-3.5" /> حذف</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      <ConfirmDialog open={!!confirmDelete} title="حذف الخدمة؟" confirmLabel="حذف"
        description={confirmDelete ? <>هل تريد حذف خدمة <b>{confirmDelete.name}</b>؟</> : null}
        loading={deleting} danger onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />

      <ServiceModal open={modal} editing={editing} onClose={() => { setModal(false); setEditing(null); }}
        onSaved={() => { setModal(false); setEditing(null); load(); toast.push({ kind: 'success', title: 'تم الحفظ' }); }} />
    </div>
  );
}

/* ============================================================
   WORKING HOURS
   ============================================================ */
export function WorkingHours() {
  const toast = useToast();
  const { isSuperAdmin } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rules, setRules] = useState<WorkingHourRule[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState('all');
  const [exceptionModal, setExceptionModal] = useState(false);
  const [editingException, setEditingException] = useState<ScheduleException | null>(null);
  const [confirmDeleteEx, setConfirmDeleteEx] = useState<ScheduleException | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingDay, setEditingDay] = useState<WorkingHourRule | null>(null);
  const [editForm, setEditForm] = useState<{ isOpen: boolean; startTime: string; endTime: string }>({ isOpen: true, startTime: '09:00', endTime: '17:00' });
  const [savingDay, setSavingDay] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [br, rl, ex] = await Promise.all([
        api.getAdminBranches(),
        api.getWorkingHours(branchId === 'all' ? undefined : branchId),
        api.getExceptions(branchId === 'all' ? undefined : branchId),
      ]);
      setBranches(br.success ? br.data : []);
      setRules(rl.success ? rl.data : []);
      setExceptions(ex.success ? ex.data : []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [branchId]);
  useEffect(() => { load(); }, [load]);

  const doDeleteEx = async () => {
    if (!confirmDeleteEx) return;
    setDeleting(true);
    try { await api.deleteException(confirmDeleteEx.id); toast.push({ kind: 'success', title: 'تم حذف الاستثناء' }); setConfirmDeleteEx(null); load(); }
    catch (e: any) { toast.push({ kind: 'error', title: 'فشل الحذف', description: e.message }); }
    finally { setDeleting(false); }
  };

  const handleSaveDay = async (rule: WorkingHourRule) => {
    setSavingDay(true);
    try {
      const updates: Partial<WorkingHourRule> = {
        isOpen: editForm.isOpen,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
      };
      const r = await api.updateWorkingHour(rule.id, updates);
      if (r.success) {
        toast.push({ kind: 'success', title: 'تم تحديث الموعد' });
        setEditingDay(null);
        load();
      } else {
        toast.push({ kind: 'error', title: 'فشل التحديث', description: r.message });
      }
    } catch (e: any) {
      toast.push({ kind: 'error', title: 'فشل التحديث', description: e.message });
    } finally {
      setSavingDay(false);
    }
  };

  const today = new Date().getDay();

  return (
    <div>
      <div className="surface-card rounded-2xl p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <FilterBar onReset={() => setBranchId('all')} filters={[{ id: 'branch', label: 'الفرع', value: branchId, onChange: setBranchId, options: [{ v: 'all', label: 'كل الفروع' }, ...branches.map(b => ({ v: b.id, label: b.name }))] }]} />
          <div className="flex-1" />
          {isSuperAdmin && (
            <button type="button" onClick={() => { setEditingException(null); setExceptionModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] cursor-pointer whitespace-nowrap">
              <Plus className="w-4 h-4" /> استثناء جديد
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingState label="جارِ تحميل المواعيد..." /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WidgetBox title="أيام العمل الأسبوعية">
            {rules.length === 0 ? <EmptyState title="لا توجد قواعد" description="لم تُضبط أوقات العمل بعد." /> : (
              <div className="space-y-1.5">
                {[...rules].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(r => (
                  <div key={r.id} className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border ${r.dayOfWeek === today ? 'border-teal-300 dark:border-teal-700 bg-teal-50/60 dark:bg-teal-900/20' : 'border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#10333C]/40'}`}>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{getDayOfWeekArabic(r.dayOfWeek)}</span>
                    {editingDay?.id === r.id ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={editForm.isOpen} onChange={e => setEditForm(f => ({...f, isOpen: e.target.checked}))} className="rounded border-slate-300" />
                          مفتوح
                        </label>
                        {editForm.isOpen && (
                          <div className="flex items-center gap-1">
                            <input type="time" className="w-22 px-2 py-1 rounded-lg border border-slate-200 dark:border-[#1E4F5A] bg-white dark:bg-[#0E2C33] text-xs text-slate-800 dark:text-slate-100" value={editForm.startTime} onChange={e => setEditForm(f => ({...f, startTime: e.target.value}))} />
                            <span className="text-xs text-slate-400">–</span>
                            <input type="time" className="w-22 px-2 py-1 rounded-lg border border-slate-200 dark:border-[#1E4F5A] bg-white dark:bg-[#0E2C33] text-xs text-slate-800 dark:text-slate-100" value={editForm.endTime} onChange={e => setEditForm(f => ({...f, endTime: e.target.value}))} />
                          </div>
                        )}
                        <button type="button" onClick={() => handleSaveDay(r)} disabled={savingDay} className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50 cursor-pointer">حفظ</button>
                        <button type="button" onClick={() => setEditingDay(null)} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer">إلغاء</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {r.isOpen ? (
                          <span className="text-xs font-bold text-teal-700 dark:text-teal-300 font-mono">{formatTime12h(r.startTime)} – {formatTime12h(r.endTime)}</span>
                        ) : <Pill label="مغلق" tone="slate" />}
                        {isSuperAdmin && (
                          <button type="button" onClick={() => { setEditForm({ isOpen: r.isOpen, startTime: r.startTime, endTime: r.endTime }); setEditingDay(r); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#123842] cursor-pointer" aria-label="تعديل">
                            <FileEdit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </WidgetBox>

          <WidgetBox title="استثناءات المواعيد">
            {exceptions.length === 0 ? <EmptyState title="لا توجد استثناءات" description="لا توجد عطلات أو ساعات خاصة لهذا الفرع." /> : (
              <div className="space-y-2">
                {exceptions.map(ex => (
                  <div key={ex.id} className="flex items-start justify-between gap-2 px-3 py-3 rounded-xl border border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#10333C]/40">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill tone={ex.type === 'holiday' ? 'coral' : ex.type === 'off_day' ? 'slate' : 'amber'} label={ex.type === 'holiday' ? 'عطلة رسمية' : ex.type === 'off_day' ? 'إجازة يوم' : 'ساعات خاصة'} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatArabicDate(ex.date)}</span>
                        {ex.startTime && ex.endTime && <span className="text-[11px] text-slate-400 font-mono">{formatTime12h(ex.startTime)}–{formatTime12h(ex.endTime)}</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{ex.reason}</p>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => { setEditingException(ex); setExceptionModal(true); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#123842] cursor-pointer" aria-label="تعديل">
                          <FileEdit className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteEx(ex)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer" aria-label="حذف">
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </WidgetBox>
        </div>
      )}

      <ExceptionModal open={exceptionModal} branches={branches} editing={editingException} onClose={() => { setExceptionModal(false); setEditingException(null); }}
        onSaved={() => { setExceptionModal(false); setEditingException(null); load(); toast.push({ kind: 'success', title: editingException ? 'تم تعديل الاستثناء' : 'تم إضافة الاستثناء' }); }} />

      <ConfirmDialog open={!!confirmDeleteEx} title="حذف الاستثناء؟" confirmLabel="حذف" danger
        description={confirmDeleteEx ? <>هل تريد حذف هذا الاستثناء في <b>{formatArabicDate(confirmDeleteEx.date)}</b>؟</> : null}
        loading={deleting} onConfirm={doDeleteEx} onClose={() => setConfirmDeleteEx(null)} />
    </div>
  );
}

/* ============================================================
   CONTENT CMS (announcements + reviews + FAQs + doctor profile)
   ============================================================ */
type CmsTab = 'announcements' | 'reviews' | 'faqs' | 'doctor';
export function Cms() {
  const toast = useToast();
  const [tab, setTab] = useState<CmsTab>('announcements');
  return (
    <div>
      <div className="surface-card rounded-2xl p-2 mb-4 flex flex-wrap gap-1">
        {([
          { v: 'announcements', label: 'الإعلانات' },
          { v: 'reviews', label: 'المراجعات' },
          { v: 'faqs', label: 'الأسئلة الشائعة' },
          { v: 'doctor', label: 'ملف الدكتور' },
        ] as const).map(t => (
          <button
            key={t.v}
            type="button"
            onClick={() => setTab(t.v)}
            className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.v ? 'bg-[#0E3847] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#123842]'}`}
          >{t.label}</button>
        ))}
      </div>
      {tab === 'announcements' && <AnnouncementsPanel toast={toast} />}
      {tab === 'reviews' && <ReviewsPanel toast={toast} />}
      {tab === 'faqs' && <FaqsPanel toast={toast} />}
      {tab === 'doctor' && <DoctorPanel toast={toast} />}
    </div>
  );
}

function AnnouncementsPanel({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getAdminAnnouncements();
      if (r.success) setItems(r.data);
      else setError('تعذّر تحميل الإعلانات.');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const r = await api.deleteAnnouncement(confirmDelete.id);
      if (r.success) { toast.push({ kind: 'success', title: 'تم الحذف' }); setConfirmDelete(null); load(); }
      else toast.push({ kind: 'error', title: 'فشل الحذف', description: (r as any).message });
    } finally { setDeleting(false); }
  };

  return (
    <div className="surface-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 dark:text-white">شريط الإعلانات</h3>
        <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="px-3 py-2 rounded-xl bg-[#0E3847] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-4 h-4" /> إضافة إعلان</button>
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="لا توجد إعلانات" /> : (
        <div className="space-y-2">
          {items.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-[#17424C] bg-slate-50/40 dark:bg-[#123842]/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{a.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Pill tone={a.isActive ? 'emerald' : 'slate'} label={a.isActive ? 'نشط' : 'متوقف'} />
                  <Pill tone={a.type === 'alert' ? 'coral' : a.type === 'success' ? 'emerald' : 'teal'} label={a.type === 'alert' ? 'تنبيه' : a.type === 'success' ? 'نجاح' : 'معلومة'} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setEditing(a); setModal(true); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#123842]"><FileEdit className="w-4 h-4" /></button>
                <button type="button" onClick={() => setConfirmDelete(a)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Minus className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AnnouncementModal open={modal} editing={editing} onClose={() => { setModal(false); setEditing(null); }} onSaved={() => { setModal(false); setEditing(null); load(); toast.push({ kind: 'success', title: 'تم الحفظ' }); }} />
      <ConfirmDialog open={!!confirmDelete} title="حذف الإعلان؟" confirmLabel="حذف" danger
        description={confirmDelete ? <>هل تريد حذف هذا الإعلان؟</> : null}
        loading={deleting} onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />
    </div>
  );
}

function ReviewsPanel({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<Review | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getAdminReviews();
      if (r.success) setItems(r.data);
      else setError('تعذّر تحميل المراجعات.');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleApprove = async (rv: Review) => {
    const r = await api.updateReview(rv.id, { isApproved: !rv.isApproved });
    if (r.success) { toast.push({ kind: 'success', title: rv.isApproved ? 'تم الإخفاء' : 'تم الاعتماد' }); load(); }
    else toast.push({ kind: 'error', title: 'فشل' });
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const r = await api.deleteReview(confirmDelete.id);
      if (r.success) { toast.push({ kind: 'success', title: 'تم الحذف' }); setConfirmDelete(null); load(); }
      else toast.push({ kind: 'error', title: 'فشل الحذف' });
    } finally { setDeleting(false); }
  };

  return (
    <div className="surface-card rounded-2xl p-4">
      <h3 className="font-bold text-slate-800 dark:text-white mb-4">مراجعات المرضى</h3>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="لا توجد مراجعات" /> : (
        <div className="space-y-2">
          {items.map(rv => (
            <div key={rv.id} className="p-3 rounded-xl border border-slate-100 dark:border-[#17424C] bg-slate-50/40 dark:bg-[#123842]/40">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{rv.patientName}</p>
                <Stars value={rv.rating} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{rv.reviewText}</p>
              <div className="flex items-center gap-2 mt-2">
                <Pill tone={rv.isApproved ? 'emerald' : 'amber'} label={rv.isApproved ? 'معتمدة' : 'بانتظار الاعتماد'} />
                <button type="button" onClick={() => toggleApprove(rv)} className="text-[11px] font-bold text-teal-600 hover:underline">{rv.isApproved ? 'إخفاء' : 'اعتماد'}</button>
                <button type="button" onClick={() => setConfirmDelete(rv)} className="text-[11px] font-bold text-rose-500 hover:underline">حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!confirmDelete} title="حذف المراجعة؟" confirmLabel="حذف" danger
        description={confirmDelete ? <>هل تريد حذف هذه المراجعة؟</> : null}
        loading={deleting} onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />
    </div>
  );
}

function FaqsPanel({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FAQItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getAdminFaqs();
      if (r.success) setItems(r.data);
      else setError('تعذّر تحميل الأسئلة.');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const r = await api.deleteFaq(confirmDelete.id);
      if (r.success) { toast.push({ kind: 'success', title: 'تم الحذف' }); setConfirmDelete(null); load(); }
      else toast.push({ kind: 'error', title: 'فشل الحذف' });
    } finally { setDeleting(false); }
  };

  return (
    <div className="surface-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 dark:text-white">الأسئلة الشائعة</h3>
        <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="px-3 py-2 rounded-xl bg-[#0E3847] text-white text-xs font-bold flex items-center gap-1.5"><Plus className="w-4 h-4" /> إضافة سؤال</button>
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <EmptyState title="لا توجد أسئلة" /> : (
        <div className="space-y-2">
          {items.map(f => (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-[#17424C] bg-slate-50/40 dark:bg-[#123842]/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{f.question}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{f.answer}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setEditing(f); setModal(true); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#123842]"><FileEdit className="w-4 h-4" /></button>
                <button type="button" onClick={() => setConfirmDelete(f)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Minus className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <FaqModal open={modal} editing={editing} onClose={() => { setModal(false); setEditing(null); }} onSaved={() => { setModal(false); setEditing(null); load(); toast.push({ kind: 'success', title: 'تم الحفظ' }); }} />
      <ConfirmDialog open={!!confirmDelete} title="حذف السؤال؟" confirmLabel="حذف" danger
        description={confirmDelete ? <>هل تريد حذف هذا السؤال؟</> : null}
        loading={deleting} onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />
    </div>
  );
}

function DoctorPanel({ toast }: { toast: ReturnType<typeof useToast> }) {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getClinicInfo();
      if (r.success) setProfile(r.data.doctorProfile);
      else setError('تعذّر تحميل ملف الدكتور.');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const r = await api.updateDoctorProfile(profile);
      if (r.success) toast.push({ kind: 'success', title: 'تم الحفظ' });
      else toast.push({ kind: 'error', title: 'فشل الحفظ' });
    } finally { setSaving(false); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!profile) return <EmptyState title="لا توجد بيانات" />;

  return (
    <form onSubmit={save} className="surface-card rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-slate-800 dark:text-white">ملف الدكتور</h3>
      <FormField label="الاسم">
        <input className={inputCls} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
      </FormField>
      <FormField label="العنوان الوظيفي">
        <input className={inputCls} value={profile.title} onChange={e => setProfile({ ...profile, title: e.target.value })} />
      </FormField>
      <FormField label="نبذة">
        <textarea className={inputCls} rows={4} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} />
      </FormField>
      <div className="grid sm:grid-cols-2 gap-3">
        <FormField label="سنوات الخبرة">
          <input type="number" className={inputCls} value={profile.yearsOfExperience} onChange={e => setProfile({ ...profile, yearsOfExperience: Number(e.target.value) })} />
        </FormField>
        <FormField label="عدد العمليات الناجحة">
          <input type="number" className={inputCls} value={profile.successfulSurgeries} onChange={e => setProfile({ ...profile, successfulSurgeries: Number(e.target.value) })} />
        </FormField>
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-xl bg-[#0E3847] text-white text-xs font-bold disabled:opacity-50">
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </form>
  );
}

/* ============================================================
   USERS (admin/staff management) — super_admin only
   ============================================================ */
export function UsersPage() {
  const toast = useToast();
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getUsers();
      if (r.success) setItems(r.data);
      else setError('تعذّر تحميل المستخدمين.');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const r = await api.deleteUser(confirmDelete.id);
      if (r.success) { toast.push({ kind: 'success', title: 'تم الحذف' }); setConfirmDelete(null); load(); }
      else toast.push({ kind: 'error', title: 'فشل الحذف', description: (r as any).message });
    } finally { setDeleting(false); }
  };

  const filtered = items.filter(u => {
    if (u.role === 'patient') return false; // only staff
    if (search && !u.name.includes(search) && !u.phone.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="surface-card rounded-2xl p-4 mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <SearchBar value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الهاتف..." />
            <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="px-3 py-2 rounded-xl bg-[#0E3847] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"><Plus className="w-4 h-4" /> إضافة موظف</button>
          </div>
          <div className="md:hidden flex items-center gap-1 bg-slate-100 dark:bg-[#123842] rounded-xl p-1 self-start">
            <button
              type="button"
              onClick={() => setMobileView('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${mobileView === 'cards' ? 'bg-white dark:bg-[#1E4F5A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            >
              بطاقات
            </button>
            <button
              type="button"
              onClick={() => setMobileView('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${mobileView === 'table' ? 'bg-white dark:bg-[#1E4F5A] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            >
              جدول
            </button>
          </div>
        </div>
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : filtered.length === 0 ? <EmptyState icon={UserCog} title="لا يوجد موظفون" description="أضف موظفاً جديداً للبدء." /> : (
        <>
          {/* Mobile: Card View */}
          <div className={`${mobileView === 'cards' ? 'block' : 'hidden'} md:hidden space-y-3`}>
            {filtered.map(u => (
              <div key={u.id} className="surface-card rounded-2xl p-4 border-r-4 border-r-teal-500 dark:border-r-teal-400">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">{u.name}</span>
                    <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 block" dir="ltr">{u.phone}</span>
                  </div>
                  <Pill tone={u.role === 'super_admin' ? 'coral' : u.role === 'receptionist' ? 'teal' : 'amber'} label={u.role === 'super_admin' ? 'مدير عام' : u.role === 'receptionist' ? 'استقبال' : 'محرر محتوى'} />
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-slate-600 dark:text-slate-300">
                  {u.email && <span className="flex items-center gap-1.5 truncate col-span-2" dir="ltr">{u.email}</span>}
                  <span className="flex items-center gap-1.5"><Pill tone={u.isActive === false ? 'slate' : 'emerald'} label={u.isActive === false ? 'موقوف' : 'نشط'} /></span>
                  <span className="text-slate-400">{u.role === 'super_admin' ? 'صلاحية كاملة' : u.role === 'receptionist' ? 'حجوزات ومرضى' : 'إدارة المحتوى'}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-[#1E4F5A]">
                  <button
                    type="button"
                    onClick={() => { setEditing(u); setModal(true); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#123842] text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" /> تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(u)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table + Mobile Table */}
          <div className={`${mobileView === 'table' ? 'block' : 'hidden'} md:block`}>
            <DataTable<User>
              columns={[
                { key: 'name', header: 'الاسم', render: u => <span className="font-bold text-slate-800 dark:text-white">{u.name}</span> },
                { key: 'phone', header: 'الهاتف', render: u => <span dir="ltr" className="font-mono text-xs">{u.phone}</span> },
                { key: 'role', header: 'الصلاحية', render: u => <Pill tone={u.role === 'super_admin' ? 'coral' : u.role === 'receptionist' ? 'teal' : 'amber'} label={u.role === 'super_admin' ? 'مدير عام' : u.role === 'receptionist' ? 'استقبال' : 'محرر محتوى'} /> },
                { key: 'isActive', header: 'الحالة', render: u => <Pill tone={u.isActive === false ? 'slate' : 'emerald'} label={u.isActive === false ? 'موقوف' : 'نشط'} /> },
                { key: 'actions', header: '', render: u => (
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => { setEditing(u); setModal(true); }} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-[#123842]"><FileEdit className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setConfirmDelete(u)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Minus className="w-4 h-4" /></button>
                  </div>
                ) },
              ]}
              rows={filtered}
              rowKey={u => u.id}
            />
          </div>
        </>
      )}
      <UserModal open={modal} editing={editing} onClose={() => { setModal(false); setEditing(null); }} onSaved={() => { setModal(false); setEditing(null); load(); toast.push({ kind: 'success', title: 'تم الحفظ' }); }} />
      <ConfirmDialog open={!!confirmDelete} title="حذف الموظف؟" confirmLabel="حذف" danger
        description={confirmDelete ? <>هل تريد حذف <b>{confirmDelete.name}</b>؟</> : null}
        loading={deleting} onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />
    </div>
  );
}

/* ============================================================
   PRESCRIPTIONS (admin — review patients' uploaded prescriptions)
   ============================================================ */
export function Prescriptions() {
  const toast = useToast();
  const [data, setData] = useState<AdminPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [viewRx, setViewRx] = useState<AdminPrescription | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getAdminPrescriptions();
      if (r.success) setData(r.data || []);
      else setError(r.message || 'فشل في جلب الروشتات');
    } catch (e: any) {
      setError(e.message || 'خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = data.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.patientName || '').toLowerCase().includes(q) ||
      (p.patientPhone || '').includes(q) ||
      (p.patientEmail || '').toLowerCase().includes(q) ||
      (p.createdAt || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="surface-card rounded-2xl p-4 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="ابحث باسم المريض، الهاتف، البريد، أو التاريخ..."
        />
      </div>

      {loading ? (
        <LoadingState label="جارِ تحميل روشتات المرضى..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={data.length === 0 ? 'لا توجد روشتات محفوظة' : 'لا توجد نتائج'}
          description={data.length === 0 ? 'لم يتم حفظ أي روشتات من المرضى بعد.' : 'جرّب بحثاً مختلفاً.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(rx => (
            <div
              key={rx.id}
              className="rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs overflow-hidden flex flex-col"
            >
              <button
                type="button"
                onClick={() => setViewRx(rx)}
                className="block w-full h-40 bg-slate-100 dark:bg-[#0E2C33] overflow-hidden cursor-pointer"
                aria-label="عرض الروشتة"
              >
                <img
                  src={rx.imageUrl}
                  alt="روشتة"
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </button>

              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{rx.patientName}</span>
                  <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 shrink-0" dir="ltr">{rx.patientPhone || '—'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-300">
                  <ClockIcon className="w-3.5 h-3.5 text-[#E05A47] shrink-0" />
                  <span className="font-bold text-[#E05A47]">{formatPrescriptionDateTime(rx.createdAt)}</span>
                </div>

                {rx.patientEmail && (
                  <p className="text-[11px] text-slate-400 truncate" dir="ltr">{rx.patientEmail}</p>
                )}

                {rx.note && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 bg-slate-50 dark:bg-[#123842] rounded-xl p-2">
                    {rx.note}
                  </p>
                )}

                <div className="pt-1 mt-auto">
                  <button
                    type="button"
                    onClick={() => setViewRx(rx)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> عرض الروشتة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!viewRx} onClose={() => setViewRx(null)} title="عرض الروشتة" maxWidth="2xl">
        {viewRx && (
          <div className="space-y-4 text-right" dir="rtl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">المريض</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewRx.patientName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">الهاتف</span>
                <span className="font-bold text-slate-700 dark:text-slate-200" dir="ltr">{viewRx.patientPhone || '—'}</span>
              </div>
              {viewRx.patientEmail && (
                <div>
                  <span className="text-slate-400 block mb-0.5">البريد الإلكتروني</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200" dir="ltr">{viewRx.patientEmail}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block mb-0.5">تاريخ الإضافة</span>
                <span className="font-bold text-[#E05A47]">{formatPrescriptionDateTime(viewRx.createdAt)}</span>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-auto rounded-xl bg-slate-100 dark:bg-[#0E2C33] flex items-center justify-center">
              <img src={viewRx.imageUrl} alt="روشتة" className="max-w-full max-h-[55vh] object-contain" />
            </div>

            {viewRx.note && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                <strong className="text-slate-500 dark:text-slate-400 ml-1">ملاحظات المريض:</strong>
                {viewRx.note}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

