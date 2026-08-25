import React, { useState, useEffect } from 'react';
import doctorPortrait from '../assets/images/doctor_hossam_portrait_1787647147771.jpg';
import {
  Branch,
  MedicalService,
  DoctorProfile,
  Review,
  FAQItem,
  Announcement,
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import { Modal } from '../components/common/Modal.tsx';
import {
  Calendar,
  CheckCircle2,
  MapPin,
  Phone,
  Clock,
  Shield,
  Star,
  ChevronDown,
  Sparkles,
  Award,
  Activity,
  HeartPulse,
  Send,
  MessageSquare,
  ExternalLink,
  ArrowLeft,
  ChevronLeft,
  AlertCircle,
  HelpCircle,
  Stethoscope,
  Bone,
  Smile,
  ShieldPlus,
  ActivitySquare,
  Syringe,
  Check,
  User,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenBookingWithService?: (serviceId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenBookingWithService }) => {
  const [data, setData] = useState<{
    branches: Branch[];
    services: MedicalService[];
    doctorProfile: DoctorProfile;
    reviews: Review[];
    faqs: FAQItem[];
    announcements: Announcement[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Review submission modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [revName, setRevName] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revTreatment, setRevTreatment] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revSuccessMsg, setRevSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.getClinicInfo();
        if (res.success && res.data) {
          setData(res.data);
          if (res.data.faqs.length > 0) {
            setOpenFaqId(res.data.faqs[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching clinic info:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevSubmitting(true);
    try {
      await api.submitReview({
        patientName: revName,
        rating: revRating,
        treatmentType: revTreatment,
        reviewText: revComment,
      });
      setRevSuccessMsg('تم إرسال تقييمك بنجاح وسيظهر بعد مراجعة واعتماد الإدارة.');
      setTimeout(() => {
        setReviewModalOpen(false);
        setRevSuccessMsg(null);
        setRevName('');
        setRevComment('');
      }, 2000);
    } catch (e: any) {
      alert(e.message || 'حدث خطأ أثناء إرسال التقييم.');
    } finally {
      setRevSubmitting(false);
    }
  };

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

  if (loading || !data) {
    return <LoadingSpinner message="جاري تجهيز العيادة..." />;
  }

  const activeAnnouncement = data.announcements?.find(a => a.isActive);

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 bg-white dark:bg-[#0B252C] transition-colors" dir="rtl">
      {/* 1. Announcement Banner */}
      {activeAnnouncement && (
        <div className="bg-[#0B3B46] dark:bg-[#07191E] text-white text-xs sm:text-sm py-2.5 px-4 shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
            <Sparkles className="w-4 h-4 text-[#E05A47] shrink-0" />
            <span className="font-medium">{activeAnnouncement.message}</span>
          </div>
        </div>
      )}

      {/* 2. Hero Section (Matches Screenshot 1 & 2) */}
      <section className="relative pt-6 sm:pt-12 pb-8 overflow-hidden hero-grid-pattern bg-white dark:bg-[#0B252C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Right Text Column (RTL Lead) */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-7 text-right">
              {/* Category Tag with accent line */}
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0E3847] dark:text-teal-300">
                <span>رعاية عظام منظمة وقريبة منك</span>
                <span className="w-8 h-[2px] bg-[#E05A47] rounded-full inline-block" />
              </div>

              {/* Main Headline */}
              <div className="space-y-1.5">
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#0E3847] dark:text-white leading-[1.18]">
                  موعد واضح.
                </h1>
                <h2 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#E05A47] leading-[1.18]">
                  خطوة مطمئنة.
                </h2>
              </div>

              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed max-w-xl font-normal">
                منصة العيادة تساعدك على مراجعة المعلومات العملية، اختيار الفرع والوقت المتاح، ثم متابعة موعدك من حسابك.
              </p>

              {/* Primary Call to Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  id="hero-book-btn"
                  onClick={() => onNavigate('booking')}
                  className="px-7 py-3.5 rounded-2xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm sm:text-base shadow-lg shadow-[#E05A47]/30 transition-all flex items-center gap-2.5 active:scale-98 cursor-pointer"
                >
                  <span>احجز موعدك الآن</span>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('doctor')}
                  className="px-5 py-3.5 rounded-2xl text-[#0E3847] dark:text-teal-300 hover:text-slate-900 dark:hover:text-white font-bold text-sm sm:text-base transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>تعرّف على الدكتور</span>
                  <ChevronLeft className="w-4 h-4 text-[#0E3847] dark:text-teal-300" />
                </button>
              </div>

              {/* Trust Box (Matches Screenshot 1 & 2 Trust Badge) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/90 dark:border-[#17424C] shadow-xs flex items-center gap-3.5 max-w-lg mt-6">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#16424D] border border-teal-100 dark:border-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    حجز منظم ومتابعة واضحة
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">
                    لن يُنشأ الموعد إلا بعد اختيار وقت متاح فعلياً.
                  </p>
                </div>
              </div>
            </div>

            {/* Left Visual Presentation: Doctor Arch with Floating Badge */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-sm sm:max-w-md">
                {/* Background decorative concentric circular ripples */}
                <div className="absolute inset-0 -m-6 rounded-full border border-teal-500/15 dark:border-teal-400/10 pointer-events-none" />
                <div className="absolute inset-0 -m-12 rounded-full border border-teal-500/10 dark:border-teal-400/5 pointer-events-none" />

                {/* Floating "خطوة 01" step badge (Matches Screenshot) */}
                <div className="absolute -top-3 -left-2 sm:left-4 z-20 bg-[#0E3847] dark:bg-[#14424D] text-white p-3 sm:p-3.5 rounded-2xl shadow-xl border border-teal-700/50 flex flex-col items-center justify-center min-w-[90px] sm:min-w-[105px] text-center">
                  <span className="text-[10px] text-teal-200 uppercase font-medium">خطوة</span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-white leading-none my-0.5">01</span>
                  <span className="text-[10px] text-teal-100 font-bold">نبدأ بالاستماع</span>
                </div>

                {/* Doctor Arch Frame */}
                <div className="relative rounded-t-[140px] sm:rounded-t-[180px] rounded-b-3xl overflow-hidden bg-linear-to-b from-[#E6F4F7] to-[#C8E8EE] dark:from-[#123842] dark:to-[#0B252C] border-2 border-teal-600/20 dark:border-teal-500/30 shadow-2xl">
                  <img
                    src={doctorPortrait}
                    alt="د. حسام منصور أبوكل"
                    className="w-full h-80 sm:h-96 object-cover object-top hover:scale-102 transition-transform duration-500"
                    loading="eager"
                  />
                  
                  {/* Overlay Bottom Gradient with Doctor Name */}
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#0E3847]/95 via-[#0E3847]/60 to-transparent p-4 sm:p-5 text-right text-white">
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      د. حسام منصور أبوكل
                    </h3>
                    <p className="text-xs text-teal-200 font-medium">
                      استشاري جراحة العظام والمفاصل
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Steps Navigation Bar (01 اختر الخدمة / 02 حدّد الفرع / 03 أكد موعدك) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs flex items-center gap-3 text-right">
            <span className="text-lg font-extrabold text-[#E05A47] font-mono">01</span>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">اختر الخدمة</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">حدد سبب الزيارة والتخصص</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs flex items-center gap-3 text-right">
            <span className="text-lg font-extrabold text-[#E05A47] font-mono">02</span>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">حدّد الفرع</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">طنطا أو زفتى والموعد المناسب</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs flex items-center gap-3 text-right">
            <span className="text-lg font-extrabold text-[#E05A47] font-mono">03</span>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">أكد موعدك</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">احصل على كود حجز فوري للمتابعة</p>
            </div>
          </div>
        </div>
      </section>

       {/* 4. About Doctor Section (Matches Screenshot 1 & 2) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs text-right space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47]">
            <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
            <span>عن الدكتور والعيادة</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0E3847] dark:text-white">
            رعاية منظمة، بخطوات مفهومة.
          </h2>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed max-w-3xl font-medium">
            توضح المنصة الخدمات المعتمدة ومعلومات الزيارة وتتيح لك إدارة الموعد من حسابك. السيرة المهنية والتفاصيل الطبية تخضع للمراجعة والنشر من إدارة العيادة لضمان أعلى معايير الشفافية والدقة السريرية.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('doctor')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] hover:bg-slate-50 dark:hover:bg-[#184854] text-slate-900 dark:text-slate-100 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <span>عرض الملف المهني</span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Services Section (Matches Screenshot 1 & 2) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 text-right">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
              <span>الخدمات والتخصصات</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0E3847] dark:text-white">
              اختر ما يناسب سبب زيارتك.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              خدمات معتمدة، تفاصيل واضحة قبل الحجز.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('services')}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#E05A47] hover:underline cursor-pointer"
          >
            <span>كل الخدمات</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(data.services || []).slice(0, 6).map((service, idx) => (
            <div
              key={service.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs hover:shadow-md transition-all text-right flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono text-[#E05A47]">
                    0{idx + 1}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-[#153E48] flex items-center justify-center text-teal-700">
                    {getServiceIcon(service.iconName)}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {service.name}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {service.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-[#17424C] flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  مدة الموعد: {service.durationMinutes} دقيقة
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenBookingWithService) {
                      onOpenBookingWithService(service.id);
                    } else {
                      onNavigate('booking', { serviceId: service.id });
                    }
                  }}
                  className="font-bold text-[#E05A47] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>حجز موعد</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. How Booking Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-right mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
            <span>كيف يتم الحجز؟</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0E3847] dark:text-white">
            تجربة واضحة من البداية للنهاية.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs text-right space-y-2">
            <span className="text-lg font-extrabold text-[#E05A47] font-mono block mb-2">01</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              اختيار الخدمة والفرع
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
              اختر نوع الكشف والفرع الأقرب لك في طنطا أو زفتى للاطلاع على الأوقات المتاحة.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs text-right space-y-2">
            <span className="text-lg font-extrabold text-[#E05A47] font-mono block mb-2">02</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              تحديد الوقت وإدخال البيانات
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
              اختر الموعد المناسب وسجل بيانات المريض للتأكيد المباشر عبر الهاتف أو الواتساب.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs text-right space-y-2">
            <span className="text-lg font-extrabold text-[#E05A47] font-mono block mb-2">03</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              تأكيد الموعد والمتابعة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
              يصلك كود حجز رسمي ويمكنك متابعة حالة الكشف وسجل الزيارات من حسابك.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Branches Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-right mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
            <span>فروع العيادة</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0E3847] dark:text-white">
            فروع مجهزة بطنطا وزفتى
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(data.branches || []).map(branch => (
            <div
              key={branch.id}
              className="p-6 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs text-right space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#17424C]">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {branch.name}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 font-semibold">
                  متاح للحجز
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#E05A47] shrink-0 mt-0.5" />
                  <span>{branch.address}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{branch.workingHoursDescription}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span dir="ltr" className="font-mono">{branch.phone}</span>
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('booking', { branchId: branch.id })}
                  className="flex-1 py-2.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  حجز في هذا الفرع
                </button>
                <a
                  href={branch.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#1F4E5A] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#123842] text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>الخريطة</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. FAQs Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-right">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
              <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
              <span>أسئلة شائعة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0E3847] dark:text-white">
              كل ما تحتاجه قبل الزيارة.
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('faqs')}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#E05A47] hover:underline cursor-pointer"
          >
            <span>عرض كل الأسئلة</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {(data.faqs || []).slice(0, 4).map(faq => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] overflow-hidden shadow-2xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-right font-bold text-xs sm:text-sm text-slate-900 dark:text-white gap-4 cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-[#E05A47]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-[#17424C]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Clean CTA Bottom Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#0E3847] dark:bg-[#10333C] text-white p-8 sm:p-10 text-center space-y-5 shadow-lg border border-teal-900/40 dark:border-[#1A4B56]">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            جاهز لحجز موعدك الطبي؟
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            اختر الفرع والوقت الأنسب لك واستلم رسالة تأكيد رسمية مباشرة.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('booking')}
              className="px-8 py-3.5 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer"
            >
              احجز موعدك الآن
            </button>
          </div>
        </div>
      </section>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="مشاركة تجربتك في العيادة"
        maxWidth="md"
      >
        {revSuccessMsg ? (
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
            <p className="text-sm font-bold">{revSuccessMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-right">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                الاسم بالكامل
              </label>
              <input
                type="text"
                required
                placeholder="مثال: محمد السيد"
                value={revName}
                onChange={e => setRevName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                التقييم
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRevRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= revRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                رأيك وتجربتك
              </label>
              <textarea
                required
                rows={3}
                placeholder="اكتب ملاحظاتك وتقييمك..."
                value={revComment}
                onChange={e => setRevComment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={revSubmitting}
              className="w-full py-3 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white font-bold text-sm shadow-md transition-colors"
            >
              {revSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم للمراجعة'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};
