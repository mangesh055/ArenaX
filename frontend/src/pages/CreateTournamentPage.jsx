import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { tournamentAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const STEPS = ['Basic Info', 'Schedule', 'Rules & Prize', 'Review'];

export default function CreateTournamentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'coding', team_based: true,
    max_participants: 50, min_team_size: 2, max_team_size: 5,
    start_date: '', end_date: '', registration_deadline: '',
    rules: '', prize_pool: '', venue: '', banner_url: ''
  });

  if (!user || !['organizer', 'faculty'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-arena-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🔒</p>
          <h2 className="text-white font-700 text-xl mb-2">Organizer Access Required</h2>
          <p className="text-slate-400 text-sm mb-6">You need organizer privileges to create tournaments.</p>
          <button onClick={() => navigate('/become-organizer')}
            className="px-6 py-3 bg-arena-orange text-white rounded-xl font-600 hover:bg-arena-orange/90 transition-all">
            Apply to Become an Organizer
          </button>
        </div>
      </div>
    );
  }

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    // Validation before submission
    if (!form.registration_deadline || !form.start_date || !form.end_date) {
      toast.error('All dates are required');
      return;
    }

    const regDeadline = new Date(form.registration_deadline);
    const startDate = new Date(form.start_date);
    const endDate = new Date(form.end_date);

    if (regDeadline >= startDate) {
      toast.error('❌ Registration deadline must be BEFORE tournament start date');
      return;
    }

    if (startDate >= endDate) {
      toast.error('Tournament start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const res = await tournamentAPI.create(form);
      toast.success('Tournament submitted for approval!');
      navigate(`/tournaments/${res.data.tournament.id}`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 border border-arena-border placeholder-slate-400 focus:outline-none focus:border-arena-orange/50 text-sm";
  const labelClass = "text-xs text-slate-400 mb-1 block";

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="font-display font-800 text-3xl text-white mb-1">Create Tournament</h1>
          <p className="text-slate-400 text-sm">Fill in the details to create your tournament</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0 transition-all ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-arena-orange text-white' :
                'bg-arena-card border border-arena-border text-slate-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-slate-500'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-green-500' : 'bg-arena-border'}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-arena-border p-6" style={{ background: '#0f0f1e' }}>
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="font-display font-700 text-xl text-white mb-4">Basic Information</h2>
              <div>
                <label className={labelClass}>Tournament Title *</label>
                <input value={form.title} onChange={e => update('title', e.target.value)}
                  className={inputClass} placeholder="e.g. CodeStorm 2025" />
              </div>
              <div>
                <label className={labelClass}>Description *</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)}
                  rows={4} className={inputClass + ' resize-none'}
                  placeholder="Describe your tournament..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category *</label>
                  <select value={form.category} onChange={e => update('category', e.target.value)}
                    className={inputClass}>
                    <option value="gaming">🎮 Gaming</option>
                    <option value="coding">💻 Coding</option>
                    <option value="sports">⚽ Sports</option>
                    <option value="cultural">🎭 Cultural</option>
                    <option value="other">🏆 Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Format *</label>
                  <select value={form.team_based} onChange={e => update('team_based', e.target.value === 'true')}
                    className={inputClass}>
                    <option value="true">👥 Team-based</option>
                    <option value="false">👤 Individual</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Max Participants *</label>
                  <input type="number" value={form.max_participants}
                    onChange={e => update('max_participants', parseInt(e.target.value))}
                    className={inputClass} min="2" />
                </div>
                {form.team_based && <>
                  <div>
                    <label className={labelClass}>Min Team Size</label>
                    <input type="number" value={form.min_team_size}
                      onChange={e => update('min_team_size', parseInt(e.target.value))}
                      className={inputClass} min="1" />
                  </div>
                  <div>
                    <label className={labelClass}>Max Team Size</label>
                    <input type="number" value={form.max_team_size}
                      onChange={e => update('max_team_size', parseInt(e.target.value))}
                      className={inputClass} min="1" />
                  </div>
                </>}
              </div>
              <div>
                <label className={labelClass}>Venue</label>
                <input value={form.venue} onChange={e => update('venue', e.target.value)}
                  className={inputClass} placeholder="e.g. Tech Park Auditorium, VIT" />
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="font-display font-700 text-xl text-white mb-4">Schedule</h2>
              <div>
                <label className={labelClass}>Registration Deadline * (must be BEFORE tournament start)</label>
                <input type="datetime-local" value={form.registration_deadline}
                  onChange={e => update('registration_deadline', e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Start Date & Time *</label>
                <input type="datetime-local" value={form.start_date}
                  onChange={e => update('start_date', e.target.value)}
                  className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Date & Time *</label>
                <input type="datetime-local" value={form.end_date}
                  onChange={e => update('end_date', e.target.value)}
                  className={inputClass} />
              </div>
              <div className="p-4 rounded-xl border border-arena-border/50 bg-arena-bg text-xs text-slate-500">
                ℹ️ Teams will have 72 hours after registration to verify all members. Unverified teams will be auto-dropped.
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h2 className="font-display font-700 text-xl text-white mb-4">Rules & Prizes</h2>
              <div>
                <label className={labelClass}>Tournament Rules</label>
                <textarea value={form.rules} onChange={e => update('rules', e.target.value)}
                  rows={6} className={inputClass + ' resize-none font-mono text-xs'}
                  placeholder="1. No plagiarism&#10;2. Be punctual&#10;3. Fair play expected..." />
              </div>
              <div>
                <label className={labelClass}>Prize Pool</label>
                <input value={form.prize_pool} onChange={e => update('prize_pool', e.target.value)}
                  className={inputClass} placeholder="e.g. 1st: ₹10,000 | 2nd: ₹5,000 | 3rd: ₹2,500" />
              </div>
              <div>
                <label className={labelClass}>Banner Image URL (optional)</label>
                <input value={form.banner_url} onChange={e => update('banner_url', e.target.value)}
                  className={inputClass} placeholder="https://..." type="url" />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-display font-700 text-xl text-white mb-4">Review & Submit</h2>
              <div className="space-y-3 text-sm">
                {[
                  ['Title', form.title], ['Category', form.category], ['Format', form.team_based ? 'Team-based' : 'Individual'],
                  ['Max Participants', form.max_participants], ['Venue', form.venue || 'Not set'],
                  ['Start Date', form.start_date ? new Date(form.start_date).toLocaleString() : 'Not set'],
                  ['Registration Deadline', form.registration_deadline ? new Date(form.registration_deadline).toLocaleString() : 'Not set'],
                  ['Prize Pool', form.prize_pool || 'None'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2 border-b border-arena-border/30">
                    <span className="text-slate-500 flex-shrink-0">{label}</span>
                    <span className="text-white text-right">{String(value)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/20 text-xs text-yellow-400">
                ⚠️ Your tournament will be submitted for faculty approval before going live.
              </div>
            </motion.div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-6 py-3 rounded-xl border border-arena-border text-slate-400 font-600 hover:text-white transition-all">
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => {
              // Validate before moving to next step
              if (step === 1) {
                if (!form.registration_deadline || !form.start_date || !form.end_date) {
                  toast.error('All dates are required');
                  return;
                }
                const regDeadline = new Date(form.registration_deadline);
                const startDate = new Date(form.start_date);
                const endDate = new Date(form.end_date);
                
                if (regDeadline >= startDate) {
                  toast.error('❌ Registration deadline must be BEFORE tournament start date');
                  return;
                }
                if (startDate >= endDate) {
                  toast.error('Tournament start date must be before end date');
                  return;
                }
              }
              setStep(s => s + 1);
            }}
              disabled={step === 0 && !form.title}
              className="flex-1 py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all disabled:opacity-40">
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all disabled:opacity-40">
              {loading ? 'Submitting...' : '🚀 Submit for Approval'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
