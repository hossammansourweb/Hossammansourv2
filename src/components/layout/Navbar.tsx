import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { usePWA } from '../../pwa/PWAInstall.tsx';
import logo from '../../assets/images/logo.png';
import {
  Calendar,
  User,
  LogOut,
  LayoutDashboard,
  Moon,
  Sun,
  Menu,
  X,
  Download,
  Stethoscope,
  Phone,
  ShieldCheck,
  ChevronLeft,
  Heart,
  HelpCircle,
  Home,
  MapPin,
  FileText,
  Image as ImageIcon,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onNavigatePatient: (tab: 'appointments' | 'records' | 'profile' | 'lookup' | 'prescriptions') => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onNavigatePatient, onOpenAuth }) => {
  const { user, logout, isStaff } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, isInstalled, promptInstall } = usePWA();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userDropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userDropdownOpen]);

  const navMenuItems = [
    { id: 'home', label: 'الرئيسية', sublabel: 'نظرة عامة', icon: Home },
    { id: 'doctor', label: 'عن الدكتور', sublabel: 'نبذة وخبرة', icon: Heart },
    { id: 'services', label: 'الخدمات', sublabel: 'الخدمات المتاحة', icon: Stethoscope },
    { id: 'booking', label: 'حجز موعد', sublabel: 'اختر الوقت المناسب', icon: Calendar },
    { id: 'branches', label: 'تواصل معنا', sublabel: 'العنوان وأرقام التواصل', icon: MapPin },
    { id: 'faqs', label: 'الأسئلة الشائعة', sublabel: 'إجابات لاستفساراتك', icon: HelpCircle },
  ];

  const handleLinkClick = (viewId: string) => {
    onNavigate(viewId);
    setDrawerOpen(false);
  };

  return (
    <>
      {/* 1. Emergency Top Bar (Matches Screenshot 1 & 2) */}
      <div className="bg-[#0B3B46] dark:bg-[#07191E] text-white text-xs sm:text-sm py-2 px-4 select-none border-b border-teal-900/40">
        <div className="max-w-7xl mx-auto flex items-center justify-center sm:justify-start gap-2">
          <a
            href="tel:01113244403"
            className="flex items-center gap-2 hover:text-teal-200 transition-colors font-medium"
            dir="rtl"
          >
            <Phone className="w-3.5 h-3.5 text-teal-300 transform -scale-x-100" />
            <span>للطوارئ:</span>
            <span dir="ltr" className="font-mono tracking-wider font-bold">01113244403</span>
          </a>
        </div>
      </div>

      {/* 2. Main Clean Navbar (Matches Screenshot 1 & 2) */}
      <header className="sticky top-0 z-40 w-full bg-white/92 dark:bg-[#0E2C33]/92 backdrop-blur-xl border-b border-slate-100/90 dark:border-[#17424C] transition-colors shadow-[0_6px_24px_rgba(14,56,71,0.06)] no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[4.5rem] sm:h-20">
            {/* Right: Brand Doctor Logo & Title */}
            <div
              onClick={() => handleLinkClick('home')}
              className="flex items-center gap-3 cursor-pointer select-none group"
            >
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <h1 className="text-base sm:text-lg font-extrabold text-[#0E3847] dark:text-white tracking-tight">
                    د. حسام منصور أبوكل
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-300 font-medium">
                  استشاري جراحة العظام
                </p>
              </div>

              {/* Clinic Logo (real PNG asset) */}
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-[#123842] border border-slate-200/80 dark:border-[#1F4E5A] flex items-center justify-center overflow-hidden shadow-2xs group-hover:scale-105 transition-transform ring-1 ring-teal-500/10 dark:ring-teal-400/10">
                <img
                  src={logo}
                  alt="شعار عيادة د. حسام منصور أبوكل"
                  className="w-full h-full object-contain p-0.5"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navMenuItems.map(link => {
                const isActive = currentView === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => handleLinkClick(link.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'text-[#E05A47] dark:text-[#f27463] bg-[#E05A47]/10 dark:bg-[#E05A47]/20 font-bold after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-[#E05A47]'
                        : 'text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#123842]'
                    }`}
                  >
                    {link.label}
                  </button>
                );
              })}
            </nav>

            {/* Left Controls: Menu button + Theme toggle */}
            <div className="flex items-center gap-2 sm:gap-3" dir="ltr">
              {/* Mobile menu button - icon only on mobile, hidden on desktop */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden w-10 h-10 rounded-full border border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] hover:bg-slate-50 dark:hover:bg-[#184854] text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                aria-label="فتح القائمة"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Theme toggle in rounded circle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
                title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] flex items-center justify-center text-slate-700 dark:text-amber-300 hover:bg-slate-50 dark:hover:bg-[#184854] shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4.5 h-4.5 text-amber-300" />
                ) : (
                  <Moon className="w-4.5 h-4.5 text-slate-700" />
                )}
              </button>

              {/* Account control - desktop only (role-aware) */}
              {!user && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="hidden lg:flex w-10 h-10 rounded-full border border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] hover:bg-slate-50 dark:hover:bg-[#184854] text-slate-700 dark:text-slate-200 items-center justify-center shadow-2xs transition-colors cursor-pointer"
                  aria-label="تسجيل الدخول"
                  title="تسجيل الدخول"
                >
                  <User className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
                </button>
              )}

              {user && isStaff && (
                <button
                  type="button"
                  onClick={() => handleLinkClick('admin')}
                  className="hidden lg:flex items-center gap-2 h-10 px-4 rounded-full border border-[#E05A44]/30 dark:border-[#E05A44]/40 bg-[#E05A44]/10 dark:bg-[#E05A44]/20 hover:bg-[#E05A44]/15 text-[#E05A44] dark:text-[#f27463] font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                  aria-label="لوحة التحكم"
                  title="لوحة التحكم"
                >
                  <LayoutDashboard className="w-4.5 h-4.5" />
                  <span>لوحة التحكم</span>
                </button>
              )}

              {user && !isStaff && (
                <div className="hidden lg:block relative" ref={userMenuRef} dir="rtl">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(o => !o)}
                    className="flex items-center gap-2 h-10 px-3 rounded-full border border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] hover:bg-slate-50 dark:hover:bg-[#184854] text-slate-700 dark:text-slate-200 shadow-2xs transition-colors cursor-pointer"
                    aria-label="حسابي"
                    aria-haspopup="menu"
                    aria-expanded={userDropdownOpen}
                  >
                    <span className="w-7 h-7 rounded-full bg-[#0E3847] dark:bg-teal-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {(user.name || 'م').trim().charAt(0)}
                    </span>
                    <span className="text-xs font-bold max-w-[7rem] truncate">{user.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userDropdownOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 top-[calc(100%+0.5rem)] w-60 z-50 rounded-2xl bg-white dark:bg-[#0E2C33] border border-slate-200 dark:border-[#17424C] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-[#17424C]">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                        {user.email && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-300 truncate" dir="ltr">{user.email}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => { setUserDropdownOpen(false); onNavigatePatient('records'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#164450] transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="font-medium">الملف الطبي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setUserDropdownOpen(false); onNavigatePatient('prescriptions'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#164450] transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="font-medium">روشتاتي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setUserDropdownOpen(false); onNavigatePatient('appointments'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#164450] transition-colors cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="font-medium">حجوزاتي</span>
                      </button>

                      <div className="my-1 h-px bg-slate-100 dark:bg-[#17424C]" />

                      <button
                        type="button"
                        onClick={() => { setUserDropdownOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span className="font-medium">تسجيل الخروج</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 3. Slide-Out Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-sm w-full bg-white dark:bg-[#0E2C33] shadow-2xl flex flex-col justify-between p-5 z-50 animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-[#17424C]">
            <div className="space-y-6">
              {/* Brand + Close */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#17424C]">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#153E48] text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#1A4550] transition-colors cursor-pointer"
                  aria-label="إغلاق القائمة"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-[#0E3847] dark:text-white leading-tight">د. حسام منصور أبوكل</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-300">استشاري جراحة العظام</p>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] overflow-hidden flex items-center justify-center shrink-0">
                    <img src={logo} alt="شعار العيادة" className="w-full h-full object-contain p-0.5" />
                  </div>
                </div>
              </div>

              {/* Menu Items List */}
              <div className="space-y-2">
                {navMenuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleLinkClick(item.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-right ${
                        isActive
                          ? 'border-[#E05A47] bg-[#E05A47]/10 dark:bg-[#E05A47]/20 text-[#E05A47] dark:text-[#f27463] font-bold'
                          : 'border-slate-200/80 dark:border-[#1A4550] bg-white dark:bg-[#123842] hover:bg-slate-50 dark:hover:bg-[#164450] text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <div className="flex-1 min-w-0 text-right">
                        <span className="block text-sm font-bold">{item.label}</span>
                        <span className="block text-[11px] text-slate-400 dark:text-slate-300">{item.sublabel}</span>
                      </div>
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-[#E05A47] text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-[#0E2C33] text-[#0E3847] dark:text-teal-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-[#17424C] space-y-3">
              {canInstall && !isInstalled && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    promptInstall();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#0E3847] dark:bg-teal-700 hover:bg-[#092631] dark:hover:bg-teal-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تثبيت التطبيق</span>
                </button>
              )}

              {user ? (
                <div className="space-y-2">
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => handleLinkClick('admin')}
                      className="w-full py-3 px-4 rounded-xl bg-[#E05A47]/10 dark:bg-[#E05A47]/20 border border-[#E05A44]/30 dark:border-[#E05A44]/40 text-[#E05A44] dark:text-[#f27463] text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>لوحة التحكم</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleLinkClick('patient-portal')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-[#123842] text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4 text-teal-600" />
                    <span>الملف الطبي وحجوزاتي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setDrawerOpen(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#0E3847] dark:bg-teal-700 hover:bg-[#092631] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md"
                >
                  <User className="w-4 h-4" />
                  <span>تسجيل الدخول / إنشاء حساب</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
