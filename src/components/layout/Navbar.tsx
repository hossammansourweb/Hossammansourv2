import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import {
  Calendar,
  User,
  LogOut,
  LayoutDashboard,
  Moon,
  Sun,
  Menu,
  X,
  Stethoscope,
  Phone,
  ShieldCheck,
  ChevronLeft,
  Heart,
  HelpCircle,
  Home,
  MapPin,
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenAuth }) => {
  const { user, logout, isStaff } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

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
      <header className="sticky top-0 z-40 w-full bg-white/92 dark:bg-[#0E2C33]/92 backdrop-blur-xl border-b border-slate-100/90 dark:border-[#17424C] transition-colors shadow-[0_6px_24px_rgba(14,56,71,0.06)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[4.5rem] sm:h-20">
            {/* Left Controls: Menu button + Theme toggle (in RTL, this appears on the visual left) */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Menu button with border and text (Matches screenshot) */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] hover:bg-slate-50 dark:hover:bg-[#184854] text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold shadow-2xs transition-colors cursor-pointer"
                aria-label="فتح القائمة"
              >
                <Menu className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                <span>القائمة</span>
              </button>

              {/* Theme toggle in rounded circle (Matches screenshot moon / sun) */}
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
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navMenuItems.slice(0, 5).map(link => {
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

            {/* Right: Brand Doctor Logo & Title (Matches screenshot logo styling) */}
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

              {/* Logo Spiral / Medical Icon */}
              <div className="relative w-10 h-10 rounded-full bg-slate-50 dark:bg-[#123842] border border-slate-200/80 dark:border-[#1F4E5A] flex items-center justify-center overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
                <div className="w-7 h-7 rounded-full border-2 border-t-[#0B3B46] border-r-[#E05A47] border-b-[#0B3B46] border-l-[#0B3B46] dark:border-t-teal-400 dark:border-r-[#E05A47] dark:border-b-teal-400 dark:border-l-teal-400 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#E05A47]" />
                </div>
              </div>
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
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#17424C]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-[#153E48] border border-teal-100 dark:border-teal-800 flex items-center justify-center">
                    <span className="text-[#0E3847] dark:text-teal-300 font-bold text-sm">HM</span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#0E3847] dark:text-white text-sm">
                      عيادة د. حسام منصور
                    </h3>
                    <p className="text-[11px] text-slate-400">استشاري جراحة العظام والمفاصل</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#153E48] text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Theme Switch Item in Drawer */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#1A4550] bg-slate-50/50 dark:bg-[#123842] hover:bg-slate-100 dark:hover:bg-[#164450] transition-all text-right cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-teal-300">
                    {theme === 'dark' ? 'النهاري' : 'الليلي'}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      مظهر الموقع
                    </span>
                    <span className="block text-[11px] text-slate-400 dark:text-slate-300">
                      {theme === 'dark' ? 'الوضع الليلي مفعّل' : 'الوضع النهاري مفعّل'}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0E2C33] border border-slate-200 dark:border-[#1F4E5A] flex items-center justify-center text-slate-600 dark:text-amber-300 shadow-2xs">
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 text-amber-300" />
                    ) : (
                      <Moon className="w-5 h-5 text-slate-700" />
                    )}
                  </div>
                </div>
              </button>

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
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-right ${
                        isActive
                          ? 'border-[#E05A47] bg-[#E05A47]/10 dark:bg-[#E05A47]/20 text-[#E05A47] dark:text-[#f27463] font-bold'
                          : 'border-slate-200/80 dark:border-[#1A4550] bg-slate-50/50 dark:bg-[#123842] hover:bg-slate-100 dark:hover:bg-[#164450] text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      <ChevronLeft className={`w-4 h-4 ${isActive ? 'text-[#E05A47]' : 'text-slate-400'}`} />
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="block text-sm font-bold">{item.label}</span>
                          <span className="block text-[11px] text-slate-400 dark:text-slate-300">{item.sublabel}</span>
                        </div>
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isActive
                              ? 'bg-[#E05A47] text-white shadow-sm'
                              : 'bg-white dark:bg-[#0E2C33] border border-slate-200 dark:border-[#1F4E5A] text-[#0E3847] dark:text-teal-300'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-[#17424C] space-y-3">
              {user ? (
                <div className="space-y-2">
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
