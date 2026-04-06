import { useState, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
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

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CreateListingPage = lazy(() => import('./pages/CreateListingPage'));
const ListingDetailPage = lazy(() => import('./pages/ListingDetailPage'));
const MyListingsPage = lazy(() => import('./pages/MyListingsPage'));
const TransportPage = lazy(() => import('./pages/TransportPage'));
const EwayBillPage = lazy(() => import('./pages/EwayBillPage'));
const MyEwayBills = lazy(() => import('./components/eway/MyEwayBills'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const CropDetailPage = lazy(() => import('./pages/CropDetailPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-sm text-muted-foreground animate-pulse">लोड हो रहा है...</div>
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <StateProvider>
            <AnimatePresence>
              {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            </AnimatePresence>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<MandiJiDashboard />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/listing/new" element={<ProtectedRoute><CreateListingPage /></ProtectedRoute>} />
                <Route path="/crop/:cropId" element={<CropDetailPage />} />
                <Route path="/listing/:id" element={<ListingDetailPage />} />
                <Route path="/my-listings" element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} />
                <Route path="/transport" element={<TransportPage />} />
                <Route path="/eway-bill/new" element={<ProtectedRoute><EwayBillPage /></ProtectedRoute>} />
                <Route path="/my-eway-bills" element={<ProtectedRoute><MyEwayBills /></ProtectedRoute>} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogArticlePage />} />
                <Route path="/admin/*" element={<AdminRoute><AdminLayout /></AdminRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <Toast />
          </StateProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
