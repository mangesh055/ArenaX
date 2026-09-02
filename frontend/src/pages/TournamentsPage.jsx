import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tournamentAPI } from '../api';
import TournamentCard from '../components/tournament/TournamentCard';

const CATEGORIES = ['all', 'gaming', 'coding', 'sports', 'cultural', 'other'];
const STATUSES = ['published', 'ongoing', 'completed', 'all'];

export default function TournamentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tournaments, setTournaments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const category = searchParams.get('category') || 'all';
  const status = searchParams.get('status') || 'all';
  const search = searchParams.get('search') || '';

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 12 };
      if (category !== 'all') params.category = category;
      if (status !== 'all') params.status = status;
      if (search) params.search = search;
      const res = await tournamentAPI.list(params);
      setTournaments(res.data.tournaments);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [category, status, search, page]);

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);
  useEffect(() => { setPage(1); }, [category, status, search]);

  useEffect(() => {
    const handleTournamentStatusUpdate = () => {
      fetchTournaments();
    };

    window.addEventListener('tournament-status-updated', handleTournamentStatusUpdate);
    return () => window.removeEventListener('tournament-status-updated', handleTournamentStatusUpdate);
  }, [fetchTournaments]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || !value) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-arena-bg pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-800 text-4xl text-white mb-2">Tournaments</h1>
          <p className="text-slate-400">Discover and join competitions at VIT</p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Search */}
          <div className="flex-1 min-w-64 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search tournaments..."
              value={search}
              onChange={e => setParam('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-arena-border bg-arena-card text-white placeholder-slate-500 focus:outline-none focus:border-arena-orange/50 text-sm"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto scroll-container">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setParam('category', cat)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-600 uppercase tracking-wide transition-all ${
                  category === cat
                    ? 'bg-arena-orange text-white'
                    : 'bg-arena-card border border-arena-border text-slate-400 hover:text-white'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setParam('status', s)}
                className={`px-3 py-2 rounded-xl text-xs font-600 capitalize transition-all ${
                  status === s
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-arena-card border border-arena-border text-slate-400 hover:text-white'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-500 mb-6">
          {loading ? 'Loading...' : `${total} tournament${total !== 1 ? 's' : ''} found`}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-arena-card border border-arena-border animate-pulse" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-4">🏆</p>
            <p className="text-slate-400 text-lg">No tournaments found</p>
            <p className="text-slate-500 text-sm mt-2">Try different filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tournaments.map((t, i) => (
              <TournamentCard key={t.id} tournament={t} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 12 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array(Math.ceil(total / 12)).fill(0).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-lg text-sm font-600 transition-all ${
                  page === i + 1
                    ? 'bg-arena-orange text-white'
                    : 'bg-arena-card border border-arena-border text-slate-400 hover:text-white'
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
