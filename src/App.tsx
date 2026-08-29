/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { MobileBottomNav } from './components/layout/MobileBottomNav.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { HomeView } from './views/HomeView.tsx';
import { DoctorProfileView } from './views/DoctorProfileView.tsx';
import { ServicesView } from './views/ServicesView.tsx';
import { BookingView } from './views/BookingView.tsx';
import { BranchesView } from './views/BranchesView.tsx';
import { FaqView } from './views/FaqView.tsx';
import { PoliciesView } from './views/PoliciesView.tsx';
import { PatientPortalView } from './views/PatientPortalView.tsx';
import { AdminApp, AdminPageKey } from './components/admin/shell.tsx';
import { AuthModal } from './views/AuthModal.tsx';
import { ToastProvider } from './components/common/Toast.tsx';
import { PWAProvider } from './pwa/PWAInstall.tsx';

/* ============================================================
   URL-based routing — replaces the old in-memory useState approach.
   The browser URL is the source of truth; refreshing restores the same view.
   ============================================================ */

type PublicView =
  | 'home'
  | 'doctor'
  | 'services'
  | 'branches'
  | 'faqs'
  | 'policies'
  | 'patient-portal'
  | 'booking';

const PUBLIC_PATHS: Record<string, PublicView> = {
  '': 'home',
  '/': 'home',
  '/home': 'home',
  '/doctor': 'doctor',
  '/services': 'services',
  '/branches': 'branches',
  '/faqs': 'faqs',
  '/policies': 'policies',
  '/patient-portal': 'patient-portal',
  '/booking': 'booking',
};

const PUBLIC_PATH_LIST: PublicView[] = [
  'home', 'doctor', 'services', 'branches', 'faqs', 'policies', 'patient-portal', 'booking',
];

const VALID_ADMIN_PAGES: AdminPageKey[] = [
  'dashboard', 'appointments', 'patients', 'branches',
  'services', 'working-hours', 'cms', 'users', 'prescriptions',
];

function pathToView(pathname: string): { view: 'admin' | PublicView; bookingParams: { branchId?: string; serviceId?: string } } {
  // Admin: /admin/<page>
  if (pathname === '/admin' || pathname === '/admin/') {
    return { view: 'admin', bookingParams: {} };
  }
  const adminMatch = pathname.match(/^\/admin\/([a-z-]+)\/?$/);
  if (adminMatch && VALID_ADMIN_PAGES.includes(adminMatch[1] as AdminPageKey)) {
    return { view: 'admin', bookingParams: {} };
  }
  // Booking: /booking?branchId=...&serviceId=...
  if (pathname === '/booking' || pathname === '/booking/') {
    const sp = new URLSearchParams(window.location.search);
    return {
      view: 'booking',
      bookingParams: {
        branchId: sp.get('branchId') || undefined,
        serviceId: sp.get('serviceId') || undefined,
      },
    };
  }
  const publicMatch = PUBLIC_PATHS[pathname];
  if (publicMatch) {
    return { view: publicMatch, bookingParams: {} };
  }
  return { view: 'home', bookingParams: {} };
}

function viewToPath(view: string, adminPage?: AdminPageKey, bookingParams?: { branchId?: string; serviceId?: string }): string {
  if (view === 'admin') {
    const p = adminPage && VALID_ADMIN_PAGES.includes(adminPage) ? adminPage : 'dashboard';
    return `/admin/${p}`;
  }
  if (view === 'booking') {
    const sp = new URLSearchParams();
    if (bookingParams?.branchId) sp.set('branchId', bookingParams.branchId);
    if (bookingParams?.serviceId) sp.set('serviceId', bookingParams.serviceId);
    const q = sp.toString();
    return `/booking${q ? `?${q}` : ''}`;
  }
  for (const [path, v] of Object.entries(PUBLIC_PATHS)) {
    if (v === view && view !== 'booking') return path || '/';
  }
  return '/';
}

function MainApp() {
  const { user, isStaff } = useAuth();

  // Routing state is derived from the URL. The history API is the source of truth.
  const [currentView, setCurrentView] = useState<string>(() => pathToView(window.location.pathname).view);
  const [adminPage, setAdminPage] = useState<AdminPageKey>(() => {
    const r = pathToView(window.location.pathname);
    if (r.view === 'admin') {
      const m = window.location.pathname.match(/^\/admin\/([a-z-]+)\/?$/);
      if (m && VALID_ADMIN_PAGES.includes(m[1] as AdminPageKey)) return m[1] as AdminPageKey;
      return 'dashboard';
    }
    return 'dashboard';
  });
  const [bookingParams, setBookingParams] = useState<{ branchId?: string; serviceId?: string }>(() => pathToView(window.location.pathname).bookingParams);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [patientTab, setPatientTab] = useState<'appointments' | 'records' | 'profile' | 'lookup' | 'prescriptions'>('appointments');

  // Sync state from URL on popstate (back/forward, refresh already initialized state)
  useEffect(() => {
    const onPop = () => {
      const r = pathToView(window.location.pathname);
      setCurrentView(r.view);
      if (r.view === 'admin') {
        const m = window.location.pathname.match(/^\/admin\/([a-z-]+)\/?$/);
        setAdminPage(m && VALID_ADMIN_PAGES.includes(m[1] as AdminPageKey) ? (m[1] as AdminPageKey) : 'dashboard');
      }
      if (r.view === 'booking') {
        setBookingParams(r.bookingParams);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((view: string, params?: { branchId?: string; serviceId?: string; patientTab?: string }) => {
    if (params) setBookingParams(params);
    if (params?.patientTab) setPatientTab(params.patientTab as any);
    const newPath = viewToPath(view, undefined, params);
    if (window.location.pathname + window.location.search !== newPath) {
      window.history.pushState({}, '', newPath);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleAdminNavigate = useCallback((page: AdminPageKey) => {
    const newPath = viewToPath('admin', page);
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
    setAdminPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#0B252C] dark:text-slate-100 transition-colors selection:bg-teal-500 selection:text-white font-sans" dir="rtl">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-[#0E3847] focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        الانتقال إلى المحتوى الرئيسي
      </a>

      {/* Navigation Header — hidden when inside the Admin Dashboard */}
      {currentView !== 'admin' && (
        <Navbar
          currentView={currentView}
          onNavigate={navigate}
          onNavigatePatient={(tab) => navigate('patient-portal', { patientTab: tab })}
          onOpenAuth={handleOpenAuth}
        />
      )}

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        {/* Admin Panel - renders AdminApp when staff and in admin section */}
        {currentView === 'admin' && isStaff && (
          <AdminApp page={adminPage} navigate={handleAdminNavigate} />
        )}

        {/* Public-facing Views */}
        {currentView === 'home' && (
          <HomeView
            onNavigate={navigate}
            onOpenBookingWithService={(serviceId) => navigate('booking', { serviceId })}
          />
        )}

        {currentView === 'doctor' && (
          <DoctorProfileView onNavigate={navigate} />
        )}

        {currentView === 'services' && (
          <ServicesView onNavigate={navigate} />
        )}

        {currentView === 'booking' && (
          <BookingView
            key={`${bookingParams.branchId || ''}-${bookingParams.serviceId || ''}`}
            initialBranchId={bookingParams.branchId}
            initialServiceId={bookingParams.serviceId}
            onNavigate={navigate}
          />
        )}

        {currentView === 'branches' && (
          <BranchesView onNavigate={navigate} />
        )}

        {currentView === 'faqs' && (
          <FaqView onNavigate={navigate} />
        )}

        {currentView === 'policies' && (
          <PoliciesView />
        )}

        {currentView === 'patient-portal' && (
          <PatientPortalView
            onNavigate={navigate}
            onOpenAuth={handleOpenAuth}
            initialTab={patientTab}
          />
        )}

        {/* Staff not logged in - show restricted access message */}
        {currentView === 'admin' && !isStaff && (
          <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-tajawal">
              منطقة مقيدة للطاقم الطبي والإداري
            </h2>
            <p className="text-xs text-slate-500">
              يرجى تسجيل الدخول بحساب موظف استقبال أو استشاري للمتابعة.
            </p>
            <button
              type="button"
              onClick={() => handleOpenAuth('login')}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm"
            >
              تسجيل الدخول للطاقم
            </button>
          </div>
        )}
      </main>

      {/* Medical Platform Footer */}
      {currentView !== 'admin' && <Footer onNavigate={navigate} />}

      {/* Mobile Fixed Bottom Bar */}
      {currentView !== 'admin' && (
        <MobileBottomNav
          currentView={currentView}
          onNavigate={navigate}
          onOpenAuth={handleOpenAuth}
        />
      )}

      {/* Unified Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
        onSuccess={() => {
          if (currentView === 'admin' && !isStaff) {
            // Re-render
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <PWAProvider>
            <MainApp />
          </PWAProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Suppress unused-var for the constant list — kept for future extensibility
void PUBLIC_PATH_LIST;
