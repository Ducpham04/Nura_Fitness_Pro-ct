import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { authService } from './services/authService';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/DashboardLayout';
import AdminPanel from './pages/AdminPanel';
import Onboarding from './pages/Onboarding';
import HomePage from './pages/HomePage';
import WorkoutTab from './components/WorkoutTab';
import DietTab from './components/DietTab';
import ChallengesView from './components/ChallengesView';
import ProfilePage from './pages/ProfilePage';
import WelCome from './pages/WelCome';
import AICoachPage from './pages/AICoachPage';
import LogbookPage from './pages/LogbookPage';

function AppContent() {
  const [isInitialized, setIsInitialized] = useState(false);
  const { user } = useAuthContext();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          if (!storedUser) {
            const currentUser = await authService.getCurrentUser();
            if (!currentUser) {
              authService.clearAuthData();
            }
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-lime/10 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-lime rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/welcome" element={<WelCome />} />
        
        {/* Admin route */}
        <Route path="/admin" element={user ? <AdminPanel /> : <Navigate to="/" replace />} />
        
        {/* Dashboard routes */}
        <Route path="/dashboard" element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<HomePage />} />
          <Route path="workout" element={<WorkoutTab />} />
          <Route path="diet" element={<DietTab />} />
          <Route path="challenges" element={<ChallengesView />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="coach" element={<AICoachPage />} />
          <Route path="logbook" element={<LogbookPage />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
