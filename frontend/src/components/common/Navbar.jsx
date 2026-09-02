import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import toast from 'react-hot-toast';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user) {
      authAPI.getNotifications().then(r => setNotifications(r.data)).catch(() => {});
    }
  }, [user]);

  const unread = notifications.filter(n => !n.read_status).length;

  const markRead = async () => {
    setShowNotifs(v => !v);
    if (unread > 0) {
      await authAPI.markNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-arena-border"
      style={{ background: 'rgba(8,8,16,0.92)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-arena-orange flex items-center justify-center font-display font-800 text-white text-sm">A</div>
            <span className="font-display font-700 text-xl text-white">Arena<span className="text-arena-orange">X</span></span>
          </motion.div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link key={link.to} to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === link.to
                  ? 'text-arena-orange bg-arena-orange/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              {link.label}
            </Link>
          ))}
          {user?.role === 'faculty' && (
            <Link to="/admin" className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              location.pathname.startsWith('/admin')
                ? 'text-arena-purple bg-arena-purple/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>Admin</Link>
          )}
          {user?.role === 'sport_authority' && (
            <Link to="/sport-room" className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              location.pathname.startsWith('/sport-room')
                ? 'text-arena-cyan bg-arena-cyan/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}>Sport Room</Link>
          )}
          {(user?.role === 'organizer' || user?.role === 'faculty') && (
            <Link to="/create-tournament"
              className="ml-2 px-4 py-2 rounded-lg text-sm font-medium bg-arena-orange text-white hover:bg-arena-orange/90 transition-all">
              + Create
            </Link>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notifications */}
              <div className="relative">
                <button onClick={markRead}
                  className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-arena-orange rounded-full text-white text-xs flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifs && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-12 w-80 rounded-xl border border-arena-border overflow-hidden shadow-2xl"
                      style={{ background: '#0f0f1e' }}>
                      <div className="p-3 border-b border-arena-border">
                        <p className="text-sm font-600 text-white">Notifications</p>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-sm text-slate-500 text-center">No notifications</p>
                        ) : notifications.slice(0, 10).map(n => (
                          <div key={n.id} className={`p-3 border-b border-arena-border/50 ${!n.read_status ? 'bg-white/3' : ''}`}>
                            <p className="text-sm font-500 text-white">{n.title}</p>
                            <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Avatar / Menu */}
              <div className="relative">
                <button onClick={() => setShowMenu(v => !v)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                  <div className="w-7 h-7 rounded-full bg-arena-orange/20 border border-arena-orange/30 flex items-center justify-center text-arena-orange text-xs font-700">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm text-white">{user.name?.split(' ')[0]}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-600 ${
                    user.role === 'faculty' ? 'bg-arena-purple/20 text-arena-purple' :
                    user.role === 'organizer' ? 'bg-arena-orange/20 text-arena-orange' :
                    'bg-arena-cyan/20 text-arena-cyan'}`}>
                    {user.role}
                  </span>
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-12 w-48 rounded-xl border border-arena-border overflow-hidden shadow-2xl"
                      style={{ background: '#0f0f1e' }}>
                      <Link to="/profile" onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                        Profile
                      </Link>
                      <Link to="/my-tournaments" onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                        My Tournaments
                      </Link>
                      {user.role === 'sport_authority' && (
                        <Link to="/sport-room" onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-arena-cyan hover:bg-arena-cyan/5 transition-all">
                          Sport Room
                        </Link>
                      )}
                      {user.role === 'student' && (
                        <Link to="/become-organizer" onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-arena-orange hover:bg-arena-orange/5 transition-all">
                          Become Organizer
                        </Link>
                      )}
                      <button onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/5 transition-all border-t border-arena-border">
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <Link to="/login"
              className="px-5 py-2 rounded-lg bg-arena-orange text-white text-sm font-600 hover:bg-arena-orange/90 transition-all">
              Sign In
            </Link>
          )}

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-arena-border px-4 py-3 space-y-1"
            style={{ background: 'rgba(8,8,16,0.97)' }}>
            {NAV_LINKS.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                className="block px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5">
                {link.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
