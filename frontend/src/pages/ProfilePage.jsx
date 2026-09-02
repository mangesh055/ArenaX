import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI, tournamentAPI, teamAPI } from '../api';
import EnhancedRegistrationForm from '../components/common/EnhancedRegistrationForm';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [myTournaments, setMyTournaments] = useState([]);

  useEffect(() => {
    if (user) {
      tournamentAPI.myTournaments().then(r => setMyTournaments(r.data)).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const reputationColor = user.reputation_score >= 80 ? 'text-green-400' :
    user.reputation_score >= 50 ? 'text-yellow-400' : 'text-red-400';

  const reputationLabel = user.reputation_score >= 80 ? 'Excellent' :
    user.reputation_score >= 50 ? 'Good' : 'Low';

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">

        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-arena-orange/20 border-2 border-arena-orange/30 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-800 text-arena-orange text-3xl">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="font-display font-800 text-3xl text-white">{user.name}</h1>
            <p className="text-slate-400 text-sm mt-1">{user.email}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className={`text-xs font-600 px-2.5 py-1 rounded-full ${
                user.role === 'faculty' ? 'bg-arena-purple/20 text-arena-purple' :
                user.role === 'organizer' ? 'bg-arena-orange/20 text-arena-orange' :
                'bg-arena-cyan/20 text-arena-cyan'}`}>
                {user.role.toUpperCase()}
              </span>
              {user.department && (
                <span className="text-xs text-slate-500">{user.department}</span>
              )}
              {user.year_of_study && (
                <span className="text-xs text-slate-500">Year {user.year_of_study}</span>
              )}
            </div>
          </div>
          <button onClick={() => setEditing(v => !v)}
            className="px-4 py-2 rounded-xl border border-arena-border text-slate-400 text-sm hover:text-white hover:border-arena-orange/50 transition-all">
            {editing ? 'Cancel' : '✏️ Edit'}
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-6">
            {/* Edit Form */}
            {editing && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-arena-orange/20 p-6"
                style={{ background: '#0f0f1e' }}>
                <h3 className="font-display font-700 text-white mb-4">Edit Profile</h3>
                <EnhancedRegistrationForm 
                  onSuccess={() => {
                    refreshUser();
                    setEditing(false);
                  }}
                  compact={false}
                />
              </motion.div>
            )}

            {/* My Tournaments */}
            <div className="rounded-2xl border border-arena-border p-6" style={{ background: '#0f0f1e' }}>
              <h3 className="font-display font-700 text-white mb-4">
                {user.role === 'organizer' || user.role === 'faculty' ? 'My Tournaments' : 'Tournaments Joined'}
              </h3>
              {myTournaments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No tournaments yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTournaments.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-arena-bg border border-arena-border/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-600 text-white text-sm truncate">{t.title}</p>
                        <p className="text-xs text-slate-500 capitalize">{t.category} · {t.mode}</p>
                      </div>
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full flex-shrink-0 ${
                        t.status === 'published' ? 'bg-green-400/10 text-green-400' :
                        t.status === 'ongoing' ? 'bg-arena-orange/10 text-arena-orange' :
                        t.status === 'completed' ? 'bg-slate-400/10 text-slate-400' :
                        t.status === 'pending_approval' ? 'bg-yellow-400/10 text-yellow-400' :
                        'bg-slate-500/10 text-slate-500'}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-4">
            {/* Reputation */}
            <div className="rounded-2xl border border-arena-border p-5" style={{ background: '#0f0f1e' }}>
              <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Reputation Score</h4>
              <div className="flex items-end gap-2 mb-3">
                <span className={`font-display font-800 text-4xl ${reputationColor}`}>
                  {user.reputation_score}
                </span>
                <span className={`text-sm font-600 mb-1 ${reputationColor}`}>{reputationLabel}</span>
              </div>
              <div className="h-2 rounded-full bg-arena-border overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all ${
                  user.reputation_score >= 80 ? 'bg-green-400' :
                  user.reputation_score >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${user.reputation_score}%` }} />
              </div>
              <p className="text-xs text-slate-500">
                Increases with successful events. Decreases with reports.
              </p>
            </div>

            {/* Account Info */}
            <div className="rounded-2xl border border-arena-border p-5 space-y-3" style={{ background: '#0f0f1e' }}>
              <h4 className="text-xs text-slate-500 uppercase tracking-wide">Account</h4>
              {[
                { label: 'Member since', value: user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A' },
                { label: 'Email domain', value: '@vit.edu', special: true },
                { label: 'Account status', value: user.is_banned ? 'Banned' : 'Active', color: user.is_banned ? 'text-red-400' : 'text-green-400' },
              ].map(({ label, value, special, color }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`text-xs font-600 ${color || (special ? 'text-arena-orange' : 'text-white')}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div className="rounded-2xl border border-arena-border p-5 space-y-2" style={{ background: '#0f0f1e' }}>
              <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Quick Links</h4>
              {[
                { label: '🏆 Browse Tournaments', href: '/tournaments' },
                ...(user.role === 'student' ? [{ label: '📋 Become Organizer', href: '/become-organizer' }] : []),
                ...(user.role === 'organizer' || user.role === 'faculty' ? [{ label: '➕ Create Tournament', href: '/create-tournament' }] : []),
                ...(user.role === 'faculty' ? [{ label: '⚙️ Admin Dashboard', href: '/admin' }] : []),
                { label: '🏅 Leaderboard', href: '/leaderboard' },
              ].map(({ label, href }) => (
                <a key={href} href={href}
                  className="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
