import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tournamentAPI } from '../api';
import TournamentCard from '../components/tournament/TournamentCard';
import { useAuth } from '../context/AuthContext';

function ScrollRow({ title, tournaments, loading, accentColor = 'text-arena-orange', emoji = '🏆' }) {
  const rowRef = useRef(null);
  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
    }
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4 px-6">
        <h2 className={`font-display font-700 text-lg text-white flex items-center gap-2`}>
          <span>{emoji}</span>
          <span>{title}</span>
          <span className={`text-sm font-400 ${accentColor}`}>({tournaments.length})</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={() => scroll(-1)}
            className="w-8 h-8 rounded-full bg-arena-card border border-arena-border text-slate-400 hover:text-white hover:border-arena-orange/50 transition-all flex items-center justify-center">
            ‹
          </button>
          <button onClick={() => scroll(1)}
            className="w-8 h-8 rounded-full bg-arena-card border border-arena-border text-slate-400 hover:text-white hover:border-arena-orange/50 transition-all flex items-center justify-center">
            ›
          </button>
        </div>
      </div>
      <div ref={rowRef} className="scroll-container flex gap-4 pb-4 px-6">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-72 rounded-2xl bg-arena-card border border-arena-border animate-pulse" />
          ))
        ) : tournaments.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 px-2">No tournaments found</p>
        ) : (
          tournaments.map((t, i) => <TournamentCard key={t.id} tournament={t} index={i} />)
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [published, setPublished] = useState([]);
  const [ongoing, setOngoing] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  const fetchAll = async () => {
    try {
      const [pub, on, done] = await Promise.all([
        tournamentAPI.list({ status: 'published', per_page: 20 }),
        tournamentAPI.list({ status: 'ongoing', per_page: 20 }),
        tournamentAPI.list({ status: 'completed', per_page: 20 }),
      ]);
      setPublished(pub.data.tournaments);
      setOngoing(on.data.tournaments);
      setCompleted(done.data.tournaments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const handleTournamentStatusUpdate = () => {
      fetchAll();
    };

    window.addEventListener('tournament-status-updated', handleTournamentStatusUpdate);
    return () => window.removeEventListener('tournament-status-updated', handleTournamentStatusUpdate);
  }, []);

  const heroTournaments = [...ongoing, ...published].slice(0, 5);

  useEffect(() => {
    if (heroTournaments.length <= 1) return;
    const t = setInterval(() => setHeroIndex(i => (i + 1) % heroTournaments.length), 5000);
    return () => clearInterval(t);
  }, [heroTournaments.length]);

  const hero = heroTournaments[heroIndex];

  const CATEGORY_GRADIENTS = {
    gaming: 'from-purple-900/60 to-arena-bg',
    coding: 'from-cyan-900/60 to-arena-bg',
    sports: 'from-green-900/60 to-arena-bg',
    cultural: 'from-pink-900/60 to-arena-bg',
    other: 'from-orange-900/60 to-arena-bg',
  };

  return (
    <div className="min-h-screen bg-arena-bg pt-16">
      {/* Hero Banner */}
      {hero ? (
        <div className="relative h-[60vh] min-h-[400px] overflow-hidden mb-8">
          <motion.div key={heroIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`absolute inset-0 ${hero.banner_url ? '' : `bg-gradient-to-b ${CATEGORY_GRADIENTS[hero.category] || 'from-orange-900/60 to-arena-bg'}`}`}
            style={hero.banner_url ? { background: `url(${hero.banner_url}) center/cover` } : {}}>
            <div className="absolute inset-0 bg-arena-bg/40" />
          </motion.div>

          {/* Dots grid decoration */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, #f97316 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-end pb-12">
            <motion.div key={`content-${heroIndex}`} initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="max-w-xl">
              {hero.status === 'ongoing' && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-arena-orange animate-pulse" />
                  <span className="text-arena-orange text-sm font-600 tracking-wider uppercase">Live Now</span>
                </div>
              )}
              <div className="inline-block text-xs font-600 px-3 py-1 rounded-full bg-white/10 text-white mb-3 uppercase tracking-wider">
                {hero.category}
              </div>
              <h1 className="font-display font-800 text-4xl md:text-5xl text-white leading-tight mb-3">
                {hero.title}
              </h1>
              <p className="text-slate-300 text-base mb-4 line-clamp-2">{hero.description}</p>
              <div className="flex items-center gap-3 mb-6 text-sm text-slate-400">
                <span>📍 {hero.venue || 'VIT Campus'}</span>
                <span>•</span>
                <span>👥 {hero.current_participants}/{hero.max_participants}</span>
                {hero.prize_pool && <><span>•</span><span className="text-yellow-400 font-600">🏆 {hero.prize_pool}</span></>}
              </div>
              <div className="flex gap-3">
                <Link to={`/tournaments/${hero.id}`}
                  className="px-6 py-3 bg-arena-orange text-white rounded-xl font-600 hover:bg-arena-orange/90 transition-all">
                  View Details →
                </Link>
                <Link to="/tournaments"
                  className="px-6 py-3 bg-white/10 text-white rounded-xl font-600 hover:bg-white/20 transition-all">
                  Browse All
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Hero indicators */}
          {heroTournaments.length > 1 && (
            <div className="absolute bottom-4 right-6 flex gap-2 z-10">
              {heroTournaments.map((_, i) => (
                <button key={i} onClick={() => setHeroIndex(i)}
                  className={`h-1 rounded-full transition-all ${i === heroIndex ? 'w-8 bg-arena-orange' : 'w-4 bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Fallback hero when no tournaments */
        <div className="relative py-24 mb-8 text-center overflow-hidden">
          <div className="absolute inset-0 bg-orange-glow pointer-events-none" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display font-800 text-5xl md:text-7xl text-white mb-4">
              Arena<span className="text-arena-orange">X</span>
            </h1>
            <p className="text-slate-400 text-xl mb-8">VIT's Premier Tournament Platform</p>
            {!user && (
              <Link to="/login"
                className="px-8 py-4 bg-arena-orange text-white rounded-xl font-600 text-lg hover:bg-arena-orange/90 transition-all">
                Get Started →
              </Link>
            )}
          </motion.div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="max-w-7xl mx-auto px-6 mb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Open Tournaments', value: published.length, color: 'text-green-400' },
            { label: 'Live Now', value: ongoing.length, color: 'text-arena-orange' },
            { label: 'Completed', value: completed.length, color: 'text-slate-400' },
            { label: 'Categories', value: 5, color: 'text-arena-purple' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-arena-border p-4 text-center"
              style={{ background: '#0f0f1e' }}>
              <p className={`font-display font-800 text-3xl ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Category Quick Filters */}
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <div className="flex gap-3 overflow-x-auto pb-2 scroll-container">
          {['All', 'Gaming', 'Coding', 'Sports', 'Cultural'].map(cat => (
            <Link key={cat} to={`/tournaments${cat !== 'All' ? `?category=${cat.toLowerCase()}` : ''}`}
              className="flex-shrink-0 px-4 py-2 rounded-full border border-arena-border text-sm text-slate-400 hover:border-arena-orange hover:text-arena-orange transition-all"
              style={{ background: '#0f0f1e' }}>
              {cat === 'All' && '🎯 '}
              {cat === 'Gaming' && '🎮 '}
              {cat === 'Coding' && '💻 '}
              {cat === 'Sports' && '⚽ '}
              {cat === 'Cultural' && '🎭 '}
              {cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Scroll Rows */}
      {ongoing.length > 0 && (
        <ScrollRow title="Live & Ongoing" tournaments={ongoing} loading={loading}
          accentColor="text-arena-orange" emoji="🔥" />
      )}
      <ScrollRow title="Open Registration" tournaments={published} loading={loading}
        accentColor="text-green-400" emoji="🎯" />
      <ScrollRow title="Completed" tournaments={completed} loading={false}
        accentColor="text-slate-400" emoji="🏅" />

      {/* CTA */}
      {!user && (
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <div className="max-w-2xl mx-auto rounded-2xl border border-arena-orange/20 p-10"
            style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.05) 0%, rgba(124,58,237,0.05) 100%)' }}>
            <h2 className="font-display font-800 text-3xl text-white mb-3">Ready to Compete?</h2>
            <p className="text-slate-400 mb-6">Join ArenaX with your @vit.edu email and start your journey.</p>
            <Link to="/login"
              className="inline-block px-8 py-3 bg-arena-orange text-white rounded-xl font-600 hover:bg-arena-orange/90 transition-all">
              Sign In Free →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
