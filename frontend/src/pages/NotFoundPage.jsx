import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-arena-bg pt-16 flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md">
        <div className="relative mb-8">
          <p className="font-display font-800 text-9xl text-arena-border select-none">404</p>
          <p className="absolute inset-0 flex items-center justify-center font-display font-800 text-7xl gradient-text">
            404
          </p>
        </div>
        <h2 className="font-display font-700 text-2xl text-white mb-3">Page Not Found</h2>
        <p className="text-slate-400 text-sm mb-8">
          This arena doesn't exist. The tournament may have ended or the link is invalid.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="px-6 py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all">
            Go Home
          </Link>
          <Link to="/tournaments" className="px-6 py-3 rounded-xl border border-arena-border text-slate-400 font-600 hover:text-white transition-all">
            Browse Tournaments
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
