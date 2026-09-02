import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import CreateTournamentPage from './pages/CreateTournamentPage';
import EditTournamentPage from './pages/EditTournamentPage';
import AdminPage from './pages/AdminPage';
import InvitePage from './pages/InvitePage';
import ProfilePage from './pages/ProfilePage';
import MyTournamentsPage from './pages/MyTournamentsPage';
import NotFoundPage from './pages/NotFoundPage';
import SportRoomManagementPage from './pages/SportRoomManagementPage';
import { BecomeOrganizerPage, GlobalLeaderboardPage } from './pages/OtherPages';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-arena-bg flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-arena-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-arena-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-arena-orange flex items-center justify-center">
          <span className="font-display font-800 text-white text-3xl">A</span>
        </div>
        <div className="w-10 h-10 border-2 border-arena-orange border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
        <Route path="/leaderboard" element={<GlobalLeaderboardPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/become-organizer" element={
          <ProtectedRoute><BecomeOrganizerPage /></ProtectedRoute>
        } />
        <Route path="/create-tournament" element={
          <ProtectedRoute roles={['organizer', 'faculty']}><CreateTournamentPage /></ProtectedRoute>
        } />
        <Route path="/edit-tournament/:id" element={
          <ProtectedRoute roles={['organizer', 'faculty']}><EditTournamentPage /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['faculty']}><AdminPage /></ProtectedRoute>
        } />
        <Route path="/sport-room" element={
          <ProtectedRoute roles={['sport_authority']}><SportRoomManagementPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/my-tournaments" element={
          <ProtectedRoute><MyTournamentsPage /></ProtectedRoute>
        } />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="noise">
          <AppRoutes />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0f0f1e',
                color: '#e2e8f0',
                border: '1px solid #1e1e3a',
                borderRadius: '12px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#0f0f1e' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#0f0f1e' } },
            }}
          />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
