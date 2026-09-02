import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { tournamentAPI, leaderboardAPI, teamAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MyTournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activePanel, setActivePanel] = useState(null); // 'leaderboard' | 'teams' | 'status'

  const fetchMyTournaments = () => {
    tournamentAPI.myTournaments()
      .then(r => { setTournaments(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMyTournaments();
  }, []);

  useEffect(() => {
    const handleTournamentStatusUpdate = () => {
      setLoading(true);
      fetchMyTournaments();
    };

    window.addEventListener('tournament-status-updated', handleTournamentStatusUpdate);
    return () => window.removeEventListener('tournament-status-updated', handleTournamentStatusUpdate);
  }, []);

  const STATUS_COLORS = {
    draft: 'text-slate-400 bg-slate-400/10',
    pending_approval: 'text-yellow-400 bg-yellow-400/10',
    published: 'text-green-400 bg-green-400/10',
    ongoing: 'text-arena-orange bg-arena-orange/10',
    completed: 'text-slate-300 bg-slate-300/10',
    cancelled: 'text-red-400 bg-red-400/10',
  };

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-800 text-3xl text-white">My Tournaments</h1>
            <p className="text-slate-400 text-sm mt-1">
              {user?.role === 'organizer' || user?.role === 'faculty'
                ? 'Manage your tournaments, update scores, view teams'
                : 'Tournaments you have registered for'}
            </p>
          </div>
          {(user?.role === 'organizer' || user?.role === 'faculty') && (
            <Link to="/create-tournament"
              className="px-5 py-2.5 rounded-xl bg-arena-orange text-white font-600 text-sm hover:bg-arena-orange/90 transition-all">
              + New Tournament
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-arena-card border border-arena-border animate-pulse" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-4">🏆</p>
            <p className="text-white font-700 text-xl mb-2">No tournaments yet</p>
            <p className="text-slate-400 text-sm mb-6">
              {user?.role === 'organizer' ? 'Create your first tournament!' : 'Join a tournament to get started!'}
            </p>
            <Link to={user?.role === 'organizer' ? '/create-tournament' : '/tournaments'}
              className="px-6 py-3 bg-arena-orange text-white rounded-xl font-600 hover:bg-arena-orange/90 transition-all">
              {user?.role === 'organizer' ? 'Create Tournament' : 'Browse Tournaments'}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-arena-border overflow-hidden"
                style={{ background: '#0f0f1e' }}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-700 text-white truncate">{t.title}</h3>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{t.category} · {t.team_based ? 'Team' : 'Solo'}</p>
                    </div>
                    <span className={`text-xs font-600 px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[t.status]}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>{format(new Date(t.start_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>👥</span>
                      <span>{t.current_participants} / {t.max_participants} registered</span>
                    </div>
                    {t.venue && <div className="flex items-center gap-2">
                      <span>📍</span><span>{t.venue}</span>
                    </div>}
                  </div>

                  {/* Capacity */}
                  <div className="mb-4">
                    <div className="h-1.5 rounded-full bg-arena-border overflow-hidden">
                      <div className="h-full bg-arena-orange rounded-full"
                        style={{ width: `${Math.min(100, (t.current_participants / t.max_participants) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Actions for organizer/faculty */}
                  {(user?.role === 'organizer' || user?.role === 'faculty') && (
                    <div className="flex gap-2 flex-wrap">
                      <Link to={`/tournaments/${t.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white transition-all">
                        View
                      </Link>
                      {t.status !== 'cancelled' && t.status !== 'completed' && (
                        <Link to={`/edit-tournament/${t.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all">
                          ✏️ Edit
                        </Link>
                      )}
                      {(t.status === 'ongoing' || t.status === 'completed') && (
                        <button onClick={() => { setSelectedTournament(t); setActivePanel('leaderboard'); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-arena-orange/10 text-arena-orange hover:bg-arena-orange/20 transition-all">
                          📊 Scores
                        </button>
                      )}
                      {t.status === 'published' && (
                        <button onClick={() => { setSelectedTournament(t); setActivePanel('status'); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-arena-cyan/10 text-arena-cyan hover:bg-arena-cyan/20 transition-all">
                          ▶ Start
                        </button>
                      )}
                      {t.status !== 'cancelled' && t.status !== 'completed' && (
                        <button onClick={() => { setSelectedTournament(t); setActivePanel('teams'); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-arena-purple/10 text-arena-purple hover:bg-arena-purple/20 transition-all">
                          👥 Teams
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Side Panels */}
      <AnimatePresence>
        {selectedTournament && activePanel === 'leaderboard' && (
          <LeaderboardEditor
            tournament={selectedTournament}
            onClose={() => { setSelectedTournament(null); setActivePanel(null); }}
          />
        )}
        {selectedTournament && activePanel === 'teams' && (
          <TeamsViewer
            tournament={selectedTournament}
            canManageTeams={user?.role === 'organizer' && selectedTournament?.organizer_id === user?.id}
            onTeamsChanged={() => {
              setLoading(true);
              fetchMyTournaments();
            }}
            onClose={() => { setSelectedTournament(null); setActivePanel(null); }}
          />
        )}
        {selectedTournament && activePanel === 'status' && (
          <StatusUpdater
            tournament={selectedTournament}
            onClose={() => { setSelectedTournament(null); setActivePanel(null); }}
            onUpdate={(updated) => {
              setTournaments(prev => prev.map(t => t.id === updated.id ? updated : t));
              setSelectedTournament(null);
              setActivePanel(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Leaderboard Editor ───────────────────────────────────────────────────────
function LeaderboardEditor({ tournament, onClose }) {
  const [entries, setEntries] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      leaderboardAPI.get(tournament.id),
      teamAPI.getTournamentTeams(tournament.id),
    ]).then(([lb, t]) => {
      if (lb.data.length > 0) {
        setEntries(lb.data.map(e => ({ entry_name: e.entry_name, score: e.score, notes: e.notes || '' })));
      } else {
        // Pre-populate from confirmed teams
        const confirmed = t.data.filter(team => team.status === 'confirmed');
        setEntries(confirmed.map(team => ({ entry_name: team.team_name, score: 0, notes: '' })));
      }
      setTeams(t.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tournament.id]);

  const updateEntry = (i, field, val) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  };

  const addEntry = () => setEntries(prev => [...prev, { entry_name: '', score: 0, notes: '' }]);
  const removeEntry = (i) => setEntries(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const valid = entries.filter(e => e.entry_name.trim());
    if (valid.length === 0) return toast.error('Add at least one entry');
    setSaving(true);
    try {
      await leaderboardAPI.update(tournament.id, { entries: valid });
      toast.success('Leaderboard updated! 🏆');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlidePanel title={`📊 Leaderboard — ${tournament.title}`} onClose={onClose}>
      {loading ? <Spinner /> : (
        <>
          <p className="text-xs text-slate-500 mb-4">
            Entries are ranked by score (highest first). Update scores to refresh the live leaderboard.
          </p>
          <div className="space-y-3 mb-4">
            {entries.map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-arena-border flex items-center justify-center text-xs font-700 text-slate-400 flex-shrink-0">
                  #{i + 1}
                </div>
                <input
                  value={entry.entry_name}
                  onChange={e => updateEntry(i, 'entry_name', e.target.value)}
                  placeholder="Team/Player name"
                  className="flex-1 px-3 py-2 rounded-lg bg-arena-bg border border-arena-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-arena-orange/50"
                />
                <input
                  type="number"
                  value={entry.score}
                  onChange={e => updateEntry(i, 'score', parseFloat(e.target.value) || 0)}
                  placeholder="Score"
                  className="w-20 px-3 py-2 rounded-lg bg-arena-bg border border-arena-border text-arena-orange font-700 text-sm text-center focus:outline-none focus:border-arena-orange/50"
                />
                <button onClick={() => removeEntry(i)} className="text-red-400 hover:text-red-300 px-2 text-lg">×</button>
              </div>
            ))}
          </div>
          <button onClick={addEntry}
            className="w-full py-2 rounded-xl border border-dashed border-arena-border text-slate-500 text-sm hover:border-arena-orange/50 hover:text-arena-orange transition-all mb-4">
            + Add Entry
          </button>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all disabled:opacity-50">
            {saving ? 'Saving...' : '💾 Save Leaderboard'}
          </button>
        </>
      )}
    </SlidePanel>
  );
}

// ─── Teams Viewer ─────────────────────────────────────────────────────────────
function TeamsViewer({ tournament, canManageTeams, onTeamsChanged, onClose }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingTeamId, setSavingTeamId] = useState(null);
  const [rejectReason, setRejectReason] = useState({});

  const fetchTeams = async () => {
    try {
      const r = await teamAPI.getTournamentTeams(tournament.id);
      setTeams(r.data);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTeams();
  }, [tournament.id]);

  const handleApprove = async (teamId) => {
    setSavingTeamId(teamId);
    try {
      await teamAPI.approveTeam(teamId);
      toast.success('Team approved successfully');
      await fetchTeams();
      onTeamsChanged?.();
      window.dispatchEvent(new CustomEvent('tournament-participants-updated', {
        detail: { tournamentId: tournament.id }
      }));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to approve team');
    } finally {
      setSavingTeamId(null);
    }
  };

  const handleReject = async (teamId) => {
    const reason = (rejectReason[teamId] || '').trim() || 'Team does not meet requirements';
    setSavingTeamId(teamId);
    try {
      await teamAPI.rejectTeam(teamId, reason);
      toast.success('Team rejected');
      await fetchTeams();
      onTeamsChanged?.();
      setRejectReason(prev => {
        const copy = { ...prev };
        delete copy[teamId];
        return copy;
      });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to reject team');
    } finally {
      setSavingTeamId(null);
    }
  };

  const confirmed = teams.filter(t => t.status === 'confirmed');
  const pending = teams.filter(t => t.status === 'pending');
  const dropped = teams.filter(t => t.status === 'dropped');

  return (
    <SlidePanel title={`👥 Teams — ${tournament.title}`} onClose={onClose}>
      {loading ? <Spinner /> : (
        <>
          <div className="flex gap-4 mb-4 text-sm">
            <span className="text-green-400 font-600">{confirmed.length} confirmed</span>
            <span className="text-yellow-400 font-600">{pending.length} pending</span>
            <span className="text-red-400 font-600">{dropped.length} dropped</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {teams.map(team => (
              <div key={team.id} className="rounded-xl border border-arena-border p-3"
                style={{ background: '#080810' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-600 text-white text-sm">{team.team_name}</p>
                  <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${
                    team.status === 'confirmed' ? 'bg-green-400/10 text-green-400' :
                    team.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400' :
                    'bg-red-400/10 text-red-400'}`}>
                    {team.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  Leader: {team.leader?.name || 'Unknown'} · {team.confirmed_members}/{team.total_members} confirmed
                </p>
                {team.members && (
                  <div className="flex flex-wrap gap-1">
                    {team.members.map(m => (
                      <span key={m.id} className={`text-xs px-2 py-0.5 rounded-full ${
                        m.status === 'accepted' ? 'bg-green-400/10 text-green-400' :
                        m.status === 'invited' ? 'bg-yellow-400/10 text-yellow-400' :
                        'bg-red-400/10 text-red-400'}`}>
                        {m.email.split('@')[0]} {m.is_leader && '👑'}
                      </span>
                    ))}
                  </div>
                )}
                {team.verification_deadline && team.status === 'pending' && (
                  <p className="text-xs text-slate-600 mt-2">
                    Deadline: {format(new Date(team.verification_deadline), 'MMM d, h:mm a')}
                  </p>
                )}
                {canManageTeams && team.status === 'pending' && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(team.id)}
                        disabled={savingTeamId === team.id}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all disabled:opacity-50">
                        {savingTeamId === team.id ? 'Approving...' : '✓ Approve'}
                      </button>
                      <button
                        onClick={() => {
                          if (!Object.prototype.hasOwnProperty.call(rejectReason, team.id)) {
                            setRejectReason(prev => ({ ...prev, [team.id]: '' }));
                          }
                        }}
                        disabled={savingTeamId === team.id}
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50">
                        ✗ Reject
                      </button>
                    </div>

                    {Object.prototype.hasOwnProperty.call(rejectReason, team.id) && (
                      <div className="rounded-lg border border-red-500/20 p-2 bg-red-500/5">
                        <textarea
                          rows="2"
                          value={rejectReason[team.id] || ''}
                          onChange={(e) => setRejectReason(prev => ({ ...prev, [team.id]: e.target.value }))}
                          placeholder="Reason for rejection"
                          className="w-full px-2 py-1.5 rounded bg-arena-bg border border-arena-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/40"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleReject(team.id)}
                            disabled={savingTeamId === team.id}
                            className="flex-1 text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50">
                            {savingTeamId === team.id ? 'Rejecting...' : 'Confirm Reject'}
                          </button>
                          <button
                            onClick={() => {
                              setRejectReason(prev => {
                                const copy = { ...prev };
                                delete copy[team.id];
                                return copy;
                              });
                            }}
                            disabled={savingTeamId === team.id}
                            className="flex-1 text-xs px-2 py-1 rounded bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No teams registered yet</p>
            )}
          </div>
        </>
      )}
    </SlidePanel>
  );
}

// ─── Status Updater ───────────────────────────────────────────────────────────
function StatusUpdater({ tournament, onClose, onUpdate }) {
  const [saving, setSaving] = useState(false);

  const transitions = {
    published: [{ value: 'ongoing', label: '▶ Mark as Ongoing', color: 'bg-arena-orange' }],
    ongoing: [{ value: 'completed', label: '✓ Mark as Completed', color: 'bg-green-500' }],
  };

  const available = transitions[tournament.status] || [];

  const handleUpdate = async (newStatus) => {
    setSaving(true);
    try {
      const res = await tournamentAPI.updateStatus(tournament.id, { status: newStatus });
      toast.success(`Tournament marked as ${newStatus}`);
      onUpdate(res.data.tournament);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlidePanel title={`⚙️ Update Status — ${tournament.title}`} onClose={onClose}>
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-1">Current Status</p>
        <span className={`text-sm font-600 px-3 py-1 rounded-full ${
          tournament.status === 'published' ? 'bg-green-400/10 text-green-400' :
          tournament.status === 'ongoing' ? 'bg-arena-orange/10 text-arena-orange' :
          'bg-slate-400/10 text-slate-400'}`}>
          {tournament.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>
      {available.length > 0 ? (
        <div className="space-y-3">
          {available.map(action => (
            <button key={action.value} onClick={() => handleUpdate(action.value)} disabled={saving}
              className={`w-full py-3 rounded-xl text-white font-600 transition-all disabled:opacity-50 ${action.color} hover:opacity-90`}>
              {saving ? 'Updating...' : action.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm">No status transitions available from current state.</p>
      )}
      <div className="mt-4 p-3 rounded-xl bg-arena-bg border border-arena-border text-xs text-slate-500">
        ⚠️ Status changes affect registration and leaderboard visibility.
      </div>
    </SlidePanel>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function SlidePanel({ title, onClose, children }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={onClose}>
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md h-full overflow-y-auto border-l border-arena-border"
        style={{ background: '#0f0f1e' }}>
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-arena-border"
          style={{ background: '#0f0f1e', zIndex: 1 }}>
          <h3 className="font-display font-700 text-white text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl px-2">×</button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}

const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="w-8 h-8 border-2 border-arena-orange border-t-transparent rounded-full animate-spin" />
  </div>
);
