import React from 'react';
import { Home, Stethoscope, Calendar, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
}) => {
  const { user } = useAuth();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 rounded-t-3xl bg-white/96 dark:bg-[#0E2C33]/96 backdrop-blur-xl border-t border-slate-200/80 dark:border-[#1A4550] px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(14,56,71,0.1)] transition-colors" role="navigation" aria-label="التنقل السريع">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* 1. Home Tab (with pill when active as in screenshots) */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-2xl transition-all active:scale-95 cursor-pointer ${
            currentView === 'home'
              ? 'bg-[#E5F1F3] dark:bg-[#1A4854] text-[#0E3847] dark:text-teal-200 font-bold shadow-2xs'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-tajawal font-bold">الرئيسية</span>
        </button>

        {/* 2. Services Tab */}
        <button
          type="button"
          onClick={() => onNavigate('services')}
          className={`flex flex-col items-center gap-1 py-2 px-2.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
            currentView === 'services'
              ? 'text-[#0E3847] dark:text-teal-200 font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <Stethoscope className="w-5 h-5" />
          <span className="text-[11px] font-tajawal font-bold">الخدمات</span>
        </button>

        {/* 3. Center Elevated Booking Button (Matches screenshot highlight) */}
        <button
          type="button"
          onClick={() => onNavigate('booking')}
          className="flex items-center gap-1.5 py-2 px-4 rounded-2xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white shadow-md shadow-[#E05A47]/30 transition-transform active:scale-95 cursor-pointer"
          aria-label="حجز موعد"
        >
          <Calendar className="w-4 h-4" />
          <span className="text-xs font-bold font-tajawal">حجز موعد</span>
        </button>

        {/* 4. Auth / Account Tab */}
        <button
          type="button"
          onClick={() => {
            if (user) {
              onNavigate('patient-portal');
            } else {
              onOpenAuth('login');
            }
          }}
          className={`flex flex-col items-center gap-1 py-2 px-2.5 rounded-xl transition-all active:scale-95 cursor-pointer ${
            currentView === 'patient-portal'
              ? 'text-[#0E3847] dark:text-teal-200 font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[11px] font-tajawal font-bold">{user ? 'حسابي' : 'دخول'}</span>
        </button>
      </div>
    </div>
  );
};
