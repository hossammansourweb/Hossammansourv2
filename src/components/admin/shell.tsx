import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  Stethoscope,
  Clock,
  FileText,
  ShieldCheck,
  UserCog,
  User,
  LogOut,
  Menu,
  Bell,
  Sun,
  Moon,
  ChevronsLeft,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dashboard,
  Appointments,
  Patients,
  Branches,
  Services,
  WorkingHours,
  Cms,
  UsersPage,
  AuditLogPage,
  Profile,
} from './pages.tsx';

export type AdminPageKey =
  | 'dashboard'
  | 'appointments'
  | 'patients'
  | 'branches'
  | 'services'
  | 'working-hours'
  | 'cms'
  | 'users'
  | 'audit'
  | 'profile';

export interface AdminPage {
  key: AdminPageKey;
  label: string;
  icon: React.ElementType;
  roles: ('super_admin' | 'receptionist' | 'content_editor')[];
  section: string;
}

export interface AdminAppProps {
  page: AdminPageKey;
  navigate: (page: AdminPageKey) => void;
}

export const ADMIN_PAGES: AdminPage[] = [
  { key: 'dashboard', label: 'لوحة المؤشرات', icon: LayoutDashboard, roles: ['super_admin', 'receptionist', 'content_editor'], section: 'عام' },
  { key: 'appointments', label: 'الحجوزات والمواعيد', icon: Calendar, roles: ['super_admin', 'receptionist'], section: 'عام' },
  { key: 'patients', label: 'المرضى', icon: Users, roles: ['super_admin', 'receptionist'], section: 'عام' },
  { key: 'branches', label: 'الفروع', icon: Building2, roles: ['super_admin', 'receptionist', 'content_editor'], section: 'عمليات' },
  { key: 'services', label: 'الخدمات والأسعار', icon: Stethoscope, roles: ['super_admin', 'receptionist', 'content_editor'], section: 'عمليات' },
  { key: 'working-hours', label: 'مواعيد العمل والإجازات', icon: Clock, roles: ['super_admin', 'receptionist', 'content_editor'], section: 'عمليات' },
  { key: 'cms', label: 'محتوى الموقع', icon: FileText, roles: ['super_admin', 'content_editor'], section: 'عمليات' },
  { key: 'users', label: 'المستخدمون والصلاحيات', icon: UserCog, roles: ['super_admin'], section: 'نظام' },
  { key: 'audit', label: 'سجل النشاط والأمان', icon: ShieldCheck, roles: ['super_admin'], section: 'نظام' },
  { key: 'profile', label: 'الملف الشخصي', icon: User, roles: ['super_admin', 'receptionist', 'content_editor'], section: 'نظام' },
];

type Role = 'super_admin' | 'receptionist' | 'content_editor';

function pageVisible(p: AdminPage, role: Role | undefined): boolean {
  if (!role) return false;
  return p.roles.includes(role);
}

const AdminCtx = createContext<{ user: any; logout: () => void; navigate: (k: AdminPageKey) => void }>({
  user: null,
  logout: () => {},
  navigate: () => {},
});
export function useAdminCtx() {
  return useContext(AdminCtx);
}

// ---------- Sidebar (desktop) ----------
function Sidebar({
  current,
  onNavigate,
  collapsed,
  setCollapsed,
}: {
  current: AdminPageKey;
  onNavigate: (k: AdminPageKey) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const { user, logout } = useAdminCtx();
  const role = user?.role as Role | undefined;
  const visible = ADMIN_PAGES.filter(p => pageVisible(p, role));
  const W = collapsed ? 'w-[72px]' : 'w-64';
  const sections: string[] = ['عام', 'عمليات', 'نظام'];

  return (
    <aside
      dir="rtl"
      className={`hidden lg:flex flex-col ${W} h-screen sticky top-0 shrink-0 bg-white dark:bg-[#0E2C33] border-l border-slate-200 dark:border-[#17424C] transition-[width] duration-300 overflow-hidden relative`}
    >
      <div className={`flex items-center gap-2.5 h-[68px] px-4 border-b border-slate-100 dark:border-[#17424C] shrink-0 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-[#0E3847] dark:bg-teal-700 flex items-center justify-center text-white text-sm font-extrabold shrink-0">
          HM
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">ع. د. حسام منصور</p>
            <p className="text-[10px] text-slate-400 truncate">الإدارة السريرية</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {sections.map(sec => {
          const items = visible.filter(p => p.section === sec);
          if (!items.length) return null;
          return (
            <div key={sec}>
              {!collapsed && (
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2 mb-1.5">{sec}</p>
              )}
              <div className="space-y-0.5">
                {items.map(p => {
                  const Icon = p.icon;
                  const active = current === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => onNavigate(p.key)}
                      title={collapsed ? p.label : undefined}
                      className={`w-full flex items-center rounded-xl px-2.5 text-right transition-colors cursor-pointer ${
                        collapsed ? 'justify-center h-11' : 'h-11 gap-2.5'
                      } ${active ? 'bg-[#0E3847] text-white dark:bg-teal-700' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#123842]'}`}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? '' : 'text-slate-400 dark:text-slate-400'}`} />
                      {!collapsed && <span className="text-xs font-bold truncate">{p.label}</span>}
                      {!collapsed && active && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-white/90 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 dark:border-[#17424C] p-2.5 space-y-1 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          title={collapsed ? 'الملف الشخصي' : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#123842] transition-colors cursor-pointer ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-[#123842] border border-teal-100 dark:border-teal-800 flex items-center justify-center text-[#0E3847] dark:text-teal-300 text-xs font-extrabold shrink-0">
            {(user?.name || '؟').slice(0, 1)}
          </div>
          {!collapsed && (
            <div className="min-w-0 text-right">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {role === 'super_admin' ? 'مدير النظام' : role === 'receptionist' ? 'موظف استقبال' : 'محرر محتوى'}
              </p>
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => logout()}
          title={collapsed ? 'تسجيل الخروج' : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-xs font-bold ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#1E4F5A] text-slate-500 dark:text-slate-300 hidden xl:flex items-center justify-center hover:bg-slate-50 cursor-pointer shadow-xs"
        title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
        aria-label="طي/توسيع"
      >
        <ChevronsLeft className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </aside>
  );
}

// ---------- Mobile Drawer ----------
function MobileDrawer({
  current,
  onNavigate,
}: {
  current: AdminPageKey;
  onNavigate: (k: AdminPageKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAdminCtx();
  const role = user?.role as Role | undefined;
  const visible = ADMIN_PAGES.filter(p => pageVisible(p, role));

  const close = () => setOpen(false);
  const go = (k: AdminPageKey) => { setOpen(false); onNavigate(k); };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden w-10 h-10 rounded-xl border border-slate-200 dark:border-[#1E4F5A] bg-white dark:bg-[#123842] text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer shadow-xs"
        aria-label="فتح القائمة"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs lg:hidden"
              onClick={close}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28 }}
              dir="rtl"
              className="fixed inset-y-0 right-0 z-[71] w-[82%] max-w-sm bg-white dark:bg-[#0E2C33] shadow-2xl flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 dark:border-[#17424C] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0E3847] dark:bg-teal-700 text-white text-sm font-extrabold flex items-center justify-center">HM</div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">لوحة الإدارة</p>
                    <p className="text-[10px] text-slate-400">
                      {role === 'super_admin' ? 'مدير النظام' : role === 'receptionist' ? 'موظف استقبال' : 'محرر محتوى'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={close} className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="إغلاق">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {visible.map(p => {
                  const Icon = p.icon;
                  const active = current === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => go(p.key)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3.5 text-right transition-colors cursor-pointer ${active ? 'bg-[#0E3847] text-white dark:bg-teal-700' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#123842]'}`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-bold">{p.label}</span>
                      {active && <span className="mr-auto w-2 h-2 rounded-full bg-white/90" />}
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-slate-100 dark:border-[#17424C] p-3 space-y-2 shrink-0">
                <button
                  type="button"
                  onClick={() => go('profile')}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 bg-slate-50 dark:bg-[#123842] text-slate-800 dark:text-slate-100 text-sm font-bold cursor-pointer"
                >
                  <User className="w-5 h-5 text-teal-600" />
                  <span>الملف الشخصي</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); logout(); }}
                  className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 border border-rose-200 dark:border-rose-900/40 text-rose-600 text-sm font-bold cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- Header ----------
function Header({
  current,
  onNavigate,
}: {
  current: AdminPageKey;
  onNavigate: (k: AdminPageKey) => void;
}) {
  const { user, logout } = useAdminCtx();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const page = ADMIN_PAGES.find(p => p.key === current);
  const title = page?.label || 'لوحة الإدارة';

  return (
    <header className="sticky top-0 z-50 w-full bg-white/92 dark:bg-[#0E2C33]/92 backdrop-blur-xl border-b border-slate-200 dark:border-[#17424C] px-3 sm:px-6 h-16 flex items-center gap-2 sm:gap-3">
      <MobileDrawer current={current} onNavigate={onNavigate} />

      <div className="min-w-0 flex-1">
        <h1 className="text-base sm:text-lg font-extrabold font-tajawal text-slate-900 dark:text-white truncate">{title}</h1>
        <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 truncate">بوابة الإدارة السريرية · عيادة د. حسام منصور</p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl border border-slate-200 dark:border-[#1E4F5A] text-slate-600 dark:text-amber-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#123842] cursor-pointer"
          aria-label="تبديل المظهر"
        >
          {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-[#1E4F5A] text-slate-600 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#123842] cursor-pointer relative"
            aria-label="التنبيهات"
          >
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E05A47]" />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                className="absolute left-0 mt-2 z-50 w-72 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#1E4F5A] shadow-xl p-3 text-right"
              >
                <p className="text-xs font-extrabold text-slate-900 dark:text-white mb-2">التنبيهات</p>
                <p className="text-xs text-slate-400 text-center py-4">لا توجد تنبيهات حالياً.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
            className="flex items-center gap-2 px-1 sm:px-2 h-10 rounded-xl hover:bg-slate-50 dark:hover:bg-[#123842] cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-[#123842] border border-teal-100 dark:border-teal-800 flex items-center justify-center text-[#0E3847] dark:text-teal-300 text-xs font-extrabold">
              {(user?.name || '؟').slice(0, 1)}
            </div>
            <span className="hidden md:block text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[110px] truncate">{user?.name}</span>
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                className="absolute left-0 mt-2 z-50 w-52 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#1E4F5A] shadow-xl p-1.5 text-right"
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-[#1E4F5A] mb-1">
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 truncate" dir="ltr">{user?.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); onNavigate('profile'); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#123842] text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <User className="w-4 h-4" /> الملف الشخصي
                </button>
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold text-rose-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> تسجيل الخروج
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

// ---------- AdminApp - the public shell ----------
export function AdminApp({
  page,
  navigate,
}: {
  page: AdminPageKey;
  navigate: (k: AdminPageKey) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <AdminCtx.Provider value={{ user, logout, navigate }}>
      <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-[#0B252C] flex">
        <Sidebar current={page} onNavigate={navigate} collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header current={page} onNavigate={navigate} />
          <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {page === 'dashboard' && <Dashboard />}
                {page === 'appointments' && <Appointments />}
                {page === 'patients' && <Patients />}
                {page === 'branches' && <Branches />}
                {page === 'services' && <Services />}
                {page === 'working-hours' && <WorkingHours />}
                {page === 'cms' && <Cms />}
                {page === 'users' && <UsersPage />}
                {page === 'audit' && <AuditLogPage />}
                {page === 'profile' && <Profile />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </AdminCtx.Provider>
  );
}