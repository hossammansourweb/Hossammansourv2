import React, { useState, useEffect } from 'react';
import { Branch } from '../types/index.ts';
import { api } from '../services/api.ts';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import {
  MapPin,
  Clock,
  Phone,
  Calendar,
  Navigation,
  Building2,
  ChevronLeft,
} from 'lucide-react';

interface BranchesViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const BranchesView: React.FC<BranchesViewProps> = ({ onNavigate }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await api.getClinicInfo();
        if (res.success && res.data) {
          setBranches(res.data.branches);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadBranches();
  }, []);

  if (loading) {
    return <LoadingSpinner message="جاري تجهيز بيانات الفروع والمواقع..." />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 text-right" dir="rtl">
      {/* Header Section */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
          <span>المواقع والفروع</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0E3847] dark:text-white">
          فروع ومواقع عيادات د. حسام منصور أبوكل
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
          نستقبلكم في فرعي طنطا وزفتى بمحافظة الغربية لتوفير أعلى مستوى من الرعاية الطبية والجراحية.
        </p>
      </div>

      {/* Branches Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(branches || []).map((branch, idx) => (
          <div
            key={branch.id}
            className="rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs overflow-hidden flex flex-col justify-between"
          >
            <div className="p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#153E48] flex items-center justify-center text-teal-600 dark:text-teal-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {branch.name}
                    </h2>
                    <span className="text-xs text-slate-400">
                      محافظة الغربية — {branch.city}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#E05A47] font-mono">
                  {idx < 9 ? `0${idx + 1}` : idx + 1}
                </span>
              </div>

              {/* Info Rows */}
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-[#E05A47] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-xs mb-0.5">العنوان:</strong>
                    <span className="text-xs text-slate-500 dark:text-slate-300">{branch.address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-xs mb-0.5">مواعيد العمل:</strong>
                    <span className="text-xs text-slate-500 dark:text-slate-300">{branch.workingHoursDescription}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-xs mb-0.5">أرقام التواصل:</strong>
                    <div className="flex flex-wrap gap-2 pt-0.5 font-bold text-[#0E3847] dark:text-teal-300 text-xs" dir="ltr">
                      <a href={`tel:${branch.phone}`} className="hover:underline">
                        {branch.phone}
                      </a>
                      {branch.secondaryPhone && (
                        <>
                          <span className="text-slate-300 dark:text-slate-500">•</span>
                          <a href={`tel:${branch.secondaryPhone}`} className="hover:underline">
                            {branch.secondaryPhone}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0E2C34] border-t border-slate-100 dark:border-[#17424C] flex flex-wrap gap-2.5">
              <a
                href={branch.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#174450] transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>الاتجاهات على الخريطة</span>
              </a>

              <button
                type="button"
                onClick={() => onNavigate('booking', { branchId: branch.id })}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>احجز موعد</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
