import React, { useState, useEffect } from 'react';
import { FAQItem } from '../types/index.ts';
import { api } from '../services/api.ts';
import { LoadingSpinner } from '../components/common/LoadingSpinner.tsx';
import { HelpCircle, ChevronDown, Search, Calendar, Phone } from 'lucide-react';

interface FaqViewProps {
  onNavigate: (view: string, params?: any) => void;
}

export const FaqView: React.FC<FaqViewProps> = ({ onNavigate }) => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqIds, setOpenFaqIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadFaqs() {
      try {
        const res = await api.getClinicInfo();
        if (res.success && res.data) {
          setFaqs(res.data.faqs);
          if (res.data.faqs.length > 0) {
            setOpenFaqIds([res.data.faqs[0].id]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFaqs();
  }, []);

  const toggleFaq = (id: string) => {
    setOpenFaqIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  if (loading) {
    return <LoadingSpinner message="جاري تجهيز الأسئلة الشائعة..." />;
  }

  const categories = ['all', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(f => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesQuery =
      f.question.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 text-right" dir="rtl">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
          <span>الأسئلة الشائعة</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0E3847] dark:text-white">
          إجابات واضحة لأهم الاستفسارات
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
          كل ما تحتاج معرفته عن الحجز، مواعيد العيادة، والفحوصات المطلوبة قبل الكشف.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث في الأسئلة أو الاستفسارات..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E05A47]"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedCategory === c
                  ? 'bg-[#E05A47] text-white shadow-2xs'
                  : 'bg-white dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#153E48]'
              }`}
            >
              {c === 'all' ? 'جميع الأسئلة' : c}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <p className="text-center py-10 text-slate-400 text-xs">
            لم يتم العثور على أسئلة تطابق بحثك.
          </p>
        ) : (
          filteredFaqs.map(faq => {
            const isOpen = openFaqIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="rounded-xl bg-white dark:bg-[#10333C] border border-slate-200/80 dark:border-[#17424C] overflow-hidden shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-4 sm:p-4.5 flex items-center justify-between text-right font-bold text-xs sm:text-sm text-slate-900 dark:text-white gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E05A47] shrink-0" />
                    <span>{faq.question}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#E05A47]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-[#17424C] space-y-2">
                    <p>{faq.answer}</p>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#153E48] text-slate-500 dark:text-slate-300">
                      التصنيف: {faq.category}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Help Banner */}
      <div className="p-5 rounded-2xl bg-slate-100/80 dark:bg-[#10333C] border border-slate-200 dark:border-[#17424C] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[#0E3847] dark:text-white">
            لديك استفسار طبي أو إداري خاص؟
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
            فريق الاستقبال بالعيادة متواجد لمساعدتكم واختيار الموعد الأنسب.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="tel:01113244403"
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#123842] border border-slate-200 dark:border-[#1F4E5A] text-slate-800 dark:text-slate-200 text-xs font-bold shadow-2xs hover:bg-slate-50 dark:hover:bg-[#174450] flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>اتصل بنا</span>
          </a>
          <button
            type="button"
            onClick={() => onNavigate('booking')}
            className="px-4 py-2 rounded-xl bg-[#E05A47] hover:bg-[#cf4f3d] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>احجز الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
