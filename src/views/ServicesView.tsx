import React, { useState, useEffect } from 'react';
import { MedicalService } from '../types/index.ts';
import { api } from '../services/api.ts';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import {
  Activity,
  Bone,
  Smile,
  ShieldPlus,
  ActivitySquare,
  Syringe,
  Clock,
  HelpCircle,
  Calendar,
  ShieldCheck,
  Search,
  ChevronLeft,
  Stethoscope,
} from 'lucide-react';

interface ServicesViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ onNavigate }) => {
  const [services, setServices] = useState<MedicalService[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      try {
        const res = await api.getClinicInfo();
        if (res.success && res.data) {
          setServices(res.data.services);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bone':
        return <Bone className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'ShieldPlus':
        return <ShieldPlus className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'ActivitySquare':
        return <ActivitySquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'Smile':
        return <Smile className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'Syringe':
        return <Syringe className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      default:
        return <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    }
  };

  if (loading) {
    return <LoadingSpinner message="جاري تجهيز دليل الخدمات..." />;
  }

  const categories = ['all', ...Array.from(new Set(services.map(s => s.category)))];

  const filteredServices = services.filter(s => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 text-right" dir="rtl">
      {/* Header Section */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
          <span>الخدمات والتخصصات</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0E3847] dark:text-white">
          خدمات معتمدة، وتفاصيل واضحة قبل الحجز
        </h1>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2 max-w-2xl leading-relaxed font-medium">
          جميع الخدمات والاستشارات مقدمة بإشراف د. حسام منصور أبوكل — استشاري جراحة العظام والمفاصل بالقوات المسلحة.
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#E05A47] text-white shadow-2xs'
                  : 'bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#153E48]'
              }`}
            >
              {cat === 'all' ? 'جميع الخدمات' : cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="بحث عن تخصص أو جراحة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service, idx) => (
          <div
            key={service.id}
            className="p-6 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-[#E05A47]">
                  {idx < 9 ? `0${idx + 1}` : idx + 1}
                </span>
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#153E48] flex items-center justify-center">
                  {getServiceIcon(service.iconName)}
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {service.name}
              </h2>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                {service.description}
              </p>

              <div className="pt-2 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>مدة الموعد: {service.durationMinutes} دقيقة</span>
                </div>
              </div>

              {/* Service FAQ if exists */}
              {service.faqs && service.faqs.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200/50 dark:border-[#1F4E5A] text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  <span className="font-bold block text-slate-800 dark:text-slate-200">
                    س: {service.faqs[0].question}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {service.faqs[0].answer}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-[#17424C] flex items-center justify-between">
              {service.isPriceVisible && service.price ? (
                <span className="text-xs font-bold text-[#0E3847] dark:text-teal-300">
                  {service.price} ج.م
                </span>
              ) : (
                <span className="text-xs text-slate-400">استشارة سريرية</span>
              )}

              <button
                type="button"
                onClick={() => onNavigate('booking', { serviceId: service.id })}
                className="px-4 py-2 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>احجز موعد</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trust & Medical Disclaimer */}
      <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900 flex items-start gap-3 text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">تنبيه طبي:</span>
          المعلومات المنشورة للتوضيح والتثقيف الصحي وتسهيل الحجز، والخطة العلاجية الدقيقة تقرر بعد الفحص السريري من قبل الطبيب المعالج.
        </div>
      </div>
    </div>
  );
};
