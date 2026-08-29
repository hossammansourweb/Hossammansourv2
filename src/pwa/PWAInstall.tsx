import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAContextValue {
  canInstall: boolean;
  isInstalled: boolean;
  showPrompt: boolean;
  promptInstall: () => Promise<void>;
  dismissPrompt: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  canInstall: false,
  isInstalled: false,
  showPrompt: false,
  promptInstall: async () => {},
  dismissPrompt: () => {},
});

export const usePWA = () => useContext(PWAContext);

const DISMISS_KEY = 'pwa-install-dismissed';
const DELAY_MS = 3 * 60 * 1000; // 3 minutes

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  const ios = (navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standalone || ios);
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectInstalled);
  const [showPrompt, setShowPrompt] = useState(false);
  const dismissedRef = useRef(
    typeof window !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );
  const timerFiredRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const canInstall = Boolean(deferred) && !isInstalled;

  const maybeShow = useCallback(() => {
    if (deferred && !isInstalled && !dismissedRef.current && timerFiredRef.current) {
      setShowPrompt(true);
    }
  }, [deferred, isInstalled]);

  // Capture the native install prompt
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      maybeShow();
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      dismissedRef.current = true;
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall as EventListener);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [maybeShow]);

  // Start the 3-minute timer only after the page has fully loaded.
  useEffect(() => {
    const start = () => {
      if (timerRef.current) return;
      timerRef.current = window.setTimeout(() => {
        timerFiredRef.current = true;
        maybeShow();
      }, DELAY_MS);
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.removeEventListener('load', start);
    };
  }, [maybeShow]);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
        dismissedRef.current = true;
      }
    } catch {
      /* user dismissed natively */
    } finally {
      setDeferred(null);
    }
  }, [deferred]);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    dismissedRef.current = true;
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <PWAContext.Provider value={{ canInstall, isInstalled, showPrompt, promptInstall, dismissPrompt }}>
      {children}
      <InstallSheet />
    </PWAContext.Provider>
  );
}

function InstallSheet() {
  const { showPrompt, promptInstall, dismissPrompt } = usePWA();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (showPrompt) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(t);
  }, [showPrompt]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[90] flex justify-center px-3 pb-[5.5rem] sm:pb-4 pointer-events-none"
      dir="rtl"
      aria-hidden={!visible}
    >
      <div
        role="dialog"
        aria-modal="false"
        aria-label="تثبيت تطبيق العيادة"
        className="pointer-events-auto w-full max-w-sm rounded-3xl border border-slate-200/90 dark:border-[#1F4E5A] bg-white/95 dark:bg-[#10333C]/95 backdrop-blur-xl shadow-2xl shadow-[#0E3847]/15 overflow-hidden transition-all duration-200 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
        }}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-[#0E3847] dark:bg-teal-700 flex items-center justify-center shadow-sm">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-sm font-extrabold text-[#0E3847] dark:text-white font-tajawal leading-tight">
              ثبّت موقع العيادة على جهازك
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
              استمتع بوصول أسرع وأسهل إلى الموقع من خلال تثبيته على جهازك.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissPrompt}
            aria-label="ليس الآن"
            className="shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#164450] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 pb-4">
          <button
            type="button"
            onClick={promptInstall}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0E3847] dark:bg-teal-600 hover:bg-[#092631] dark:hover:bg-teal-500 text-white text-xs font-bold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تثبيت التطبيق</span>
          </button>
          <button
            type="button"
            onClick={dismissPrompt}
            className="px-4 py-2.5 rounded-xl text-slate-500 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-[#164450] active:scale-[0.98] transition-all cursor-pointer"
          >
            ليس الآن
          </button>
        </div>
      </div>
    </div>
  );
}
