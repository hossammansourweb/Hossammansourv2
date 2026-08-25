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

  const navItems = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: Home,
      action: () => onNavigate('home'),
    },
    {
      id: 'services',
      label: 'الخدمات',
      icon: Stethoscope,
      action: () => onNavigate('services'),
    },
    {
      id: 'booking',
      label: 'حجز موعد',
      icon: Calendar,
      action: () => onNavigate('booking'),
      accent: true,
    },
    {
      id: 'patient-portal',
      label: user ? 'حسابي' : 'دخول',
      icon: User,
      action: () => {
        if (user) {
          onNavigate('patient-portal');
        } else {
          onOpenAuth('login');
        }
      },
    },
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-40 rounded-t-[1.75rem] bg-white/96 dark:bg-[#0E2C33]/96 backdrop-blur-xl border-t border-slate-200/80 dark:border-[#1A4550] px-2 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(14,56,71,0.1)] transition-colors"
      role="navigation"
      aria-label="التنقل السريع"
    >
      <div className="flex items-stretch justify-between gap-1 max-w-md mx-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl py-2 px-1.5 min-w-0 transition-all active:scale-95 cursor-pointer ${
                item.accent
                  ? 'bg-[#E05A47] text-white shadow-md shadow-[#E05A47]/30'
                  : isActive
                    ? 'bg-[#E5F1F3] dark:bg-[#1A4854] text-[#0E3847] dark:text-teal-200 font-bold shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900'
              }`}
              aria-label={item.label}
            >
              <Icon className={`w-5 h-5 ${item.accent ? 'text-white' : ''}`} />
              <span className="text-[11px] font-tajawal font-bold leading-none text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
