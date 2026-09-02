import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { tournamentAPI, teamAPI, reportAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import TournamentRegistrationForm from '../components/tournament/TournamentRegistrationForm';

const TABS = ['Overview', 'Teams', 'Leaderboard', 'Rules'];

export default function TournamentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [showRegister, setShowRegister] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [teams, setTeams] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRegistration, setMyRegistration] = useState(null);

  const refreshMyRegistration = () => {
    if (!user) {
      setMyRegistration(null);
      return;
    }

    teamAPI.getMyStatus(id)
      .then(r => setMyRegistration(r.data))
      .catch(() => setMyRegistration(null));
  };

  useEffect(() => {
    tournamentAPI.get(id).then(r => { setTournament(r.data); setLoading(false); }).catch(() => navigate('/tournaments'));
  }, [id]);

  // Listen for tournament participant updates from team approval
  useEffect(() => {
    const handleTournamentUpdate = (event) => {
      if (event.detail.tournamentId === parseInt(id)) {
        // Refetch tournament data to get updated participant count
        tournamentAPI.get(id).then(r => setTournament(r.data)).catch(() => {});
        teamAPI.getTournamentTeams(id).then(r => setTeams(r.data)).catch(() => {});
        refreshMyRegistration();
      }
    };
    
    window.addEventListener('tournament-participants-updated', handleTournamentUpdate);
    return () => window.removeEventListener('tournament-participants-updated', handleTournamentUpdate);
  }, [id]);

  useEffect(() => {
    if (tab === 'Teams' && user) {
      teamAPI.getTournamentTeams(id).then(r => setTeams(r.data)).catch(() => {});
    }
    if (tab === 'Leaderboard') {
      import('../api').then(({ leaderboardAPI }) =>
        leaderboardAPI.get(id).then(r => setLeaderboard(r.data)).catch(() => {}));
    }
  }, [tab, id, user]);

  useEffect(() => {
    refreshMyRegistration();
  }, [id, user]);

  if (loading) return (
    <div className="min-h-screen bg-arena-bg pt-20 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-arena-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!tournament) return null;

  const deadline = new Date(tournament.registration_deadline);
  const now = new Date();
  
  // Better timezone handling - check if deadline has actually passed
  const deadlinePassed = now.getTime() > deadline.getTime();
  
  // Registration is open if: (published OR ongoing) AND deadline hasn't passed AND not full
  const isRegistrationOpen = (tournament.status === 'published' || tournament.status === 'ongoing') && !deadlinePassed;
  const isFull = tournament.current_participants >= tournament.max_participants;
  const isOrganizer = user?.role === 'organizer' && tournament.organizer_id === user?.id;
  const isAlreadyRegistered = Boolean(myRegistration?.registered);
  const registrationStatusLabel = myRegistration?.status === 'confirmed'
    ? 'Registered'
    : myRegistration?.status === 'pending'
      ? 'Pending Approval'
      : null;
  const registrationStatusClass = myRegistration?.status === 'confirmed'
    ? 'bg-green-400/20 text-green-400'
    : myRegistration?.status === 'pending'
      ? 'bg-yellow-400/20 text-yellow-400'
      : 'bg-slate-400/20 text-slate-400';
  
  // Calculate time remaining
  const timeRemaining = deadline - now;
  const isDeadlineToday = deadline.toDateString() === now.toDateString();
  
  // Show if registration is open or when deadline is
  const deadlineDisplay = !deadlinePassed 
    ? `${formatDistanceToNow(deadline, { addSuffix: true })} (${format(deadline, 'h:mm a')})`
    : `Closed (${format(deadline, 'MMM d, yyyy')})`;

  return (
    <div className="min-h-screen bg-arena-bg pt-16 pb-16">
      {/* Hero */}
      <div className="relative h-64 bg-gradient-to-r from-orange-900/40 to-purple-900/40 flex items-end">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-6 w-full">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${
                  tournament.status === 'published' ? 'bg-green-400/20 text-green-400' :
                  tournament.status === 'ongoing' ? 'bg-arena-orange/20 text-arena-orange' :
                  'bg-slate-400/20 text-slate-400'}`}>
                  {tournament.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-slate-500">{tournament.category.toUpperCase()}</span>
              </div>
              <h1 className="font-display font-800 text-3xl md:text-4xl text-white">{tournament.title}</h1>
              <p className="text-slate-400 mt-1">by {tournament.organizer?.name} · {tournament.organizer?.department}</p>
            </div>
            <div className="flex gap-2">
              {user && (
                <button onClick={() => setShowReport(true)}
                  className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-all">
                  Report
                </button>
              )}
              {user && isAlreadyRegistered ? (
                <span className={`px-4 py-2 rounded-xl text-xs font-600 ${registrationStatusClass}`}>
                  {registrationStatusLabel}
                </span>
              ) : isRegistrationOpen && !isFull && user && (
                <button onClick={() => setShowRegister(true)}
                  className="px-5 py-2 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all">
                  Register →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Start Date', value: format(new Date(tournament.start_date), 'MMM d, yyyy'), icon: '📅' },
            { label: 'Venue', value: tournament.venue || 'VIT Campus', icon: '📍' },
            { label: 'Participants', value: `${tournament.current_participants} / ${tournament.max_participants}`, icon: '👥' },
            { label: 'Deadline', value: deadlineDisplay, icon: '⏰' },
          ].map((info, i) => (
            <div key={i} className="rounded-xl border border-arena-border p-4" style={{ background: '#0f0f1e' }}>
              <div className="text-2xl mb-1">{info.icon}</div>
              <p className="text-xs text-slate-500">{info.label}</p>
              <p className="text-sm font-600 text-white mt-0.5">{info.value}</p>
            </div>
          ))}
        </div>

        {tournament.prize_pool && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-xs text-yellow-400/60">Prize Pool</p>
              <p className="text-yellow-400 font-700">{tournament.prize_pool}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-arena-border">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-600 transition-all border-b-2 -mb-px ${
                tab === t ? 'border-arena-orange text-arena-orange' : 'border-transparent text-slate-400 hover:text-white'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {tab === 'Overview' && (
              <div className="prose prose-invert max-w-none">
                <h3 className="text-white font-display font-700 text-xl mb-4">About</h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{tournament.description}</p>
                <div className="mt-6 grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-arena-border p-5" style={{ background: '#0f0f1e' }}>
                    <h4 className="font-700 text-white mb-3">Tournament Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Format</span>
                        <span className="text-white">{tournament.team_based ? 'Team-based' : 'Individual'}</span>
                      </div>
                      {tournament.team_based && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Team Size</span>
                          <span className="text-white">{tournament.min_team_size}–{tournament.max_team_size} members</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Mode</span>
                        <span className="text-white capitalize">{tournament.mode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">End Date</span>
                        <span className="text-white">{format(new Date(tournament.end_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-arena-border p-5" style={{ background: '#0f0f1e' }}>
                    <h4 className="font-700 text-white mb-3">Registration</h4>
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Capacity</span>
                        <span className="text-arena-orange">{Math.round((tournament.current_participants / tournament.max_participants) * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-arena-border overflow-hidden">
                        <div className="h-full bg-arena-orange rounded-full"
                          style={{ width: `${Math.min(100, (tournament.current_participants / tournament.max_participants) * 100)}%` }} />
                      </div>
                    </div>
                    {user && isAlreadyRegistered ? (
                      <div className={`w-full py-2.5 rounded-xl text-center font-600 text-sm ${registrationStatusClass}`}>
                        {registrationStatusLabel}
                      </div>
                    ) : isRegistrationOpen && !isFull ? (
                      <button onClick={() => setShowRegister(true)}
                        className="w-full py-2.5 rounded-xl bg-arena-orange text-white font-600 text-sm hover:bg-arena-orange/90 transition-all">
                        Register Now →
                      </button>
                    ) : isFull ? (
                      <p className="text-center text-sm text-red-400 font-600">Tournament Full</p>
                    ) : (
                      <div className="text-center text-xs space-y-2">
                        <p className="text-slate-500 font-600">Registration Closed</p>
                        {tournament.status === 'pending_approval' && (
                          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-2 text-yellow-400">
                            <p className="font-600">⏳ Awaiting Approval</p>
                            <p className="text-xs mt-1">Faculty must approve this tournament first</p>
                          </div>
                        )}
                        {tournament.status === 'draft' && (
                          <div className="bg-slate-900/20 border border-slate-700/50 rounded p-2 text-slate-400">
                            <p className="font-600">📝 Draft Tournament</p>
                            <p className="text-xs mt-1">Not yet submitted for approval</p>
                          </div>
                        )}
                        {deadlinePassed && tournament.status === 'published' && (
                          <p className="text-red-500">Deadline: {format(deadline, 'MMM d, yyyy h:mm a')}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === 'Teams' && (
              <div>
                {/* Pending Teams Section - Only for Organizer */}
                {isOrganizer && teams.some(t => t.status === 'pending') && (
                  <div className="mb-8">
                    <h3 className="font-display font-700 text-xl text-arena-orange mb-4">
                      📋 Pending Approval ({teams.filter(t => t.status === 'pending').length})
                    </h3>
                    <div className="space-y-3">
                      {teams.filter(t => t.status === 'pending').map(team => (
                        <div key={team.id} className="rounded-xl border border-yellow-500/30 p-4 bg-yellow-500/5"
                          style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-600 text-white">{team.team_name}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                Leader: <span className="text-slate-300">{team.leader?.name}</span> ({team.leader?.email})
                              </p>
                              <p className="text-xs text-slate-500 mt-2">
                                Members: {team.confirmed_members}/{team.total_members} confirmed
                              </p>
                              {team.members && team.members.length > 0 && (
                                <div className="mt-2 text-xs text-slate-400">
                                  {team.members.map(m => (
                                    <div key={m.id} className="flex items-center gap-1 mt-1">
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        m.status === 'accepted' ? 'bg-green-400' :
                                        m.status === 'invited' ? 'bg-yellow-400' :
                                        'bg-slate-500'}`} />
                                      {m.name || m.email} ({m.status})
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await teamAPI.approveTeam(team.id);
                                  toast.success('Team approved! ✅');
                                  const updated = await teamAPI.getTournamentTeams(id);
                                  setTeams(updated.data);
                                  window.dispatchEvent(new CustomEvent('tournament-participants-updated', { detail: { tournamentId: parseInt(id) } }));
                                } catch (err) {
                                  toast.error(err.response?.data?.error || 'Failed to approve team');
                                }
                              }}
                              className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-600 transition-all">
                              ✓ Approve
                            </button>
                            <button
                              onClick={async () => {
                                const reason = prompt('Rejection reason (optional):');
                                if (reason === null) return;
                                try {
                                  await teamAPI.rejectTeam(team.id, reason || '');
                                  toast.success('Team rejected');
                                  const updated = await teamAPI.getTournamentTeams(id);
                                  setTeams(updated.data);
                                } catch (err) {
                                  toast.error(err.response?.data?.error || 'Failed to reject team');
                                }
                              }}
                              className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-600 transition-all">
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registered Teams Section */}
                <h3 className="font-display font-700 text-xl text-white mb-4">
                  ✓ Registered Teams ({teams.filter(t => t.status === 'confirmed').length})
                </h3>
                {teams.filter(t => t.status === 'confirmed').length === 0 ? (
                  <p className="text-slate-500 text-center py-10">No confirmed teams yet</p>
                ) : (
                  <div className="space-y-3">
                    {teams.filter(t => t.status === 'confirmed').map(team => (
                      <div key={team.id} className="rounded-xl border border-green-500/30 p-4 bg-green-500/5"
                        style={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                        <div>
                          <p className="font-600 text-white">{team.team_name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {team.confirmed_members}/{team.total_members} members · Leader: {team.leader?.name}
                          </p>
                        </div>
                        <span className="inline-block mt-2 text-xs font-600 px-2 py-1 rounded-full bg-green-400/20 text-green-400">
                          ✓ Confirmed
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rejected Teams Section */}
                {teams.some(t => t.status === 'disqualified') && (
                  <div className="mt-8">
                    <h3 className="font-display font-700 text-lg text-red-500 mb-4">
                      Rejected ({teams.filter(t => t.status === 'disqualified').length})
                    </h3>
                    <div className="space-y-3">
                      {teams.filter(t => t.status === 'disqualified').map(team => (
                        <div key={team.id} className="rounded-xl border border-red-500/30 p-4 bg-red-500/5">
                          <p className="font-600 text-red-400">{team.team_name}</p>
                          <p className="text-xs text-slate-500 mt-1">Leader: {team.leader?.name}</p>
                          <span className="inline-block mt-2 text-xs font-600 px-2 py-1 rounded-full bg-red-400/20 text-red-400">
                            ✗ Rejected
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'Leaderboard' && (
              <div>
                <h3 className="font-display font-700 text-xl text-white mb-4">Leaderboard</h3>
                {leaderboard.length === 0 ? (
                  <p className="text-slate-500 text-center py-10">Leaderboard not published yet</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, i) => (
                      <motion.div key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`rounded-xl border p-4 flex items-center gap-4 ${
                          i === 0 ? 'border-yellow-500/40 bg-yellow-500/5' :
                          i === 1 ? 'border-slate-400/40 bg-slate-400/5' :
                          i === 2 ? 'border-orange-700/40 bg-orange-700/5' :
                          'border-arena-border'}`}
                        style={i > 2 ? { background: '#0f0f1e' } : {}}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-800 text-lg ${
                          i === 0 ? 'bg-yellow-500 text-black' :
                          i === 1 ? 'bg-slate-400 text-black' :
                          i === 2 ? 'bg-orange-700 text-white' :
                          'bg-arena-border text-slate-400'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-600 text-white">{entry.entry_name}</p>
                          {entry.notes && <p className="text-xs text-slate-500">{entry.notes}</p>}
                        </div>
                        <p className="font-display font-800 text-arena-orange text-xl">{entry.score}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'Rules' && (
              <div className="rounded-xl border border-arena-border p-6" style={{ background: '#0f0f1e' }}>
                <h3 className="font-display font-700 text-xl text-white mb-4">Rules & Guidelines</h3>
                {tournament.rules ? (
                  <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-body">
                    {tournament.rules}
                  </pre>
                ) : (
                  <p className="text-slate-500">No rules specified</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Register Modal */}
      <AnimatePresence>
        {showRegister && (
          <RegisterModal tournament={tournament} onClose={() => setShowRegister(false)}
            onSuccess={() => { setShowRegister(false); refreshMyRegistration(); toast.success('Registered!'); }} />
        )}
        {showReport && (
          <ReportModal tournamentId={tournament.id} onClose={() => setShowReport(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RegisterModal({ tournament, onClose, onSuccess }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-arena-border p-6"
        style={{ background: '#0f0f1e' }}>
        <h2 className="font-display font-700 text-xl text-white mb-1">Register for Tournament</h2>
        <p className="text-sm text-slate-500 mb-5">{tournament.title}</p>

        <TournamentRegistrationForm 
          tournament={tournament} 
          onSuccess={onSuccess}
          onClose={onClose}
        />
      </motion.div>
    </motion.div>
  );
}

function ReportModal({ tournamentId, onClose }) {
  const [reason, setReason] = useState('fake_tournament');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return toast.error('Please describe the issue');
    setLoading(true);
    try {
      await reportAPI.file({ tournament_id: tournamentId, reason, description });
      toast.success('Report submitted. Faculty will review it.');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-arena-border p-6" style={{ background: '#0f0f1e' }}>
        <h2 className="font-display font-700 text-xl text-white mb-5">Report Tournament</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-arena-bg border border-arena-border text-white text-sm focus:outline-none">
              <option value="fake_tournament">Fake Tournament</option>
              <option value="misleading_info">Misleading Information</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="spam">Spam</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              className="w-full px-4 py-2.5 rounded-xl bg-arena-bg border border-arena-border text-white placeholder-slate-500 text-sm focus:outline-none resize-none"
              placeholder="Describe the issue in detail..." />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-arena-border text-slate-400 text-sm hover:text-white transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-600 hover:bg-red-500/90 transition-all disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
