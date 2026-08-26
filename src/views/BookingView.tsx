import React, { useState, useEffect } from 'react';
import { Branch, MedicalService, Appointment, AvailableSlot } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { formatArabicDate, formatArabicTime, formatDateDDMMYYYY } from '../utils/date.ts';
import { CalendarExportButton } from '../components/common/CalendarExportButton.tsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import {
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  ShieldCheck,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface BookingViewProps {
  initialBranchId?: string;
  initialServiceId?: string;
  onNavigate: (view: string, params?: any) => void;
}

export const BookingView: React.FC<BookingViewProps> = ({
  initialBranchId,
  initialServiceId,
  onNavigate,
}) => {
  const { user } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Stepper: 1: Branch & Service, 2: Date & Slot, 3: Patient Info, 4: Confirmed
  const [step, setStep] = useState<number>(1);

  // Selections
  const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranchId || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || '');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Patient details form
  const [patientName, setPatientName] = useState(user?.name || '');
  const [patientPhone, setPatientPhone] = useState(user?.phone || '');
  const [patientEmail, setPatientEmail] = useState(user?.email || '');
  const [gender, setGender] = useState<'male' | 'female'>(user?.gender || 'male');
  const [age, setAge] = useState<string>(user?.age ? String(user?.age) : '');
  const [notes, setNotes] = useState('');
  const [preferredContact, setPreferredContact] = useState<'whatsapp' | 'sms' | 'phone'>('whatsapp');

  // Slots fetching state
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  // Available dates for the selected branch+service (YYYY-MM-DD set).
  // Only dates that have at least one bookable slot are kept.
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [datesLoading, setDatesLoading] = useState(false);
  const [datesLoaded, setDatesLoaded] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await api.getClinicInfo();
        if (res.success && res.data) {
          setBranches(res.data.branches);
          setServices(res.data.services);
          if (!selectedBranchId && res.data.branches.length > 0) {
            setSelectedBranchId(res.data.branches[0].id);
          }
          if (!selectedServiceId && res.data.services.length > 0) {
            setSelectedServiceId(res.data.services[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (user) {
      if (!patientName) setPatientName(user.name);
      if (!patientPhone) setPatientPhone(user.phone);
      if (!patientEmail && user.email) setPatientEmail(user.email);
    }
  }, [user]);

  // Load available slots when branch and date change
  useEffect(() => {
    if (!selectedBranchId || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    async function loadSlots() {
      setSlotsLoading(true);
      setSlotError(null);
      setSelectedSlot(null);
      try {
        const res = await api.getAvailableSlots(selectedBranchId, selectedServiceId || '', selectedDate);
        if (res.success && res.data) {
          setAvailableSlots(res.data);
          if (res.data.length === 0) {
            setSlotError('لا توجد مواعيد متاحة في هذا اليوم بالفرع المختار.');
          }
        } else {
          setSlotError('حدث خطأ أثناء تحميل المواعيد.');
        }
      } catch (err: any) {
        setSlotError(err.message || 'فشل في تحميل المواعيد.');
      } finally {
        setSlotsLoading(false);
      }
    }
    loadSlots();
  }, [selectedBranchId, selectedServiceId, selectedDate]);

  // Recalculate available dates whenever the selected branch or service changes.
  // Dates are filtered server-side by the same source of truth as the slot list
  // (working hours, holidays, existing bookings, exceptions).
  useEffect(() => {
    if (!selectedBranchId) {
      setAvailableDates(new Set());
      setDatesLoaded(false);
      return;
    }

    let cancelled = false;
    async function loadAvailableDates() {
      setDatesLoading(true);
      setDatesLoaded(false);
      try {
        const res = await api.getAvailableDates(
          selectedBranchId,
          selectedServiceId || '',
          14
        );
        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          setAvailableDates(new Set(res.data));
        } else {
          setAvailableDates(new Set());
        }
      } catch (err) {
        if (!cancelled) setAvailableDates(new Set());
      } finally {
        if (!cancelled) {
          setDatesLoading(false);
          setDatesLoaded(true);
        }
      }
    }
    loadAvailableDates();

    return () => {
      cancelled = true;
    };
  }, [selectedBranchId, selectedServiceId]);

  // If the currently selected date is no longer available for the new branch/
  // service, clear the selection (and the time slot with it).
  useEffect(() => {
    if (!datesLoaded) return;
    if (selectedDate && !availableDates.has(selectedDate)) {
      setSelectedDate('');
      setSelectedSlot(null);
    }
  }, [availableDates, datesLoaded, selectedDate]);

  const handleFinalBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !selectedServiceId || !selectedDate || !selectedSlot) {
      setBookingError('يرجى التأكد من اختيار الفرع والخدمة واليوم والوقت.');
      return;
    }

    setSubmitting(true);
    setBookingError(null);

    try {
      const res = await api.bookAppointment({
        branchId: selectedBranchId,
        serviceId: selectedServiceId,
        appointmentDate: selectedDate,
        appointmentTime: selectedSlot.time,
        patientName,
        patientPhone,
        patientEmail: patientEmail || undefined,
        patientGender: gender,
        patientAge: age ? parseInt(age, 10) : undefined,
        notes: notes || undefined,
        confirmationMethod: preferredContact,
      });

      if (res.success && res.data) {
        setConfirmedAppointment(res.data);
        setStep(4);
      } else {
        setBookingError(res.message || 'تعذر تأكيد الحجز.');
      }
    } catch (err: any) {
      setBookingError(err.message || 'حدث خطأ في النظام أثناء إتمام الحجز.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId);
  const selectedService = services.find(s => s.id === selectedServiceId);

  if (loadingInitial) {
    return <LoadingSpinner message="جاري تجهيز جدول الحجوزات..." />;
  }

  // Generate next 14 days for quick date selection
  const upcomingDays = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;

    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayName = days[d.getDay()];

    return {
      dateStr,
      dayName,
      dayNumber: d.getDate(),
      month: d.getMonth() + 1,
      monthPadded: m,
      year: y,
      dayPadded: day,
      dayOfWeek: d.getDay(),
    };
  });

  // Only show dates that have at least one bookable slot for the selected
  // branch+service. This is the source of truth — fully-booked days, holidays,
  // off-days, and days outside working hours are all hidden.
  const visibleDays = datesLoaded
    ? upcomingDays.filter(d => availableDates.has(d.dateStr))
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-right" dir="rtl">
      {/* Progress Steps Header */}
      <div className="mb-8 text-right">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
          <span>حجز موعد</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0E3847] dark:text-white">
          حجز كشف واستشارة طبية
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          خطوات بسيطة وواضحة لتأكيد موعدك المباشر في العيادة.
        </p>

        {/* Minimal Stepper Bar */}
        <div className="flex items-center gap-2 pt-6">
          {[
            { num: 1, label: 'الفرع والتخصص' },
            { num: 2, label: 'اليوم والوقت' },
            { num: 3, label: 'بيانات المريض' },
            { num: 4, label: 'تأكيد الحجز' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step >= s.num ? 'bg-[#E05A47]' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {bookingError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{bookingError}</span>
        </div>
      )}

      {/* STEP 1: Select Branch and Service */}
      {step === 1 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-6 animate-in fade-in">
          {/* Branch Selection */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#E05A47]" />
              <span>1. اختر فرع العيادة</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(branches || []).map(b => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedBranchId === b.id
                      ? 'border-[#E05A47] bg-[#E05A47]/5 dark:border-[#E05A47] dark:bg-[#E05A47]/10'
                      : 'border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] hover:border-slate-300 dark:hover:border-[#2a6878]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {b.name}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedBranchId === b.id
                          ? 'border-[#E05A47] bg-[#E05A47] text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedBranchId === b.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-1.5">{b.address}</p>
                  <div className="flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{b.workingHoursDescription}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#17424C]">
            <h2 className="text-sm font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-[#E05A47]" />
              <span>2. اختر التخصص الطبي</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(services || []).map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedServiceId(s.id)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    selectedServiceId === s.id
                      ? 'border-[#E05A47] bg-[#E05A47]/5 dark:border-[#E05A47] dark:bg-[#E05A47]/10'
                      : 'border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] hover:border-slate-300 dark:hover:border-[#2a6878]'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {s.name}
                      </span>
                      {s.isPriceVisible && s.price && (
                        <span className="text-[11px] font-bold text-[#E05A47]">
                          ({s.price} ج.م)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-1">
                      {s.description}
                    </p>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                      selectedServiceId === s.id
                        ? 'border-[#E05A47] bg-[#E05A47] text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {selectedServiceId === s.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={!selectedBranchId || !selectedServiceId}
              onClick={() => {
                setStep(2);
                if (!selectedDate) {
                  const firstAvailable = visibleDays[0]?.dateStr || upcomingDays[0]?.dateStr;
                  if (firstAvailable) setSelectedDate(firstAvailable);
                }
              }}
              className="px-7 py-3 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>متابعة لاختيار الموعد</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Date & Available Slot */}
      {step === 2 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-6 animate-in fade-in">
          {/* Summary pill */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <span className="font-bold text-[#E05A47]">الفرع:</span>
              <span>{selectedBranch?.name}</span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-[#E05A47]">الخدمة:</span>
              <span>{selectedService?.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[#E05A47] font-bold hover:underline cursor-pointer"
            >
              تغيير
            </button>
          </div>

          {/* Date Selector */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#E05A47]" />
              <span>اختر يوم الكشف</span>
            </h2>

            {datesLoading ? (
              <LoadingSpinner message="جاري فحص الأيام المتاحة لهذا الفرع..." size="sm" />
            ) : !datesLoaded ? (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs text-slate-500 dark:text-slate-300">
                جاري التحقق من المواعيد المتاحة...
              </div>
            ) : visibleDays.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>لا توجد مواعيد متاحة حالياً لهذا الفرع</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {visibleDays.map(item => {
                  const isSelected = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(item.dateStr)}
                      className={`p-2.5 rounded-xl text-center border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#E05A47] bg-[#E05A47] text-white shadow-xs'
                          : 'border-slate-200 dark:border-[#1F4E5A] bg-slate-50 dark:bg-[#123842] hover:border-slate-300 dark:hover:border-[#2a6878] text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold">{item.dayName}</span>
                      <span className="block text-base font-bold my-0.5">{item.dayNumber}</span>
                      <span className="block text-[10px] opacity-80 tabular-nums" dir="ltr">
                        {formatDateDDMMYYYY(item.dateStr)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Slots */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#17424C]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E05A47]" />
                <span>المواعيد المتاحة ليوم ({formatArabicDate(selectedDate)})</span>
              </h3>
            </div>

            {slotsLoading ? (
              <LoadingSpinner message="جاري فحص جدول المواعيد المتاحة..." size="sm" />
            ) : slotError ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{slotError}</span>
              </div>
            ) : !availableSlots || availableSlots.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد مواعيد متاحة في هذا اليوم.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {(availableSlots || []).map(slot => {
                  const isSelected = selectedSlot?.time === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl text-center text-xs font-bold border-2 transition-all cursor-pointer ${
                        !slot.isAvailable
                          ? 'opacity-30 bg-slate-100 dark:bg-[#123842]/40 border-slate-200 dark:border-[#1F4E5A] cursor-not-allowed text-slate-400 line-through'
                          : isSelected
                          ? 'border-[#E05A47] bg-[#E05A47] text-white shadow-xs'
                          : 'border-slate-200 dark:border-[#1F4E5A] bg-white dark:bg-[#123842] hover:border-[#E05A47] text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span>{formatArabicTime(slot.time)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] hover:bg-slate-200 dark:hover:bg-[#174450] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الرجوع</span>
            </button>

            <button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep(3)}
              className="px-7 py-3 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>متابعة لبيانات المريض</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Patient Info Form */}
      {step === 3 && (
        <form
          onSubmit={handleFinalBooking}
          className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-2xs space-y-5 animate-in fade-in"
        >
          {/* Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-[#0E3847] dark:text-teal-300 text-xs">
              <span>ملخص الموعد المختار</span>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-[#E05A47] hover:underline cursor-pointer"
              >
                تعديل
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600 dark:text-slate-300">
              <div><strong>الفرع:</strong> {selectedBranch?.name}</div>
              <div><strong>التخصص:</strong> {selectedService?.name}</div>
              <div><strong>التاريخ:</strong> {formatArabicDate(selectedDate)}</div>
              <div><strong>الوقت:</strong> {formatArabicTime(selectedSlot?.time || '')}</div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[#0E3847] dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[#E05A47]" />
              <span>بيانات المريض</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المريض بالكامل <span className="text-[#E05A47]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف (الواتساب) <span className="text-[#E05A47]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="01100171817"
                  value={patientPhone}
                  onChange={e => setPatientPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  النوع
                </label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  العمر (سنوات)
                </label>
                <input
                  type="number"
                  placeholder="مثال: 35"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  طريقة استلام التأكيد
                </label>
                <select
                  value={preferredContact}
                  onChange={e => setPreferredContact(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
                >
                  <option value="whatsapp">رسالة واتساب</option>
                  <option value="sms">رسالة SMS</option>
                  <option value="phone">اتصال هاتفي</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الشكوى الطبية أو ملاحظات إضافية (اختياري)
              </label>
              <textarea
                rows={2}
                placeholder="ألم في الركبة، كشف سابق..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
              />
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#123842] hover:bg-slate-200 dark:hover:bg-[#174450] text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الرجوع</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span>جاري تأكيد الحجز...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد الحجز</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: Confirmed Appointment Slip */}
      {step === 4 && confirmedAppointment && (
        <>
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-xl space-y-6 animate-in zoom-in-95 no-print">
          {/* Header Success Badge */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-[#0E3847] dark:text-white">
              تم تأكيد موعد الكشف بنجاح
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300">
              تم إرسال إشعار التأكيد ورقم الحجز إلى هاتفك.
            </p>
          </div>

          {/* Booking Card */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] gap-3">
              <div className="text-center sm:text-right">
                <span className="text-xs text-slate-400 block">رقم الحجز المرجعي</span>
                <span className="text-lg font-bold font-mono text-[#E05A47]" dir="ltr">
                  {confirmedAppointment.bookingNumber}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full">
                مؤكد في النظام
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div><span className="text-slate-400">اسم المريض:</span> <strong>{confirmedAppointment.patientName}</strong></div>
              <div><span className="text-slate-400">الطبيب:</span> <strong>د. حسام منصور أبوكل</strong></div>
              <div><span className="text-slate-400">الفرع:</span> <strong>{confirmedAppointment.branchName}</strong></div>
              <div><span className="text-slate-400">التخصص:</span> <strong>{confirmedAppointment.serviceName}</strong></div>
              <div><span className="text-slate-400">تاريخ الموعد:</span> <strong>{formatArabicDate(confirmedAppointment.appointmentDate)}</strong></div>
              <div><span className="text-slate-400">الوقت:</span> <strong className="text-[#E05A47]">{formatArabicTime(confirmedAppointment.appointmentTime)}</strong></div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-[#17424C]">
            <CalendarExportButton appointment={confirmedAppointment} variant="primary" />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#123842] hover:bg-slate-200 dark:hover:bg-[#174450] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('patient-portal')}
                className="px-4 py-2 rounded-xl bg-[#0E3847] hover:bg-[#082a36] text-white text-xs font-bold cursor-pointer"
              >
                الانتقال لمواعيدي
              </button>
            </div>
          </div>
        </div>

        {/* Professional printable invoice (only visible when printing) */}
        <div className="print-area">
          <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, color: '#0E3847', fontFamily: 'system-ui, Tahoma, sans-serif', direction: 'rtl' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0E3847', paddingBottom: 12, marginBottom: 16 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>عيادة د. حسام منصور</h1>
              <p style={{ fontSize: 11, margin: '4px 0 0', color: '#475569' }}>استشاري جراحة العظام والمفاصل</p>
              <p style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: '#0E3847' }}>إيصال تأكيد موعد الكشف</p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>رقم الحجز المرجعي</div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 1, fontFamily: 'monospace', color: '#E05A47' }} dir="ltr">{confirmedAppointment.bookingNumber}</div>
            </div>

            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', color: '#64748b', fontWeight: 700 }}>اسم المريض</td>
                  <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>{confirmedAppointment.patientName}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', color: '#64748b', fontWeight: 700 }}>رقم الهاتف</td>
                  <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }} dir="ltr">{confirmedAppointment.patientPhone}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', color: '#64748b', fontWeight: 700 }}>الطبيب</td>
                  <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>د. حسام منصور أبوكل</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', color: '#64748b', fontWeight: 700 }}>الفرع</td>
                  <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>{confirmedAppointment.branchName}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', color: '#64748b', fontWeight: 700 }}>الخدمة</td>
                  <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>{confirmedAppointment.serviceName}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 4px', color: '#64748b', fontWeight: 700 }}>تاريخ الموعد</td>
                  <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 700 }}>{formatArabicDate(confirmedAppointment.appointmentDate)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 4px', color: '#64748b', fontWeight: 700 }}>الوقت</td>
                  <td style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 800, color: '#E05A47' }}>{formatArabicTime(confirmedAppointment.appointmentTime)}</td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontSize: 11, textAlign: 'center', marginTop: 18, color: '#64748b', lineHeight: 1.6 }}>
              يرجى الحضور قبل الموعد بـ 15 دقيقة وإحضار الفحوصات والأشعة السابقة.
              <br />
              للاستعلام: 01113244403
            </p>
          </div>
        </div>
        </>
      )}
    </div>
  );
};
