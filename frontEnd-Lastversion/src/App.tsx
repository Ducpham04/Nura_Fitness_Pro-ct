import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuthContext } from './context/AuthContext';

// Lazy-load tất cả pages để giảm initial bundle (~724KB → chunk riêng per-route)
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const DashboardLayout = lazy(() => import('./pages/DashboardLayout'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const BodyAssessment = lazy(() => import('./pages/BodyAssessment'));
const HomePage = lazy(() => import('./pages/HomePage'));
const WorkoutTab = lazy(() => import('./components/WorkoutTab'));
const DietTab = lazy(() => import('./components/DietTab'));
const ChallengesView = lazy(() => import('./components/ChallengesView'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WelCome = lazy(() => import('./pages/WelCome'));
const AICoachPage = lazy(() => import('./pages/AICoachPage'));
const LogbookPage = lazy(() => import('./pages/LogbookPage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const PaymentResultPage = lazy(() => import('./pages/PaymentResultPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

function PageSpinner() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 border-2 border-[#CCFF00]/10 rounded-full" />
        <div className="absolute inset-0 border-2 border-[#CCFF00] rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

// AppContent is rendered inside <Router> (via App below), so useNavigate works
// in AuthProvider → useAuth.
function AppContent() {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-lime/10 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-lime rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  const adminRoute = !user
    ? <Navigate to="/login" replace />
    : user.role === 'ADMIN'
      ? <AdminPanel />
      : <Navigate to="/dashboard" replace />;

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={
          !user ? <Login /> :
          user.role === 'ADMIN' ? <Navigate to="/admin" replace /> :
          <Navigate to="/dashboard" replace />
        } />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

        {/* Auth-required pre-dashboard routes */}
        <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" replace />} />
        <Route path="/assessment" element={user ? <BodyAssessment /> : <Navigate to="/login" replace />} />
        <Route path="/welcome" element={user ? <WelCome /> : <Navigate to="/login" replace />} />

        {/* Admin route */}
        <Route path="/admin" element={adminRoute} />

        {/* Dashboard routes */}
        <Route path="/dashboard" element={
          !user ? <Navigate to="/login" replace /> :
          user.role === 'ADMIN' ? <Navigate to="/admin" replace /> :
          <DashboardLayout />
        }>
          <Route index element={<HomePage />} />
          <Route path="workout" element={<WorkoutTab />} />
          <Route path="diet" element={<DietTab />} />
          <Route path="challenges" element={<ChallengesView />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/edit" element={<ProfileEditPage />} />
          <Route path="coach" element={<AICoachPage />} />
          <Route path="logbook" element={<LogbookPage />} />
        </Route>

        {/* Password reset (public) */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Legal pages (public) */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms"   element={<TermsPage />} />

        {/* Payment result (public — VNPay redirect) */}
        <Route path="/payment/result" element={<PaymentResultPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// Router wraps AuthProvider so that useNavigate() works inside useAuth.ts
// (the 401 session-expiry handler needs navigate to redirect to /login).
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            },
          }}
        />
      </AuthProvider>
    </Router>
  );
}
