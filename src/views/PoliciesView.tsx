import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, FileText, Ban, Lock, HelpCircle } from 'lucide-react';

export const PoliciesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'disclaimer' | 'privacy' | 'terms' | 'cancellation'>('disclaimer');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-right" dir="rtl">
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
          <span>السياسات والشروط المعتمدة</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0E3847] dark:text-white font-tajawal">
          السياسات وإخلاء المسؤولية الطبية
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          نلتزم بأعلى معايير الشفافية والخصوصية لحماية حقوق وسلامة المرضى.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('disclaimer')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'disclaimer'
              ? 'bg-[#E05A47] text-white shadow-xs'
              : 'bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#153E48]'
          }`}
        >
          إخلاء المسؤولية الطبية
        </button>
        <button
          onClick={() => setActiveTab('cancellation')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'cancellation'
              ? 'bg-[#E05A47] text-white shadow-xs'
              : 'bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#153E48]'
          }`}
        >
          سياسة الحجز والإلغاء
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'privacy'
              ? 'bg-[#E05A47] text-white shadow-xs'
              : 'bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#153E48]'
          }`}
        >
          سياسة الخصوصية وسرية البيانات
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'terms'
              ? 'bg-[#E05A47] text-white shadow-xs'
              : 'bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#153E48]'
          }`}
        >
          الشروط والأحكام العامة
        </button>
      </div>

      {/* Content */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] shadow-md leading-relaxed space-y-6 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
        {activeTab === 'disclaimer' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-base font-tajawal">
              <ShieldAlert className="w-5 h-5" />
              <span>إخلاء مسؤولية طبية وقانونية صريحة</span>
            </div>
            <p>
              1. جميع المعلومات الطبية، المقالات، الإرشادات الصحية، وأوصاف العمليات المنشورة على هذا الموقع مخصصة لأغراض التثقيف الصحي والتنظيم الإداري فقط.
            </p>
            <p>
              2. لا تعتبر محتويات الموقع بأي شكل من الأشكال بديلاً عن الاستشارة الطبية المباشرة، التشخيص السريري، أو خطة العلاج المعتمدة من الطبيب المعالج بعد توقيع الكشف الطبي والفحص الإكلينيكي بالعيادة.
            </p>
            <p>
              3. في حالات الطوارئ الطبية الحرجة (مثل الحوادث الجسيمة، النزيف الحاد، الاشتباه في كسور خطيرة مفتوحة)، يجب التوجه فوراً إلى أقرب قسم طوارئ بمستشفى مجهز وعدم الاكتفاء بالتواصل عبر الموقع الإلكتروني.
            </p>
            <p>
              4. لا تضمن العيادة ولا تدعي نتائج علاجية محددة أو نسبة نجاح جازمة بنسبة 100%، حيث تخضع كافة الإجراءات الطبية والجراحية لطبيعة الحالة الصحية لكل مريض واستجابته الفردية للعلاج وفق المعايير الطبية المعتمدة.
            </p>
          </div>
        )}

        {activeTab === 'cancellation' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-base font-tajawal">
              <Ban className="w-5 h-5" />
              <span>سياسة الحجز، التأكيد، والإلغاء</span>
            </div>
            <p>
              <strong>1. تثبيت وتأكيد الحجز:</strong> يتم تسجيل الحجز إلكترونياً ويحصل المريض على رقم حجز مرجعي وتصله رسالة نصية/واتساب بالتفاصيل.
            </p>
            <p>
              <strong>2. وقت الحضور:</strong> نرجو من السادة المرضى التكرم بالحضور إلى مقر العيادة قبل الموعد المحدد بـ 15 دقيقة على الأقل لتسجيل الدخول في مكتب الاستقبال وتجهيز الملف الطبي.
            </p>
            <p>
              <strong>3. إلغاء أو تعديل الموعد:</strong> يمكن للمريض إلغاء الموعد أو طلب تعديل التاريخ من خلال بوابة المرضى على الموقع أو بالتواصل هاتفياً مع موظف الاستقبال قبل الموعد بساعتين على الأقل لإتاحة الفرصة لمريض آخر.
            </p>
            <p>
              <strong>4. التخلف عن الحضور (No-Show):</strong> في حال عدم الحضور دون إشعار مسبق بعد مرور 30 دقيقة من وقت الحجز، يحق لإدارة العيادة إعطاء الدور للحالات الطارئة التالية مع حفظ حق المريض في إعادة جدولة موعده.
            </p>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-base font-tajawal">
              <Lock className="w-5 h-5" />
              <span>سياسة الخصوصية وسرية السجلات الطبية</span>
            </div>
            <p>
              <strong>1. حماية البيانات الشخصية:</strong> نلتزم بأعلى معايير الأمان لحماية بيانات المرضى وسجلاتهم الطبية وأرقام هواتفهم، ولن يتم مشاركتها أو بيعها لأي طرف ثالث لأغراض تسويقية.
            </p>
            <p>
              <strong>2. سرية التشخيص:</strong> كافة الملاحظات الطبية، نتائج الفحوصات، وصور الأشعة التي يتم حفظها في ملف المريض هي ملك خاص للمريض والطبيب المعالج، ويقتصر الاطلاع عليها على الطاقم الطبي المخول فقط.
            </p>
            <p>
              <strong>3. أمان الحسابات:</strong> يتحمل المريض مسؤولية الحفاظ على سرية كلمة المرور الخاصة بحسابه على الموقع وإبلاغ الإدارة في حال الشك بأي اختراق.
            </p>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-base font-tajawal">
              <FileText className="w-5 h-5" />
              <span>الشروط والأحكام العامة للمنصة</span>
            </div>
            <p>
              • استخدام هذا الموقع واستمارة الحجز يعتبر موافقة صريحة على كافة الشروط والسياسات المذكورة أعلاه.
            </p>
            <p>
              • تحتفظ إدارة العيادة بالحق في تعديل مواعيد العمل أو جداول الفروع وفق مقتضيات العمليات الجراحية الطارئة مع إخطار المرضى مسبقاً بأي تعديل.
            </p>
            <p>
              • جميع العلامات والشعارات والسيرة الذاتية المنشورة هي حقوق حصرية لعيادة د. حسام منصور أبوكل.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
