import React from 'react';
import { Phone, MapPin, Calendar, MessageCircle, Instagram, ShieldCheck } from 'lucide-react';
import logo from '../../assets/images/logo.png';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#07333E] text-slate-300 pt-14 pb-24 md:pb-12 border-t border-[#0B3B46] no-print" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Main Footer Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-[#0B3B46]">
          {/* Right: Doctor Branding & Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white dark:bg-[#0B3B46]/40 border border-teal-500/20 dark:border-teal-400/20 flex items-center justify-center overflow-hidden ring-1 ring-white/20 dark:ring-teal-300/10">
              <img
                src={logo}
                alt="شعار عيادة د. حسام منصور أبوكل"
                className="w-full h-full object-contain p-0.5"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="text-right">
              <h3 className="text-lg font-bold text-white tracking-tight">
                د. حسام منصور أبوكل
              </h3>
              <p className="text-xs text-teal-300 font-medium">عيادة جراحة العظام</p>
            </div>
          </div>

          {/* Center Links (Matches Screenshot 2 footer) */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300 font-medium">
            <button
              onClick={() => onNavigate('policies')}
              className="hover:text-white transition-colors"
            >
              الخصوصية
            </button>
            <button
              onClick={() => onNavigate('policies')}
              className="hover:text-white transition-colors"
            >
              الشروط
            </button>
            <button
              onClick={() => onNavigate('policies')}
              className="hover:text-white transition-colors"
            >
              الإلغاء
            </button>
            <button
              onClick={() => onNavigate('policies')}
              className="hover:text-white transition-colors"
            >
              تنبيه طبي
            </button>
          </div>

          {/* Left: Quick Booking CTA */}
          <div>
            <button
              onClick={() => onNavigate('booking')}
              className="px-5 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white text-xs font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>احجز موعدك الآن</span>
            </button>
          </div>
        </div>

        {/* Detailed Clinic Contact & Branches */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-slate-300 leading-relaxed">
          {/* Branch 1 */}
          <div className="p-4 rounded-2xl bg-[#0B3B46]/60 border border-teal-900/40 space-y-2">
            <div className="flex items-center gap-2 text-teal-300 font-bold">
              <MapPin className="w-4 h-4 text-[#E05A47]" />
              <span>فرع طنطا الرئيسي</span>
            </div>
            <p className="text-slate-300">
              شارع البحر الرئيسي تقاطع طه الحكيم - أعلى مطعم حضرموت - طنطا
            </p>
            <p className="text-slate-400 text-[11px]">السبت، الإثنين، الأربعاء (4:00 - 10:00 م)</p>
          </div>

          {/* Branch 2 */}
          <div className="p-4 rounded-2xl bg-[#0B3B46]/60 border border-teal-900/40 space-y-2">
            <div className="flex items-center gap-2 text-teal-300 font-bold">
              <MapPin className="w-4 h-4 text-[#E05A47]" />
              <span>فرع زفتى</span>
            </div>
            <p className="text-slate-300">أمام مستشفى زفتى العام - زفتى - محافظة الغربية</p>
            <p className="text-slate-400 text-[11px]">الأحد، الثلاثاء، الخميس (5:00 - 10:00 م)</p>
          </div>

          {/* Contacts */}
          <div className="p-4 rounded-2xl bg-[#0B3B46]/60 border border-teal-900/40 space-y-2">
            <div className="flex items-center gap-2 text-teal-300 font-bold">
              <Phone className="w-4 h-4 text-[#E05A47]" />
              <span>أرقام الحجز والاستفسار</span>
            </div>
            <div className="flex flex-col gap-1 text-slate-300" dir="ltr">
              <a href="tel:01113244403" className="hover:text-white transition-colors">
                01113244403 (طوارئ وعيادة)
              </a>
              <a href="tel:01100171817" className="hover:text-white transition-colors">
                01100171817
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-4 text-center text-xs text-slate-400 border-t border-[#0B3B46]/60">
          <p>© {new Date().getFullYear()} عيادة د. حسام منصور أبوكل. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
};
