import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Facebook, Instagram, ArrowUpLeft, Sparkles, MessageCircle } from 'lucide-react';

/**
 * Official WhatsApp brand mark — lucide-react does not ship a WhatsApp icon,
 * so we inline the brand SVG to keep visual accuracy.
 */
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    aria-hidden="true"
    className={className}
    fill="currentColor"
  >
    <path d="M16.003 3C9.373 3 4 8.373 4 14.997c0 2.385.69 4.605 1.884 6.49L4 29l7.704-1.84a11.94 11.94 0 0 0 4.299.836h.005C22.629 27.996 28 22.623 28 16.002 28 12.84 26.735 9.86 24.485 7.61 22.234 5.36 19.165 4.05 16.003 4.05V3zm0 1.998c2.7 0 5.198 1.05 7.071 2.927 1.873 1.873 2.928 4.37 2.928 7.074 0 5.514-4.484 9.998-10 9.998h-.004a9.94 9.94 0 0 1-3.916-.81l-.29-.121-4.572 1.092 1.111-4.45-.155-.247a9.96 9.96 0 0 1-1.18-4.51c0-5.51 4.487-9.953 10.007-9.953zm-2.78 5.13c-.36 0-.96.135-1.46.677-.495.54-1.92 1.876-1.92 4.572 0 2.696 1.965 5.302 2.241 5.667.27.36 3.85 5.881 9.337 8.252 1.305.563 2.318.9 3.111 1.155 1.305.413 2.493.354 3.434.214 1.046-.156 3.2-1.31 3.654-2.572.45-1.26.45-2.34.314-2.566-.135-.225-.495-.36-1.035-.63-.54-.27-3.2-1.58-3.694-1.76-.495-.18-.855-.27-1.215.27-.36.54-1.395 1.76-1.71 2.12-.315.36-.63.405-1.17.135-.54-.27-2.275-.838-4.336-2.673-1.604-1.43-2.685-3.196-3-3.736-.315-.54-.034-.832.236-1.102.243-.243.54-.63.81-.945.27-.315.36-.54.54-.9.18-.36.09-.675-.045-.945-.135-.27-1.21-2.916-1.66-3.99-.348-.832-.7-.832-.96-.852a8.7 8.7 0 0 0-.72-.027z" />
  </svg>
);

interface SocialLink {
  id: string;
  label: string;
  description: string;
  href: string;
  ariaLabel: string;
  cta: string;
  icon: React.ReactNode;
  // Tailwind classes — kept inline because they are composed of dynamic brand colors
  iconGradient: string;
  iconShadow: string;
  ring: string;
  accentText: string;
  accentDot: string;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    id: 'facebook',
    label: 'فيسبوك العيادة',
    description: 'تابع آخر المنشورات والإعلانات الرسمية للعيادة',
    href: 'https://www.facebook.com/share/1Er6yPDhYn/',
    ariaLabel: 'فتح صفحة فيسبوك العيادة في تبويب جديد',
    cta: 'زيارة الصفحة',
    icon: <Facebook className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.2} />,
    iconGradient:
      'from-[#1877F2] via-[#146FE5] to-[#0B57C7]',
    iconShadow: 'shadow-[#1877F2]/30',
    ring: 'ring-[#1877F2]/30',
    accentText: 'text-[#1877F2]',
    accentDot: 'bg-[#1877F2]',
  },
  {
    id: 'instagram',
    label: 'انستجرام الدكتور',
    description: 'صور الحالات، نصائح طبية، وتحديثات يومية من العيادة',
    href: 'https://www.instagram.com/hossam.mansour.35',
    ariaLabel: 'فتح حساب انستجرام الدكتور في تبويب جديد',
    cta: 'زيارة الحساب',
    icon: <Instagram className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.2} />,
    iconGradient:
      'from-[#FEDA77] via-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    iconShadow: 'shadow-[#DD2A7B]/30',
    ring: 'ring-[#DD2A7B]/30',
    accentText: 'text-[#C13584]',
    accentDot: 'bg-gradient-to-r from-[#FEDA77] via-[#DD2A7B] to-[#8134AF]',
  },
  {
    id: 'whatsapp',
    label: 'واتساب',
    description: 'تواصل مباشر وسريع مع العيادة عبر واتساب',
    href: 'https://wa.me/201100171817',
    ariaLabel: 'بدء محادثة واتساب مع العيادة',
    cta: 'محادثة فورية',
    icon: <WhatsAppIcon className="w-7 h-7 sm:w-8 sm:h-8" />,
    iconGradient: 'from-[#25D366] via-[#1FAD52] to-[#128C7E]',
    iconShadow: 'shadow-[#25D366]/30',
    ring: 'ring-[#25D366]/30',
    accentText: 'text-[#128C7E] dark:text-[#25D366]',
    accentDot: 'bg-[#25D366]',
  },
];

/**
 * Reusable Social Media / Contact Us section.
 *
 * Visual:
 *   • Header follows the existing "orange tag + teal heading" pattern
 *     used by every other section on the homepage, so the rhythm stays consistent.
 *   • Three cards on a 3-column grid (stacks to 1 column on mobile).
 *   • Each card has a layered visual: brand gradient icon medallion,
 *     soft surface background, accent dot, "visit" affordance, and a
 *     subtle radial gradient backdrop that paints the brand color.
 *
 * Motion:
 *   • Section reveal is viewport-triggered, staggered.
 *   • Hover: card lifts, icon scales, accent arrow nudges.
 *   • Respects prefers-reduced-motion via motion's useReducedMotion hook
 *     AND the global CSS rule in index.css.
 */
export const SocialSection: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const motionEnabled = !prefersReducedMotion;

  // The Easing shape mirrors the project's --ease-out-expo token.
  const EASE = [0.23, 1, 0.32, 1] as const;

  const containerVariants = {
    hidden: {},
    show: {
      transition: motionEnabled
        ? { staggerChildren: 0.12, delayChildren: 0.05 }
        : { staggerChildren: 0 },
    },
  };

  const itemVariants = {
    hidden: motionEnabled
      ? { opacity: 0, y: 28, scale: 0.97 }
      : { opacity: 1, y: 0, scale: 1 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.55, ease: EASE },
    },
  };

  return (
    <section
      aria-labelledby="social-section-title"
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-right"
    >
      {/* Header — matches the visual language of the rest of the homepage */}
      <motion.div
        initial={motionEnabled ? { opacity: 0, y: 14 } : false}
        whileInView={motionEnabled ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 text-right"
      >
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E05A47] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#E05A47]" />
            <span>تابعنا وتواصل معنا</span>
          </div>
          <h2
            id="social-section-title"
            className="text-2xl sm:text-3xl font-extrabold text-[#0E3847] dark:text-white"
          >
            صفحاتنا الرسمية في متناول يدك.
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
            تابع صفحاتنا الرسمية وتواصل معنا بسهولة عبر القنوات المفضلة لديك.
          </p>
        </div>

        <span
          aria-hidden="true"
          className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-[#153E48] border border-teal-100 dark:border-[#1F4E5A] rounded-full px-3 py-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#E05A47]" />
          <span>٣ قنوات للتواصل</span>
        </span>
      </motion.div>

      {/* Cards grid */}
      <motion.ul
        role="list"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5"
      >
        {SOCIAL_LINKS.map((link) => (
          <motion.li
            key={link.id}
            variants={itemVariants}
            className="list-none"
          >
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.ariaLabel}
              className={`group relative block h-full overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#1F4E5A] bg-white dark:bg-[#10333C] p-5 sm:p-6 shadow-[0_8px_24px_rgba(14,56,71,0.06)] hover:shadow-[0_22px_48px_rgba(14,56,71,0.12)] focus-visible:shadow-[0_22px_48px_rgba(14,56,71,0.12)] transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1.5 focus-visible:-translate-y-1.5 cursor-pointer`}
            >
              {/* Soft brand-tinted radial backdrop — paints on hover */}
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 ease-out bg-[radial-gradient(circle_at_top_right,_var(--brand-tint)_0%,_transparent_60%)]`}
                style={{ ['--brand-tint' as any]: 'rgba(14,56,71,0.06)' }}
              />
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -top-16 -left-16 w-44 h-44 rounded-full blur-3xl opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60 transition-opacity duration-700 ease-out ${link.accentDot}`}
              />

              <div className="relative flex flex-col h-full gap-4">
                {/* Numbered marker (subtle, matches the 01/02/03 design used elsewhere) */}
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-extrabold font-mono ${link.accentText}`}>
                    0{SOCIAL_LINKS.findIndex((l) => l.id === link.id) + 1}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full ${link.accentDot}`} aria-hidden="true" />
                </div>

                {/* Brand icon medallion */}
                <div
                  className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-gradient-to-br ${link.iconGradient} text-white flex items-center justify-center shadow-xl ${link.iconShadow} ring-1 ring-white/20 dark:ring-white/10 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110 group-hover:rotate-[-4deg] group-focus-visible:scale-110 group-focus-visible:rotate-[-4deg]`}
                >
                  <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
                  <span className="relative">{link.icon}</span>
                </div>

                {/* Label + description */}
                <div className="space-y-1.5 text-right">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                    {link.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {link.description}
                  </p>
                </div>

                {/* Footer row: CTA + arrow */}
                <div className="mt-auto pt-3 border-t border-slate-100/90 dark:border-[#17424C] flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${link.accentText}`}>
                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{link.cta}</span>
                  </span>
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 dark:bg-[#153E48] border border-slate-200/80 dark:border-[#1F4E5A] text-slate-500 dark:text-slate-300 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:bg-[#0E3847] group-hover:text-white group-hover:border-[#0E3847] group-focus-visible:bg-[#0E3847] group-focus-visible:text-white group-focus-visible:border-[#0E3847] group-hover:-translate-x-0.5 group-focus-visible:-translate-x-0.5`}
                    aria-hidden="true"
                  >
                    <ArrowUpLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </div>
            </a>
          </motion.li>
        ))}
      </motion.ul>

      {/* Quiet helper line — adds visual weight and a callback to brand identity */}
      <motion.p
        initial={motionEnabled ? { opacity: 0 } : false}
        whileInView={motionEnabled ? { opacity: 1 } : undefined}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
        className="mt-6 text-[11px] sm:text-xs text-center text-slate-500 dark:text-slate-400"
      >
        للاستفسارات العاجلة، يُفضَّل التواصل عبر واتساب أو الاتصال على الأرقام المُعلنة في صفحة الفروع.
      </motion.p>
    </section>
  );
};

export default SocialSection;
