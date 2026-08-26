import React, { useState, useEffect } from 'react';
import doctorImage from '../assets/images/dr_hossam.jpg';
import { DoctorProfile, Branch } from '../types/index.ts';
import { api } from '../services/api.ts';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import {
  Stethoscope,
  Award,
  CheckCircle2,
  Calendar,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronLeft,
  Heart,
} from 'lucide-react';

interface DoctorProfileViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const DoctorProfileView: React.FC<DoctorProfileViewProps> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await api.getClinicInfo();
        if (res.success && res.data) {
          setProfile(res.data.doctorProfile);
          setBranches(res.data.branches);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, []);

  if (loading) {
    return <LoadingSpinner message="جاري تجهيز الملف المهني..." />;
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4" dir="rtl">
        <p className="text-slate-600 dark:text-slate-400">تعذر تحميل بيانات الملف التعريفي للطبيب حالياً.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-[#E05A47] text-white font-bold text-sm"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 text-right" dir="rtl">
      {/* Header Profile Banner */}
      <div className="rounded-3xl bg-[#0E3847] text-white p-7 sm:p-10 shadow-lg border border-teal-900/40">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Doctor Portrait */}
          <div className="md:col-span-4 flex justify-center">
            <div className="group relative w-40 h-40 sm:w-52 sm:h-52">
              <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-white/15 ring-4 ring-[#E05A47]/30 shadow-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-90 duration-700">
                <img
                  src={doctorImage}
                  alt={profile.name}
                  className="w-full h-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-110"
                />
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-1.5 rounded-full bg-[#E05A47] text-white text-[11px] sm:text-xs font-bold shadow-lg">
                استشاري معتمد
              </div>
            </div>
          </div>

          {/* Info Details */}
          <div className="md:col-span-8 space-y-3.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47]">
              <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
              <span>{profile.militaryTitle}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              {profile.name}
            </h1>

            <p className="text-sm sm:text-base text-teal-200 font-medium">
              {profile.title}
            </p>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              {profile.bio}
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('booking')}
                className="px-6 py-3 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                <span>احجز موعدك الآن</span>
              </button>
              <a
                href="tel:01113244403"
                className="px-5 py-3 rounded-xl bg-[#0B3B46] hover:bg-[#082e38] text-white font-bold text-xs sm:text-sm border border-teal-800/60 transition-colors flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-teal-300" />
                <span dir="ltr">01113244403</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Right 2 Columns: Bio, Specialties, Philosophy */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Biography */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-4">
            <h2 className="text-lg font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#E05A47]" />
              <span>السيرة المهنية والخبرات السريرية</span>
            </h2>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {(profile.fullBiography || []).map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Specialties List */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-4">
            <h2 className="text-lg font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#E05A47]" />
              <span>مجالات التخصص الدقيق والجراحات</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(profile.specialties || []).map((spec, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200/70 dark:border-[#1F4E5A] flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
                  <span>{spec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Care Approach */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-4">
            <h2 className="text-lg font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#E05A47]" />
              <span>فلسفة الرعاية والتعامل مع المرضى</span>
            </h2>
            <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {(profile.patientCareApproach || []).map((approach, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-[#16424D] text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span>{approach}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Left Column: Branch Clinic Schedules */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#E05A47]" />
              <span>جدول ومواعيد العيادات</span>
            </h3>

            <div className="space-y-3 text-xs">
              {(branches || []).map(b => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200/80 dark:border-[#1F4E5A] space-y-2"
                >
                  <span className="font-bold text-slate-900 dark:text-white block text-sm">
                    {b.name}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300">{b.address}</p>
                  <div className="pt-1 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>{b.workingHoursDescription}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('booking', { branchId: b.id })}
                    className="w-full mt-2 py-2 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    حجز في {b.city}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Medical Integrity Card */}
          <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900 text-xs text-teal-900 dark:text-teal-200 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>الالتزام بالأمانة الطبية</span>
            </div>
            <p>
              جميع القرارات والاستشارات تخضع للفحص المباشر وفق أحدث المعايير والأدلة السريرية.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
