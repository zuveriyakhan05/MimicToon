import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Shield,
  Cloud,
  CloudOff,
  LogOut,
  LogIn,
  UserPlus,
  Sparkles,
  Flame,
  Star,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Edit2,
  KeyRound,
} from 'lucide-react';
import { authService, UserSession } from '../../services/authService';
import { DbProfile, DbUserProgress } from '../../types/database';
import { CHARACTERS, getCharacterById } from '../../data/characters';
import { calculateLevelFromXP } from '../../services/progressService';
import { playSoundEffect } from '../../utils/audioEffects';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  profile: DbProfile | null;
  progress: DbUserProgress;
  onProfileUpdated: (profile: DbProfile) => void;
  onSessionUpdated: (session: UserSession) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  session,
  profile,
  progress,
  onProfileUpdated,
  onSessionUpdated,
}) => {
  const isCloudConnected = authService.isConfigured();
  const [activeTab, setActiveTab] = useState<'profile' | 'signin' | 'signup'>('profile');

  // Auth form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(profile?.username || 'MimicBuddy');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Edit profile states
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsernameVal, setEditUsernameVal] = useState(profile?.username || '');

  const activeChar = getCharacterById(profile?.selected_character_id || 'bunny');
  const levelInfo = calculateLevelFromXP(Number(progress.xp));

  const handleSaveUsername = async () => {
    if (!editUsernameVal.trim() || !profile) return;
    setIsLoading(true);
    const updated = await authService.updateProfile(session.id, {
      username: editUsernameVal.trim(),
      display_name: editUsernameVal.trim(),
    });
    setIsLoading(false);
    if (updated) {
      onProfileUpdated(updated);
      onSessionUpdated({ ...session, username: updated.username });
      setIsEditingUsername(false);
      playSoundEffect('star');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsLoading(true);

    const { user, profile: signedProfile, error } = await authService.signIn(email, password);
    setIsLoading(false);

    if (error) {
      setAuthError(error);
      return;
    }

    if (user && signedProfile) {
      setAuthSuccess('Welcome back! Successfully logged in.');
      playSoundEffect('fanfare');
      onSessionUpdated({
        id: user.id,
        email: user.email,
        isGuest: false,
        username: signedProfile.username,
      });
      onProfileUpdated(signedProfile);
      setTimeout(() => {
        setActiveTab('profile');
      }, 1000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    const { user, profile: newProf, error } = await authService.signUp(
      email,
      password,
      username,
      profile?.selected_character_id || 'bunny'
    );
    setIsLoading(false);

    if (error) {
      setAuthError(error);
      return;
    }

    if (user && newProf) {
      setAuthSuccess('Account created! Progress is now safely synced.');
      playSoundEffect('fanfare');
      onSessionUpdated({
        id: user.id,
        email: user.email,
        isGuest: false,
        username: newProf.username,
      });
      onProfileUpdated(newProf);
      setTimeout(() => {
        setActiveTab('profile');
      }, 1000);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await authService.signOut();
    const guestSession = await authService.getCurrentSession();
    const guestProfile = await authService.getProfile(guestSession.id);
    setIsLoading(false);

    onSessionUpdated(guestSession);
    if (guestProfile) onProfileUpdated(guestProfile);
    playSoundEffect('pop');
    setActiveTab('profile');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-amber-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-400 flex items-center justify-center text-xl shadow-xs">
                {activeChar.icon || '🐰'}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Player Profile & Sync</h3>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  {isCloudConnected ? (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Supabase Cloud Sync</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-700">
                      <CloudOff className="w-3.5 h-3.5" />
                      <span>Local Device Storage</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cloud Info Notice if Supabase not configured */}
          {!isCloudConnected && (
            <div className="px-6 py-2.5 bg-amber-100/70 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Offline & Local Mode: </span>
                <span>
                  All your progress, stars, and scores are stored locally in your browser. To link to Supabase, provide{' '}
                  <code className="bg-white/80 px-1 rounded font-mono font-bold">VITE_SUPABASE_URL</code> and{' '}
                  <code className="bg-white/80 px-1 rounded font-mono font-bold">VITE_SUPABASE_ANON_KEY</code>.
                </span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
            <button
              onClick={() => {
                setActiveTab('profile');
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className={`pb-2.5 px-4 text-xs font-black border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Player Info
            </button>

            {session.isGuest ? (
              <>
                <button
                  onClick={() => {
                    setActiveTab('signin');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className={`pb-2.5 px-4 text-xs font-black border-b-2 transition ${
                    activeTab === 'signin'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setActiveTab('signup');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className={`pb-2.5 px-4 text-xs font-black border-b-2 transition ${
                    activeTab === 'signup'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Create Account
                </button>
              </>
            ) : (
              <div className="ml-auto pb-2 flex items-center">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Logged In
                </span>
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6">
            {authError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{authSuccess}</span>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                {/* User Card */}
                <div className="p-4 rounded-3xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-amber-200 flex items-center justify-center text-3xl shadow-xs">
                      {activeChar.icon || '🐰'}
                    </div>
                    <div>
                      {isEditingUsername ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editUsernameVal}
                            onChange={(e) => setEditUsernameVal(e.target.value)}
                            className="px-2 py-1 text-sm font-black border rounded-lg border-amber-300 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveUsername}
                            disabled={isLoading}
                            className="px-2.5 py-1 text-xs font-black bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">
                            {profile?.display_name || profile?.username || session.username}
                          </h4>
                          <button
                            onClick={() => {
                              setEditUsernameVal(profile?.username || session.username);
                              setIsEditingUsername(true);
                            }}
                            className="text-slate-400 hover:text-slate-700"
                            title="Edit username"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs font-bold text-slate-500">
                        {session.isGuest ? 'Guest Player' : session.email}
                      </p>
                      <span className="inline-block text-[10px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.2 rounded-md mt-1">
                        Active Buddy: {activeChar.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-slate-400">Level</span>
                    <div className="text-2xl font-black text-amber-500">{levelInfo.level}</div>
                  </div>
                </div>

                {/* Level Progress */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <div className="flex justify-between text-xs font-black text-slate-700">
                    <span>Level {levelInfo.level} Master</span>
                    <span>
                      {levelInfo.currentLevelXp} / {levelInfo.nextLevelXp} XP ({levelInfo.progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-3 bg-amber-200/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${levelInfo.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Mini Stats Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
                    <Star className="w-4 h-4 mx-auto text-amber-500 fill-amber-400" />
                    <div className="text-xs font-black text-slate-400 uppercase mt-1">Stars</div>
                    <div className="text-base font-black text-slate-800">{progress.stars}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
                    <Flame className="w-4 h-4 mx-auto text-orange-500 fill-orange-500" />
                    <div className="text-xs font-black text-slate-400 uppercase mt-1">Streak</div>
                    <div className="text-base font-black text-slate-800">{progress.streak_days}d</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 text-center">
                    <Trophy className="w-4 h-4 mx-auto text-purple-500" />
                    <div className="text-xs font-black text-slate-400 uppercase mt-1">Poses</div>
                    <div className="text-base font-black text-slate-800">{progress.poses_completed}</div>
                  </div>
                </div>

                {/* Account Action */}
                {!session.isGuest ? (
                  <button
                    onClick={handleSignOut}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-2xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-black flex items-center justify-center gap-2 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out to Guest Mode</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveTab('signup')}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-amber-400/30 transition hover:from-amber-500 hover:to-orange-500"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Save & Sync Progress to Supabase</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB: SIGN IN */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 text-sm font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 text-sm font-bold focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black text-sm shadow-md shadow-amber-400/30 flex items-center justify-center gap-2 hover:from-amber-500 hover:to-orange-500 transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                </button>
              </form>
            )}

            {/* TAB: SIGN UP */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                    Hero Name / Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="SuperBouncyFox"
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 text-sm font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 text-sm font-bold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                    Password (at least 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-amber-400 text-sm font-bold focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-black text-sm shadow-md shadow-amber-400/30 flex items-center justify-center gap-2 hover:from-amber-500 hover:to-orange-500 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isLoading ? 'Creating Account...' : 'Create Account & Sync'}</span>
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
