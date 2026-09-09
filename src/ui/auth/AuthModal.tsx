/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Lock, User, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { VeeCutLogo } from '../common/VeeCutLogo';
import { notifyToast } from '../toast/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onSuccess?: (user: { name: string; email: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Simulate authentication
    setTimeout(() => {
      setLoading(false);
      const displayName = name || (email ? email.split('@')[0] : 'Studio Creator');
      const userEmail = email || 'creator@veecut.studio';
      
      try {
        const stored = localStorage.getItem('veecut_studio_preferences_v1');
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.profile = {
          ...(parsed.profile || {}),
          name: displayName,
          email: userEmail,
        };
        localStorage.setItem('veecut_studio_preferences_v1', JSON.stringify(parsed));
      } catch (err) {
        // ignore
      }

      if (onSuccess) {
        onSuccess({ name: displayName, email: userEmail });
      }
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0e111a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Hero with VeeCut 3D Logo */}
        <div className="pt-8 pb-6 px-6 flex flex-col items-center text-center bg-gradient-to-b from-[#161a29] to-transparent border-b border-zinc-800/60">
          <div className="mb-3 relative group">
            <VeeCutLogo size={64} rounded="2xl" className="shadow-xl" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white font-sans">
            {mode === 'signin' ? 'Sign in to VeeCut Studio' : 'Create your VeeCut Account'}
          </h2>
          <p className="mt-1 text-xs text-zinc-400 max-w-xs">
            {mode === 'signin'
              ? 'Access your cloud timeline projects, neural AI assets, and custom presets'
              : 'Join millions of video creators, editors, and filmmakers worldwide'}
          </p>

          {/* Mode Switcher Pills */}
          <div className="mt-5 flex items-center p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 w-full max-w-xs">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'signin'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'signup'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="creator@veecut.studio"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">Password</label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!email) {
                      notifyToast('Please enter your email address to receive reset instructions.', 'info');
                    } else {
                      notifyToast(`Password reset link sent to ${email}.`, 'success');
                    }
                  }}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          {message && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
            ) : (
              <>
                <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted cloud synchronization & Pro license verified</span>
          </div>
        </form>
      </div>
    </div>
  );
};
