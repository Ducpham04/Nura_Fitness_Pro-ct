import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/DashboardLayout';
import AdminPanel from './pages/AdminPanel';
import Onboarding from './pages/Onboarding';
import BodyAssessment from './pages/BodyAssessment';
import HomePage from './pages/HomePage';
import WorkoutTab from './components/WorkoutTab';
import DietTab from './components/DietTab';
import ChallengesView from './components/ChallengesView';
import ProfilePage from './pages/ProfilePage';
import WelCome from './pages/WelCome';
import AICoachPage from './pages/AICoachPage';
import LogbookPage from './pages/LogbookPage';
import ProfileEditPage from './pages/ProfileEditPage';

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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
