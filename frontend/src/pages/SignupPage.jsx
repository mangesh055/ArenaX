import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SignUp } from '@clerk/clerk-react';

export default function SignupPage() {
  const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

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
          <p className="text-slate-400 text-xl mb-12">Register with your @vit.edu email and join tournaments instantly.</p>
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
            <h2 className="font-display font-700 text-2xl text-white mb-1">Create your account</h2>
            <p className="text-slate-400 text-sm mb-6">Sign up with your @vit.edu account to start using ArenaX.</p>

            {clerkEnabled ? (
              <div className="min-h-[480px]">
                <SignUp
                  path="/signup"
                  routing="path"
                  signInUrl="/login"
                  afterSignUpUrl="/"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-arena-border p-6 text-center">
                <p className="text-slate-400 mb-4">Clerk is not configured yet.</p>
                <p className="text-xs text-slate-500 mb-6">Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in frontend .env to enable Clerk sign up.</p>
                <Link to="/login"
                  className="inline-block px-6 py-3 rounded-xl bg-arena-orange text-white font-600 hover:bg-arena-orange/90 transition-all">
                  Back to Login
                </Link>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-arena-orange hover:text-arena-orange/90">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
