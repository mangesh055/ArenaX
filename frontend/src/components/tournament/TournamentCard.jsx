import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  gaming: { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  coding: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  sports: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
  cultural: { bg: 'bg-pink-500/20', text: 'text-pink-400', dot: 'bg-pink-400' },
  other: { bg: 'bg-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400' },
};

const CATEGORY_ICONS = {
  gaming: '🎮',
  coding: '💻',
  sports: '⚽',
  cultural: '🎭',
  other: '🏆',
};

const STATUS_MAP = {
  published: { label: 'Open', class: 'text-green-400 bg-green-400/10' },
  ongoing: { label: 'Live', class: 'text-arena-orange bg-arena-orange/10' },
  completed: { label: 'Ended', class: 'text-slate-400 bg-slate-400/10' },
  pending_approval: { label: 'Pending', class: 'text-yellow-400 bg-yellow-400/10' },
  draft: { label: 'Draft', class: 'text-slate-500 bg-slate-500/10' },
  cancelled: { label: 'Cancelled', class: 'text-red-400 bg-red-400/10' },
};

const BANNERS = {
  gaming: 'linear-gradient(135deg, #1a0030 0%, #2d1b69 50%, #0f0040 100%)',
  coding: 'linear-gradient(135deg, #001a2e 0%, #0c4a6e 50%, #001a2e 100%)',
  sports: 'linear-gradient(135deg, #001a0e 0%, #14532d 50%, #001a0e 100%)',
  cultural: 'linear-gradient(135deg, #1a0020 0%, #6b21a8 50%, #1a0020 100%)',
  other: 'linear-gradient(135deg, #1a1000 0%, #78350f 50%, #1a1000 100%)',
};

export default function TournamentCard({ tournament: initialTournament, index = 0 }) {
  const [tournament, setTournament] = useState(initialTournament);
  const [bannerError, setBannerError] = useState(false);
  
  useEffect(() => {
    setTournament(initialTournament);
    setBannerError(false);
  }, [initialTournament]);
  
  useEffect(() => {
    const refreshTournament = () => {
      import('../../api/index.js').then(({ tournamentAPI }) => {
        tournamentAPI.get(initialTournament.id).then(data => {
          setTournament(data.data || data);
        }).catch(() => {});
      });
    };

    const handleParticipantsUpdate = (event) => {
      if (event.detail.tournamentId === initialTournament.id) {
        refreshTournament();
      }
    };

    const handleStatusUpdate = (event) => {
      if (event.detail.tournamentId === initialTournament.id) {
        refreshTournament();
      }
    };
    
    window.addEventListener('tournament-participants-updated', handleParticipantsUpdate);
    window.addEventListener('tournament-status-updated', handleStatusUpdate);
    return () => {
      window.removeEventListener('tournament-participants-updated', handleParticipantsUpdate);
      window.removeEventListener('tournament-status-updated', handleStatusUpdate);
    };
  }, [initialTournament.id]);
  
  const cat = CATEGORY_COLORS[tournament.category] || CATEGORY_COLORS.other;
  const status = STATUS_MAP[tournament.status] || STATUS_MAP.draft;
  const isOngoing = tournament.status === 'ongoing';
  const bannerUrl = tournament.banner_url || tournament.bannerUrl || tournament.banner || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="tournament-card flex-shrink-0 w-64 rounded-2xl border border-arena-border overflow-hidden cursor-pointer"
      style={{ background: '#0f0f1e' }}>
      <Link to={`/tournaments/${tournament.id}`} className="block">
        {/* Banner */}
        <div className="h-36 relative flex items-center justify-center overflow-hidden"
          style={{ background: (!bannerUrl || bannerError) ? BANNERS[tournament.category] : undefined }}>
          {bannerUrl && !bannerError && (
            <img
              src={bannerUrl}
              alt={tournament.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={() => setBannerError(true)}
            />
          )}
          <span className="text-5xl">{CATEGORY_ICONS[tournament.category]}</span>
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20" />
          {/* Live pulse */}
          {isOngoing && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-arena-orange animate-pulse" />
              <span className="text-xs text-arena-orange font-600">LIVE</span>
            </div>
          )}
          {/* Status */}
          <div className={`absolute top-3 right-3 text-xs font-600 px-2 py-0.5 rounded-full ${status.class}`}>
            {status.label}
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Category */}
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-600 mb-2 ${cat.bg} ${cat.text}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
            {tournament.category.toUpperCase()}
          </div>

          <h3 className="font-display font-700 text-white text-sm leading-tight mb-2 line-clamp-2">
            {tournament.title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mb-3">{tournament.description}</p>

          {/* Meta */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">📅 {format(new Date(tournament.start_date), 'MMM d, yyyy')}</span>
              <span className="text-slate-400">{tournament.team_based ? '👥 Teams' : '👤 Solo'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">📍 {tournament.venue || 'VIT Campus'}</span>
              <span className="text-arena-orange font-600">
                {tournament.current_participants}/{tournament.max_participants}
              </span>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="mt-3 h-1 rounded-full bg-arena-border overflow-hidden">
            <div className="h-full bg-arena-orange rounded-full transition-all"
              style={{ width: `${Math.min(100, (tournament.current_participants / tournament.max_participants) * 100)}%` }} />
          </div>

          {tournament.prize_pool && (
            <div className="mt-3 flex items-center gap-1 text-xs text-yellow-400 font-600">
              <span>🏆</span>
              <span className="truncate">{tournament.prize_pool}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
