import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminAPI, tournamentAPI, organizerAPI, reportAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import TeamApprovalPanel from '../components/admin/TeamApprovalPanel';
import StudentDashboard from '../components/admin/StudentDashboard';

const TABS = ['Overview', 'Tournaments', 'Teams', 'Organizers', 'Reports', 'Users', 'Students'];

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role !== 'faculty') { navigate('/'); return; }
    adminAPI.getStats().then(r => setStats(r.data)).catch(() => {});
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const loaders = {
      Tournaments: () => tournamentAPI.pendingApprovals(),
      Organizers: () => organizerAPI.listRequests('pending'),
      Reports: () => reportAPI.list('pending'),
      Users: () => adminAPI.listUsers(),
    };
    if (loaders[tab]) {
      loaders[tab]().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
    } else { setLoading(false); }
  }, [tab]);

  const approveTournament = async (id, action) => {
    const reason = action === 'reject' ? prompt('Rejection reason (optional):') : null;
    try {
      await tournamentAPI.approve(id, { action, reason: reason || '' });
      toast.success(`Tournament ${action}d`);
      window.dispatchEvent(new CustomEvent('tournament-status-updated', {
        detail: { tournamentId: id, action }
      }));
      setData(prev => prev.filter(t => t.id !== id));
      adminAPI.getStats().then(r => setStats(r.data));
    } catch { toast.error('Failed'); }
  };

  const approveOrganizer = async (id, action) => {
    const note = action === 'reject' ? prompt('Rejection note:') : '';
    try {
      await organizerAPI.reviewRequest(id, { action, note: note || '' });
      toast.success(`Request ${action}d`);
      setData(prev => prev.filter(r => r.id !== id));
      adminAPI.getStats().then(r => setStats(r.data));
    } catch { toast.error('Failed'); }
  };

  const resolveReport = async (id, action) => {
    try {
      await reportAPI.resolve(id, { action, note: '' });
      toast.success(`Report ${action}d`);
      setData(prev => prev.filter(r => r.id !== id));
    } catch { toast.error('Failed'); }
  };

  const banUser = async (userId, isBanned) => {
    try {
      if (isBanned) { await adminAPI.unbanUser(userId); toast.success('User unbanned'); }
      else { await adminAPI.banUser(userId, { reason: prompt('Ban reason:') || 'Policy violation' }); toast.success('User banned'); }
      adminAPI.listUsers().then(r => setData(r.data));
    } catch { toast.error('Failed'); }
  };

  const STAT_CARDS = stats ? [
    { label: 'Total Users', value: stats.total_users, color: 'text-arena-cyan', icon: '👥' },
    { label: 'Tournaments', value: stats.total_tournaments, color: 'text-arena-orange', icon: '🏆' },
    { label: 'Active Now', value: stats.active_tournaments, color: 'text-green-400', icon: '🔥' },
    { label: 'Pending Approval', value: stats.pending_approvals, color: 'text-yellow-400', icon: '⏳', alert: stats.pending_approvals > 0 },
    { label: 'Organizer Requests', value: stats.pending_organizers, color: 'text-arena-purple', icon: '📋', alert: stats.pending_organizers > 0 },
    { label: 'Open Reports', value: stats.pending_reports, color: 'text-red-400', icon: '🚨', alert: stats.pending_reports > 0 },
    { label: 'Total Teams', value: stats.total_teams, color: 'text-slate-300', icon: '👾' },
    { label: 'Confirmed Teams', value: stats.confirmed_teams, color: 'text-green-400', icon: '✅' },
  ] : [];

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="font-display font-800 text-3xl text-white">Faculty Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage tournaments, users, and reports</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-arena-border overflow-x-auto">
          {TABS.map(t => {
            const alerts = { Tournaments: stats?.pending_approvals, Organizers: stats?.pending_organizers, Reports: stats?.pending_reports };
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-600 transition-all border-b-2 -mb-px flex-shrink-0 flex items-center gap-2 ${
                  tab === t ? 'border-arena-orange text-arena-orange' : 'border-transparent text-slate-400 hover:text-white'
                }`}>
                {t}
                {alerts[t] > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white font-700">
                    {alerts[t]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Overview */}
            {tab === 'Overview' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {STAT_CARDS.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl border p-5 ${s.alert ? 'border-red-500/30 bg-red-500/5' : 'border-arena-border'}`}
                    style={!s.alert ? { background: '#0f0f1e' } : {}}>
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <p className={`font-display font-800 text-3xl ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pending Tournaments */}
            {tab === 'Tournaments' && (
              <div className="space-y-4">
                <h3 className="font-700 text-white">Pending Tournament Approvals ({data.length})</h3>
                {loading ? <Spinner /> : data.length === 0 ? (
                  <Empty text="No pending tournaments" />
                ) : data.map(t => (
                  <div key={t.id} className="rounded-xl border border-arena-border p-5"
                    style={{ background: '#0f0f1e' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-600">
                            {t.category.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500">{t.team_based ? 'Team' : 'Solo'}</span>
                        </div>
                        <h4 className="font-700 text-white text-lg">{t.title}</h4>
                        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                          <span>👤 {t.organizer?.name}</span>
                          <span>📅 {t.start_date?.split('T')[0]}</span>
                          <span>📍 {t.venue || 'VIT'}</span>
                          <span>👥 Max {t.max_participants}</span>
                          {t.prize_pool && <span>🏆 {t.prize_pool}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => approveTournament(t.id, 'approve')}
                          className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-600 hover:bg-green-500/30 transition-all">
                          ✓ Approve
                        </button>
                        <button onClick={() => approveTournament(t.id, 'reject')}
                          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-600 hover:bg-red-500/30 transition-all">
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Team Approvals - For Tournament Organizers Only */}
            {tab === 'Teams' && (
              <div>
                <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4 mb-6">
                  <p className="text-blue-300 text-sm">
                    <strong>ℹ️ Note:</strong> Only tournament organizers can approve/reject teams for tournaments they created.
                  </p>
                </div>
                <TeamApprovalPanel />
              </div>
            )}

            {/* Organizer Requests */}
            {tab === 'Organizers' && (
              <div className="space-y-4">
                <h3 className="font-700 text-white">Organizer Applications ({data.length})</h3>
                {loading ? <Spinner /> : data.length === 0 ? (
                  <Empty text="No pending organizer applications" />
                ) : data.map(req => (
                  <div key={req.id} className="rounded-xl border border-arena-border p-5"
                    style={{ background: '#0f0f1e' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-700 text-white">{req.name}</h4>
                        <p className="text-xs text-arena-orange mb-3">{req.department} · {req.user?.email}</p>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Reason</p>
                            <p className="text-sm text-slate-300">{req.reason}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Experience</p>
                            <p className="text-sm text-slate-300">{req.experience}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => approveOrganizer(req.id, 'approve')}
                          className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm font-600 hover:bg-green-500/30 transition-all">
                          ✓ Approve
                        </button>
                        <button onClick={() => approveOrganizer(req.id, 'reject')}
                          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-600 hover:bg-red-500/30 transition-all">
                          ✗ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reports */}
            {tab === 'Reports' && (
              <div className="space-y-4">
                <h3 className="font-700 text-white">Open Reports ({data.length})</h3>
                {loading ? <Spinner /> : data.length === 0 ? (
                  <Empty text="No open reports" />
                ) : data.map(r => (
                  <div key={r.id} className="rounded-xl border border-red-500/20 p-5"
                    style={{ background: '#0f0f1e' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 font-600">
                            {r.reason?.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <h4 className="font-700 text-white">{r.tournament?.title || 'Tournament'}</h4>
                        <p className="text-xs text-slate-500 mt-1">Reported by: {r.reporter?.name} ({r.reporter?.email})</p>
                        <p className="text-sm text-slate-300 mt-2">{r.description}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => resolveReport(r.id, 'resolve')}
                          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-600 hover:bg-red-500/30 transition-all">
                          Remove Tournament
                        </button>
                        <button onClick={() => resolveReport(r.id, 'dismiss')}
                          className="px-4 py-2 rounded-lg bg-slate-500/20 text-slate-400 text-sm font-600 hover:bg-slate-500/30 transition-all">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Users */}
            {tab === 'Users' && (
              <div>
                <h3 className="font-700 text-white mb-4">All Users ({data.length})</h3>
                {loading ? <Spinner /> : (
                  <div className="overflow-x-auto rounded-xl border border-arena-border" style={{ background: '#0f0f1e' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-arena-border">
                          {['Name', 'Email', 'Role', 'Reputation', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs text-slate-500 font-600 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map(u => (
                          <tr key={u.id} className="border-b border-arena-border/50 hover:bg-white/2 transition-all">
                            <td className="px-4 py-3 text-white font-500">{u.name}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-xs">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-600 ${
                                u.role === 'faculty' ? 'bg-arena-purple/20 text-arena-purple' :
                                u.role === 'organizer' ? 'bg-arena-orange/20 text-arena-orange' :
                                'bg-arena-cyan/20 text-arena-cyan'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-700 ${u.reputation_score >= 80 ? 'text-green-400' : u.reputation_score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {u.reputation_score}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-600 ${u.is_banned ? 'text-red-400' : 'text-green-400'}`}>
                                {u.is_banned ? '🚫 Banned' : '✅ Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {u.role !== 'faculty' && (
                                <button onClick={() => banUser(u.id, u.is_banned)}
                                  className={`text-xs px-3 py-1 rounded-lg font-600 transition-all ${
                                    u.is_banned
                                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}>
                                  {u.is_banned ? 'Unban' : 'Ban'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Students */}
            {tab === 'Students' && (
              <StudentDashboard />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-2 border-arena-orange border-t-transparent rounded-full animate-spin" />
  </div>
);

const Empty = ({ text }) => (
  <div className="text-center py-16 text-slate-500">
    <p className="text-4xl mb-3">✅</p>
    <p>{text}</p>
  </div>
);
