// BecomeOrganizerPage.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { organizerAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export function BecomeOrganizerPage() {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', department: '', reason: '', experience: '' });

  useEffect(() => {
    if (user) {
      setForm(prev => ({ ...prev, name: user.name, department: user.department || '' }));
      organizerAPI.getStatus().then(r => { setStatus(r.data); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!form.reason.trim() || !form.experience.trim()) return toast.error('All fields required');
    setSubmitting(true);
    try {
      await organizerAPI.apply(form);
      toast.success('Application submitted! Faculty will review it.');
      organizerAPI.getStatus().then(r => setStatus(r.data));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role === 'organizer') return (
    <div className="min-h-screen bg-arena-bg pt-20 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl mb-4">🎉</p>
        <h2 className="font-display font-700 text-2xl text-white mb-2">You're already an Organizer!</h2>
        <p className="text-slate-400">Head to the dashboard to create your first tournament.</p>
      </div>
    </div>
  );

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-arena-bg border border-arena-border text-white placeholder-slate-500 focus:outline-none focus:border-arena-orange/50 text-sm";

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16">
      <div className="max-w-lg mx-auto px-6">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="font-display font-800 text-3xl text-white mb-2">Become an Organizer</h1>
          <p className="text-slate-400 text-sm">Apply to create and manage tournaments on ArenaX</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-arena-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : status?.status === 'pending' ? (
          <div className="rounded-2xl border border-yellow-400/20 p-8 text-center" style={{ background: '#0f0f1e' }}>
            <p className="text-4xl mb-3">⏳</p>
            <h3 className="font-700 text-xl text-white mb-2">Application Pending</h3>
            <p className="text-slate-400 text-sm">Your application is under review. Faculty will respond soon.</p>
            <p className="text-xs text-slate-600 mt-4">Applied: {new Date(status.created_at).toLocaleDateString()}</p>
          </div>
        ) : status?.status === 'rejected' ? (
          <div className="rounded-2xl border border-red-400/20 p-6 mb-6" style={{ background: '#0f0f1e' }}>
            <p className="text-red-400 font-600">Previous application rejected</p>
            {status.review_note && <p className="text-sm text-slate-400 mt-1">Reason: {status.review_note}</p>}
          </div>
        ) : null}

        {(status?.status !== 'pending') && (
          <div className="rounded-2xl border border-arena-border p-6 space-y-4" style={{ background: '#0f0f1e' }}>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={inputClass} placeholder="Your full name" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Department</label>
              <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                className={inputClass} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Why do you want to be an organizer?</label>
              <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                rows={3} className={inputClass + ' resize-none'}
                placeholder="Describe your motivation..." />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Relevant experience</label>
              <textarea value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}
                rows={3} className={inputClass + ' resize-none'}
                placeholder="Any event management, volunteering, or leadership experience..." />
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Application →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// GlobalLeaderboardPage.jsx
export function GlobalLeaderboardPage() {
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../api').then(({ tournamentAPI }) => {
      tournamentAPI.list({ status: 'all', per_page: 50 }).then(r => {
        const done = r.data.tournaments.filter(t => ['ongoing', 'completed'].includes(t.status));
        setTournaments(done);
        if (done.length > 0) setSelected(done[0].id);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEntries([]);
    import('../api').then(({ leaderboardAPI }) =>
      leaderboardAPI.get(selected).then(r => setEntries(r.data)).catch(() => {}));
  }, [selected]);

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="font-display font-800 text-4xl text-white mb-2">🏅 Leaderboard</h1>
          <p className="text-slate-400">Live rankings across all tournaments</p>
        </div>

        {/* Tournament selector */}
        <div className="flex gap-2 mb-8 overflow-x-auto scroll-container pb-2">
          {tournaments.map(t => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-600 transition-all ${
                selected === t.id
                  ? 'bg-arena-orange text-white'
                  : 'bg-arena-card border border-arena-border text-slate-400 hover:text-white'
              }`}>
              {t.title}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-slate-400">No leaderboard data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top 3 podium */}
            {entries.length >= 3 && (
              <div className="flex gap-4 justify-center mb-8">
                {[entries[1], entries[0], entries[2]].map((e, i) => {
                  const pos = i === 0 ? 2 : i === 1 ? 1 : 3;
                  const heights = ['h-24', 'h-32', 'h-20'];
                  const colors = ['bg-slate-400', 'bg-yellow-500', 'bg-orange-700'];
                  return e ? (
                    <motion.div key={e.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex-1 max-w-32 flex flex-col items-center">
                      <div className={`w-14 h-14 rounded-full ${colors[i]} flex items-center justify-center font-display font-800 text-2xl text-white mb-2`}>
                        {pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}
                      </div>
                      <p className="text-white text-xs font-600 text-center truncate w-full">{e.entry_name}</p>
                      <p className="text-arena-orange font-800 text-lg">{e.score}</p>
                      <div className={`w-full ${heights[i]} ${colors[i]} rounded-t-lg mt-2 flex items-end justify-center pb-2 opacity-30`} />
                    </motion.div>
                  ) : null;
                })}
              </div>
            )}

            {/* Full list */}
            {entries.map((entry, i) => (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border p-4 flex items-center gap-4 ${
                  i === 0 ? 'border-yellow-500/40' : i === 1 ? 'border-slate-400/40' : i === 2 ? 'border-orange-700/40' : 'border-arena-border'
                }`} style={{ background: '#0f0f1e' }}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-800 ${
                  i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-arena-border text-slate-400'
                }`}>{i + 1}</div>
                <div className="flex-1">
                  <p className="font-600 text-white">{entry.entry_name}</p>
                  {entry.notes && <p className="text-xs text-slate-500">{entry.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-display font-800 text-arena-orange text-xl">{entry.score}</p>
                  <p className="text-xs text-slate-500">pts</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
