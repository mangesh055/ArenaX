import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const MOCK_USERS = [
  { id: 'faculty_001', label: 'Dr. Rajesh Kumar (Faculty Admin)', role: 'faculty' },
  { id: 'org_001', label: 'Priya Sharma (Organizer)', role: 'organizer' },
  { id: 'org_002', label: 'Arjun Nair (Organizer)', role: 'organizer' },
  { id: 'student_001', label: 'Kavya Reddy (Student)', role: 'student' },
  { id: 'student_002', label: 'Rohan Mehta (Student)', role: 'student' },
  { id: 'sport_auth_001', label: 'Mr. Vikram Singh (Sport Authority)', role: 'sport_authority' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  const handleMockLogin = async (userId) => {
    setLoading(true);
    try {
      const mockToken = `mock_${userId}`;
      login(mockToken);
      toast.success('Signed in successfully!');
      navigate('/');
    } catch (e) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = () => {
    if (!email.endsWith('@vit.edu')) {
      toast.error('Only @vit.edu emails are allowed');
      return;
    }
    toast('In production, Clerk handles authentication. Use quick login below for demo.');
  };

  return (
    <div className="min-h-screen bg-arena-bg flex">
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center relative overflow-hidden p-12">
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(124,58,237,0.08) 100%)' }} />
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl bg-arena-orange mx-auto mb-6 flex items-center justify-center">
            <span className="font-display font-800 text-white text-4xl">A</span>
          </div>
          <h1 className="font-display font-800 text-6xl text-white mb-4">
            Arena<span className="text-arena-orange">X</span>
          </h1>
          <p className="text-slate-400 text-xl mb-12">VIT's Premier Tournament Platform</p>
          <div className="space-y-4 text-left max-w-xs">
            {['Join & create tournaments', 'Team-based or solo competitions', 'Live leaderboards & rankings', 'Gaming, Coding, Sports & more'].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-slate-300">
                <div className="w-6 h-6 rounded-full bg-arena-orange/20 border border-arena-orange/30 flex items-center justify-center text-arena-orange text-xs">✓</div>
                {f}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-display font-800 text-4xl text-white">
              Arena<span className="text-arena-orange">X</span>
            </h1>
          </div>

          <div className="rounded-2xl border border-arena-border p-8" style={{ background: '#0f0f1e' }}>
            <h2 className="font-display font-700 text-2xl text-white mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm mb-6">Sign in with your @vit.edu account</p>

            <div className="space-y-2">
              {MOCK_USERS.map(u => (
                <button key={u.id} onClick={() => handleMockLogin(u.id)} disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-arena-border hover:border-arena-orange/30 hover:bg-arena-orange/5 transition-all text-left group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 flex-shrink-0"
                    style={{
                      background: u.role === 'faculty' ? 'rgba(124,58,237,0.2)' : u.role === 'organizer' ? 'rgba(249,115,22,0.2)' : 'rgba(6,182,212,0.2)',
                      color: u.role === 'faculty' ? '#7c3aed' : u.role === 'organizer' ? '#f97316' : '#06b6d4'
                    }}>
                    {u.label.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate group-hover:text-arena-orange transition-colors">{u.label}</p>
                    <p className="text-xs capitalize" style={{
                      color: u.role === 'faculty' ? '#7c3aed' : u.role === 'organizer' ? '#f97316' : '#06b6d4'
                    }}>{u.role}</p>
                  </div>
                  <span className="text-slate-600 group-hover:text-arena-orange transition-colors text-sm">→</span>
                </button>
              ))}
            </div>
                <div className="mb-4">
                  <label className="text-xs text-slate-400 mb-1 block">VIT Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="yourname@vit.edu"
                    className="w-full px-4 py-3 rounded-xl bg-arena-bg border border-arena-border text-white placeholder-slate-500 focus:outline-none focus:border-arena-orange/50 text-sm"
                  />
                </div>

                <button onClick={handleEmailLogin}
                  className="w-full py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all mb-6">
                  Continue with Clerk →
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-arena-border" />
                  <span className="text-xs text-slate-500">Quick Demo Login</span>
                  <div className="flex-1 h-px bg-arena-border" />
                </div>

                <div className="space-y-2">
                  {MOCK_USERS.map(u => (
                    <button key={u.id} onClick={() => handleMockLogin(u.id)} disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-arena-border hover:border-arena-orange/30 hover:bg-arena-orange/5 transition-all text-left group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-700 flex-shrink-0"
                        style={{
                          background: u.role === 'faculty' ? 'rgba(124,58,237,0.2)' : u.role === 'organizer' ? 'rgba(249,115,22,0.2)' : u.role === 'sport_authority' ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.2)',
                          color: u.role === 'faculty' ? '#7c3aed' : u.role === 'organizer' ? '#f97316' : u.role === 'sport_authority' ? '#06b6d4' : '#06b6d4'
                        }}>
                        {u.label.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate group-hover:text-arena-orange transition-colors">{u.label}</p>
                        <p className="text-xs capitalize" style={{
                          color: u.role === 'faculty' ? '#7c3aed' : u.role === 'organizer' ? '#f97316' : u.role === 'sport_authority' ? '#06b6d4' : '#06b6d4'
                        }}>{u.role.replace('_', ' ')}</p>
                      </div>
                      <span className="text-slate-600 group-hover:text-arena-orange transition-colors text-sm">→</span>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-600 text-center mt-6">
                  Only @vit.edu emails are allowed. <br />
                  <span className="text-arena-orange">Clerk authentication</span> required in production.
                </p>

            <p className="text-xs text-slate-500 text-center mt-6">
              Use quick login above for the demo account you want to sign in as.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
