/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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

function MainApp() {
  const { user, isStaff } = useAuth();

  // Admin navigation state - uses AdminPageKey from shell
  const [adminPage, setAdminPage] = useState<AdminPageKey>('dashboard');

  // Public app navigation state
  const [currentView, setCurrentView] = useState<string>('home');
  const [bookingParams, setBookingParams] = useState<{
    branchId?: string;
    serviceId?: string;
  }>({});

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');

  const handleNavigate = (view: string, params?: any) => {
    if (params) {
      setBookingParams(params);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminNavigate = (page: AdminPageKey) => {
    setAdminPage(page);
    // Scroll to top when navigating within admin
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        {/* Admin Panel - renders AdminApp when staff and in admin section */}
        {currentView === 'admin' && isStaff && (
          <AdminApp page={adminPage} navigate={handleAdminNavigate} />
        )}

        {/* Public-facing Views */}
        {currentView === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            onOpenBookingWithService={(serviceId) => handleNavigate('booking', { serviceId })}
          />
        )}

        {currentView === 'doctor' && (
          <DoctorProfileView onNavigate={handleNavigate} />
        )}

        {currentView === 'services' && (
          <ServicesView onNavigate={handleNavigate} />
        )}

        {currentView === 'booking' && (
          <BookingView
            key={`${bookingParams.branchId || ''}-${bookingParams.serviceId || ''}`}
            initialBranchId={bookingParams.branchId}
            initialServiceId={bookingParams.serviceId}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'branches' && (
          <BranchesView onNavigate={handleNavigate} />
        )}

        {currentView === 'faqs' && (
          <FaqView onNavigate={handleNavigate} />
        )}

        {currentView === 'policies' && (
          <PoliciesView />
        )}

        {currentView === 'patient-portal' && (
          <PatientPortalView
            onNavigate={handleNavigate}
            onOpenAuth={handleOpenAuth}
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
      {currentView !== 'admin' && <Footer onNavigate={handleNavigate} />}

      {/* Mobile Fixed Bottom Bar */}
      {currentView !== 'admin' && (
        <MobileBottomNav
          currentView={currentView}
          onNavigate={handleNavigate}
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
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
