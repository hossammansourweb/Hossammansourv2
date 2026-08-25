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
  ShieldCheck,
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useAdminCtx } from './shell.tsx';
import { formatArabicDate, formatArabicTime, getTodayDateString, getDayOfWeekArabic } from '../../utils/date.ts';
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
} from '../../types/index.ts';
import {
  PageHeader,
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
      <PageHeader title="لوحة المؤشرات" description="نظرة عامة على أداء العيادة لليوم وهذا الأسبوع." breadcrumb={['لوحة التحكم', 'المؤشرات']} />

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <WidgetBox title="إجراءات سريعة">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <QuickAction label="الحجوزات" icon={Calendar} onClick={() => navigate('appointments')} />
            <QuickAction label="المرضى" icon={UsersIcon} onClick={() => navigate('patients')} />
            <QuickAction label="الخدمات" icon={Stethoscope} onClick={() => navigate('services')} />
            <QuickAction label="الفروع" icon={Building2} onClick={() => navigate('branches')} />
            <QuickAction label="المواعيد" icon={ClockIcon} onClick={() => navigate('working-hours')} />
            <QuickAction label="المحتوى" icon={FileEdit} onClick={() => navigate('cms')} />
          </div>
        </WidgetBox>
      </div>
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
function QuickAction({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1E4F5A] hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer">
      <Icon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
      {label}
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
  const perPage = 10;
  const [viewing, setViewing] = useState<Appointment | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const filtered = data.filter(ap => {
    const q = search.toLowerCase();
    const mSearch = !q || ap.patientName.toLowerCase().includes(q) || ap.patientPhone.includes(q) || ap.bookingNumber.toLowerCase().includes(q);
    const mStatus = status === 'all' || ap.status === status;
    const mBranch = branch === 'all' || ap.branchId === branch;
    const mDate = !date || ap.appointmentDate === date;
    return mSearch && mStatus && mBranch && mDate;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.updateAppointmentStatus(confirmDelete.id, 'cancelled', 'حذف بواسطة الإدارة', 'تم وضع علامة حذف إداري مع الحفاظ على سجل التدقيق.');
      toast.push({ kind: 'success', title: 'تم حذف الموعد', description: 'أُلغي الموعد مع الحفاظ على سجل التدقيق.' });
      setConfirmDelete(null); load();
    } catch (e: any) { toast.push({ kind: 'error', title: 'فشل الحذف', description: e.message }); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="الحجوزات والمواعيد" description="إدارة كل حجوزات الكشف عبر الفروع." />

      <div className="surface-card rounded-2xl p-4 mb-4">
        <div className="flex flex-col gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث بالاسم، الهاتف، أو كود الحجز..." />
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
        </div>
      </div>

      {loading ? <LoadingState label="جارِ تحميل المواعيد..." /> : error ? <ErrorState message={error} onRetry={load} /> :
        data.length === 0 ? <EmptyState icon={Calendar} title="لا توجد مواعيد" description="لم يتم تسجيل أي مواعيد بعد." /> :
        filtered.length === 0 ? <EmptyState title="لا نتائج" description="غيِّر معايير البحث أو الفلتر." /> : (
          <>
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
                    { label: 'تعديل الحالة', icon: FileEdit, onClick: () => setEditing(a) },
                    { label: 'حذف', icon: Minus, onClick: () => setConfirmDelete(a), danger: true },
                  ]} />
                </div>
              )}
            />
            <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
          </>
        )}

      <ViewAppointmentModal appointment={viewing} loading={false}
        onClose={() => setViewing(null)}
        onChanged={(a) => { setViewing(null); load(); toast.push({ kind: 'success', title: 'تم تحديث الحالة' }); void a; }} />

      <ConfirmDialog open={!!confirmDelete} title="حذف الموعد" danger confirmLabel="حذف"
        description={confirmDelete ? <>هل تريد حذف موعد <b>{confirmDelete.patientName}</b> (كود {confirmDelete.bookingNumber})؟ سيتم إلغاؤه مع الحفاظ على سجل التدقيق.</> : null}
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
  const [historyPatient, setHistoryPatient] = useState<any>(null);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  return (
    <div>
      <PageHeader title="المرضى" description="دليل المرضى المسجلين والزائرين مع إجمالي الزيارات وسجل المواعيد." />
      <div className="surface-card rounded-2xl p-4 mb-5">
        <SearchBar value={search} onChange={setSearch} placeholder="ابحث عن مريض بالاسم أو الهاتف..." />
      </div>

      {loading ? <LoadingState label="جارِ تحميل المرضى..." /> : error ? <ErrorState message={error} onRetry={load} /> :
        filtered.length === 0 ? <EmptyState icon={UsersIcon} title={data.length === 0 ? 'لا يوجد مرضى' : 'لا نتائج'} description={data.length === 0 ? 'لم يُسجَّل أي مرضى بعد.' : 'جرِّب بحثاً آخر.'} /> : (
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
                  ...(isSuperAdmin && p.isRegistered ? [{ label: 'تعطيل الحساب', icon: Minus, danger: true as const, onClick: () => setConfirmDeactivate(p) }] : []),
                ]} />
              </div>
            )}
          />
        )}

      <ConfirmDialog open={!!confirmDeactivate} title="إيقاف تنشيط الحساب؟" danger confirmLabel="إيقاف التنشيط"
        description={confirmDeactivate ? <>هل تريد إيقاف تنشيط حساب <b>{confirmDeactivate.name}</b>؟ لن يتمكن من تسجيل الدخول ولن يظهر في دليل المرضى، مع الإبقاء على سجل مواعيده.</> : null}
        loading={deactivating} onConfirm={doDeactivate} onClose={() => setConfirmDeactivate(null)} />

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
      <PageHeader title="الفروع" description="فروع العيادة ومواقعها وأوقات العمل."
        actions={<>{isSuperAdmin && (
          <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] cursor-pointer">
            <Plus className="w-4 h-4" /> إضافة فرع
          </button>
        )}</>} />

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
      <PageHeader title="الخدمات والأسعار" description="إدارة الخدمات الطبية وفئاتها وأسعارها."
        actions={<>{canWrite && (
          <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] cursor-pointer">
            <Plus className="w-4 h-4" /> إضافة خدمة
          </button>
        )}</>} />

      <div className="surface-card rounded-2xl p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <SearchBar value={search} onChange={setSearch} placeholder="ابحث عن خدمة..." />
          <FilterBar onReset={() => setCat('all')} filters={[{ id: 'cat', label: 'الفئة', value: cat, onChange: setCat, options: [{ v: 'all', label: 'كل الفئات' }, ...cats.map((c: string) => ({ v: c, label: c }))] }]} />
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
  const [confirmDeleteEx, setConfirmDeleteEx] = useState<ScheduleException | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const today = new Date().getDay();

  return (
    <div>
      <PageHeader title="مواعيد العمل والإجازات" description="جداول أيام العمل لكل فرع واستثناءات المواعيد (عطلات، ساعات خاصة)."
        actions={<>{isSuperAdmin && (
          <button type="button" onClick={() => setExceptionModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-xs font-bold hover:bg-[#092631] cursor-pointer">
            <Plus className="w-4 h-4" /> استثناء جديد
          </button>
        )}</>} />

      <div className="surface-card rounded-2xl p-4 mb-5">
        <FilterBar onReset={() => setBranchId('all')} filters={[{ id: 'branch', label: 'الفرع', value: branchId, onChange: setBranchId, options: [{ v: 'all', label: 'كل الفروع' }, ...branches.map(b => ({ v: b.id, label: b.name }))] }]} />
      </div>

      {loading ? <LoadingState label="جارِ تحميل المواعيد..." /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WidgetBox title="أيام العمل الأسبوعية">
            {rules.length === 0 ? <EmptyState title="لا توجد قواعد" description="لم تُضبط أوقات العمل بعد." /> : (
              <div className="space-y-1.5">
                {[...rules].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map(r => (
                  <div key={r.id} className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border ${r.dayOfWeek === today ? 'border-teal-300 dark:border-teal-700 bg-teal-50/60 dark:bg-teal-900/20' : 'border-slate-100 dark:border-[#1E4F5A] bg-slate-50/50 dark:bg-[#10333C]/40'}`}>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{getDayOfWeekArabic(r.dayOfWeek)}</span>
                    {r.isOpen ? (
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300 font-mono">{r.startTime} – {r.endTime}</span>
                    ) : <Pill label="مغلق" tone="slate" />}
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
                        {ex.startTime && ex.endTime && <span className="text-[11px] text-slate-400 font-mono">{ex.startTime}–{ex.endTime}</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{ex.reason}</p>
                    </div>
                    {isSuperAdmin && (
                      <button type="button" onClick={() => setConfirmDeleteEx(ex)} className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer" aria-label="حذف">
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </WidgetBox>
        </div>
      )}

      <ExceptionModal open={exceptionModal} branches={branches} onClose={() => setExceptionModal(false)}
        onSaved={() => { setExceptionModal(false); load(); toast.push({ kind: 'success', title: 'تم إضافة الاستثناء' }); }} />

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
      <PageHeader title="إدارة المحتوى" description="الإعلانات، المراجعات، الأسئلة الشائعة، وملف الدكتور." />
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
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{a.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Pill tone={a.isActive ? 'emerald' : 'slate'} label={a.isActive ? 'نشط' : 'متوقف'} />
                  <Pill tone={a.priority === 'high' ? 'coral' : a.priority === 'medium' ? 'amber' : 'teal'} label={a.priority === 'high' ? 'أولوية عالية' : a.priority === 'medium' ? 'متوسط' : 'عادي'} />
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
      <PageHeader title="إدارة الطاقم" description="إضافة وإدارة حسابات الموظفين والمدراء." />
      <div className="surface-card rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الهاتف..." />
        <button type="button" onClick={() => { setEditing(null); setModal(true); }} className="px-3 py-2 rounded-xl bg-[#0E3847] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"><Plus className="w-4 h-4" /> إضافة موظف</button>
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : filtered.length === 0 ? <EmptyState title="لا يوجد موظفون" /> : (
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
      )}
      <UserModal open={modal} editing={editing} onClose={() => { setModal(false); setEditing(null); }} onSaved={() => { setModal(false); setEditing(null); load(); toast.push({ kind: 'success', title: 'تم الحفظ' }); }} />
      <ConfirmDialog open={!!confirmDelete} title="حذف الموظف؟" confirmLabel="حذف" danger
        description={confirmDelete ? <>هل تريد حذف <b>{confirmDelete.name}</b>؟</> : null}
        loading={deleting} onConfirm={doDelete} onClose={() => setConfirmDelete(null)} />
    </div>
  );
}

/* ============================================================
   AUDIT LOG — super_admin only
   ============================================================ */
export function AuditLogPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const perPage = PAGE_SIZE;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await api.getAuditLogs();
      if (r.success) setItems(r.data);
      else setError('تعذّر تحميل السجلات.');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(l => !search || l.action.includes(search) || l.userName.includes(search) || l.description.includes(search));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="سجل النشاط" description="تتبع كل التغييرات التي أجراها المستخدمون على النظام." />
      <div className="surface-card rounded-2xl p-4 mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="ابحث بالإجراء، اسم المستخدم، أو الوصف..." />
      </div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : slice.length === 0 ? <EmptyState title="لا توجد سجلات" /> : (
        <div className="surface-card rounded-2xl overflow-hidden">
          {slice.map(l => (
            <div key={l.id} className="px-4 py-3 border-b border-slate-100 dark:border-[#17424C] last:border-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{l.action}</span>
                  <Pill tone="teal" label={l.userName} />
                  <Pill tone="slate" label={l.userRole} />
                </div>
                <span className="text-[11px] text-slate-500 font-mono" dir="ltr">{new Date(l.timestamp).toLocaleString('ar-EG')}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{l.description}</p>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
    </div>
  );
}

/* ============================================================
   PROFILE — current admin's own profile
   ============================================================ */
export function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  if (!user) return <EmptyState title="غير مسجّل" />;

  return (
    <div>
      <PageHeader title="ملفي الشخصي" description="معلوماتك الأساسية وصلاحياتك في النظام." />
      <div className="surface-card rounded-2xl p-6 flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center text-xl font-extrabold">
          {user.name?.charAt(0) || '؟'}
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">{user.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400" dir="ltr">{user.phone}</p>
          <div className="mt-2">
            <Pill tone={user.role === 'super_admin' ? 'coral' : user.role === 'receptionist' ? 'teal' : 'amber'} label={user.role === 'super_admin' ? 'مدير عام' : user.role === 'receptionist' ? 'استقبال' : 'محرر محتوى'} />
          </div>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-4">
        <h3 className="font-bold text-slate-800 dark:text-white mb-3">الأمان</h3>
        <button
          type="button"
          onClick={() => toast.push({ kind: 'info', title: 'قريباً', description: 'ميزة تغيير كلمة المرور قيد التطوير.' })}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#1F4E5A] text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#123842]"
        >
          تغيير كلمة المرور
        </button>
      </div>
    </div>
  );
}