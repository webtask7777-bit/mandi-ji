import { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import './index.css';
import SplashScreen from './components/SplashScreen';
import MandiJiDashboard from './MandiJiDashboard';
import { StateProvider } from './context/StateContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import Toast from './components/ui/Toast';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import SEO from './components/SEO';
import RouteScroll from './components/RouteScroll';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CreateListingPage = lazy(() => import('./pages/CreateListingPage'));
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'));
const MyListingsPage = lazy(() => import('./pages/MyListingsPage'));
const TransportPage = lazy(() => import('./pages/TransportPage'));
const SellComparePage = lazy(() => import('./pages/SellComparePage'));
const DataStatusPage = lazy(() => import('./pages/DataStatusPage'));
const EwayBillPage = lazy(() => import('./pages/EwayBillPage'));
const MyEwayBills = lazy(() => import('./components/eway/MyEwayBills'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const CropDetailPage = lazy(() => import('./pages/CropDetailPage'));
const MandiDetailPage = lazy(() => import('./pages/MandiDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const LanguagesPage = lazy(() => import('./pages/LanguagesPage'));
const LanguageToolsPage = lazy(() => import('./pages/LanguageToolsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'));
const KisanCalendarPage = lazy(() => import('./pages/KisanCalendarPage'));
const KisanSalahPage = lazy(() => import('./pages/KisanSalahPage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-sm text-muted-foreground animate-pulse">लोड हो रहा है...</div>
    </div>
  );
}

function App({ prerender = false, initialPage }) {
  const { pathname } = useLocation();
  const needsAccountMetadata = /^\/(?:admin|register|my-listings|my-eway-bills|eway-bill|listing\/new)(?:\/|$)/.test(pathname);
  const [showSplash, setShowSplash] = useState(!prerender);
  const CropPage = initialPage?.kind === 'crop' ? initialPage.Component : CropDetailPage;
  const MandiPage = initialPage?.kind === 'mandi' ? initialPage.Component : MandiDetailPage;
  const ArticlePage = initialPage?.kind === 'article' ? initialPage.Component : BlogArticlePage;
  const DeliveryPage = initialPage?.kind === 'delivery' ? initialPage.Component : TransportPage;
  const LanguagePage = initialPage?.kind === 'language' ? initialPage.Component : LanguageToolsPage;
  const LanguageChooser = initialPage?.kind === 'languages' ? initialPage.Component : LanguagesPage;
  const GuideLibrary = initialPage?.kind === 'blog' ? initialPage.Component : BlogPage;
  const CalendarPage = initialPage?.kind === 'calendar' ? initialPage.Component : KisanCalendarPage;
  const SalahPage = initialPage?.kind === 'salah' ? initialPage.Component : KisanSalahPage;

  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <StateProvider>
            {needsAccountMetadata && <SEO title="आपका खाता" noIndex />}
            <AnimatePresence>
              {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            </AnimatePresence>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<MandiJiDashboard />} />
                <Route path="/languages" element={<LanguageChooser />} />
                <Route path="/kisan-calendar" element={<CalendarPage />} />
                <Route path="/kisan-salah" element={<SalahPage />} />
                <Route path="/:language/mandi-bhav" element={<LanguagePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/listing/new" element={<ProtectedRoute><CreateListingPage /></ProtectedRoute>} />
                <Route path="/crop/:cropId" element={<CropPage />} />
                <Route path="/mandi-bhav/:stateId" element={<MandiJiDashboard />} />
                <Route path="/mandi-bhav/:stateId/:cropId" element={<CropPage />} />
                <Route path="/mandi/:stateId/:mandiSlug" element={<MandiPage />} />
                <Route path="/listing/:id" element={<ListingDetailPage />} />
                <Route path="/my-listings" element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} />
                <Route path="/delivery-calculator" element={<DeliveryPage />} />
                <Route path="/bechne-ka-hisab" element={<SellComparePage />} />
                <Route path="/data-status" element={<DataStatusPage />} />
                <Route path="/transport" element={<Navigate to="/delivery-calculator" replace />} />
                <Route path="/eway-bill/new" element={<ProtectedRoute><EwayBillPage /></ProtectedRoute>} />
                <Route path="/my-eway-bills" element={<ProtectedRoute><MyEwayBills /></ProtectedRoute>} />
                <Route path="/pricing" element={<Navigate to="/" replace />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/blog" element={<GuideLibrary />} />
                <Route path="/:language/blog" element={<GuideLibrary />} />
                <Route path="/blog/:slug" element={<ArticlePage />} />
                <Route path="/admin/*" element={<AdminRoute><AdminLayout /></AdminRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <RouteScroll />
            <Toast />
          </StateProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
