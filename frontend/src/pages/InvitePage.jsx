import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { teamAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export default function InvitePage() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    teamAPI.getInvite(token)
      .then(r => { setInvite(r.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [token]);

  const respond = async (action) => {
    if (!user) {
      toast.error('Please sign in first');
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }
    if (user.email !== invite?.email) {
      toast.error(`This invite is for ${invite?.email}`);
      return;
    }
    setResponding(true);
    try {
      await teamAPI.respondInvite(token, { action });
      toast.success(action === 'accept' ? 'You joined the team! 🎉' : 'Invitation declined');
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to respond');
    } finally {
      setResponding(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-arena-bg pt-20 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-arena-orange border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!invite) return (
    <div className="min-h-screen bg-arena-bg pt-20 flex items-center justify-center">
      <div className="text-center">
        <p className="text-5xl mb-4">❌</p>
        <h2 className="font-display font-700 text-xl text-white mb-2">Invalid or Expired Invitation</h2>
        <p className="text-slate-400 text-sm">This invite link is no longer valid.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16 flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md">
        <div className="rounded-2xl border border-arena-orange/20 overflow-hidden"
          style={{ background: '#0f0f1e' }}>
          {/* Header */}
          <div className="p-6 border-b border-arena-border"
            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(124,58,237,0.1) 100%)' }}>
            <p className="text-arena-orange text-sm font-600 mb-1">⚡ Team Invitation</p>
            <h1 className="font-display font-800 text-2xl text-white">{invite.team_name}</h1>
            <p className="text-slate-400 text-sm mt-1">Invited by {invite.leader_name}</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Tournament info */}
            <div className="rounded-xl border border-arena-border p-4">
              <p className="text-xs text-slate-500 mb-1">Tournament</p>
              <p className="font-700 text-white">{invite.tournament?.title}</p>
              <p className="text-xs text-slate-400 mt-1">📅 {invite.tournament?.start_date?.split('T')[0]}</p>
              <p className="text-xs text-slate-400">📍 {invite.tournament?.venue || 'VIT Campus'}</p>
            </div>

            {/* Invite for */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Invite for:</span>
              <span className="text-arena-orange font-600">{invite.email}</span>
            </div>

            {/* Deadline */}
            <div className="p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
              <p className="text-xs text-yellow-400 font-600">
                ⏰ Expires: {format(new Date(invite.expires_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            {/* Auth check */}
            {!user ? (
              <div className="p-4 rounded-xl bg-arena-orange/5 border border-arena-orange/20">
                <p className="text-sm text-slate-300 mb-3">Sign in with your @vit.edu account to accept this invitation.</p>
                <button onClick={() => navigate(`/login?redirect=/invite/${token}`)}
                  className="w-full py-2.5 rounded-xl bg-arena-orange text-white font-600 text-sm hover:bg-arena-orange/90 transition-all">
                  Sign In to Continue →
                </button>
              </div>
            ) : user.email !== invite.email ? (
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <p className="text-sm text-red-400">
                  This invite is for <strong>{invite.email}</strong>, but you're signed in as <strong>{user.email}</strong>.
                </p>
              </div>
            ) : invite.status !== 'pending' ? (
              <div className="text-center py-4">
                <p className="text-slate-400">This invitation has already been {invite.status}.</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => respond('decline')} disabled={responding}
                  className="flex-1 py-3 rounded-xl border border-arena-border text-slate-400 font-600 hover:text-white transition-all disabled:opacity-50">
                  Decline
                </button>
                <button onClick={() => respond('accept')} disabled={responding}
                  className="flex-1 py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all disabled:opacity-50">
                  {responding ? 'Joining...' : '⚡ Accept & Join'}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
