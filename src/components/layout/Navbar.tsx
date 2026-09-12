import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Flame,
  Volume2,
  VolumeX,
  Smile,
  Gamepad2,
  Trophy,
  Sliders,
  Camera,
  Home,
  Menu,
  X,
  Play,
  User,
  Cloud,
} from 'lucide-react';
import { CharacterProfile, UserStats, AppPage } from '../../types';
import { playSoundEffect } from '../../utils/audioEffects';
import { UserSession } from '../../services/authService';
import { DbProfile } from '../../types/database';

interface NavbarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  activeCharacter: CharacterProfile;
  stats: UserStats;
  audioFeedback: boolean;
  onToggleAudio: () => void;
  session?: UserSession;
  profile?: DbProfile | null;
  onOpenProfileModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  activeCharacter,
  stats,
  audioFeedback,
  onToggleAudio,
  session,
  profile,
  onOpenProfileModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: AppPage; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'landing', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'characters', label: 'Buddies', icon: <Smile className="w-4 h-4" /> },
    { id: 'camera-setup', label: 'Camera Check', icon: <Camera className="w-4 h-4" /> },
    { id: 'experience', label: 'Live Studio', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { id: 'copyme', label: 'Copy Me', icon: <Gamepad2 className="w-4 h-4 text-orange-500" />, badge: 'Game' },
    { id: 'progress', label: 'Progress', icon: <Trophy className="w-4 h-4 text-yellow-500" /> },
    { id: 'settings', label: 'Settings', icon: <Sliders className="w-4 h-4 text-slate-500" /> },
  ];

  const handleItemClick = (page: AppPage) => {
    if (audioFeedback) playSoundEffect('click');
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-amber-200/90 px-3 sm:px-6 py-3 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div
          onClick={() => handleItemClick('landing')}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <motion.div
            whileHover={{ scale: 1.08, rotate: [0, -6, 6, 0] }}
            className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-white"
          >
            <span className="text-xl">🦊</span>
          </motion.div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors">
                Mimic<span className="text-amber-500">Toon</span>
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 hidden sm:inline-block">
                AI Mirror
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold hidden md:block">
              Interactive 3D Motion & Voice Mirror
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links (Pill Bar) */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side Utilities: Stars, Streak, Audio, Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Stars Counter */}
          <button
            onClick={() => handleItemClick('progress')}
            className="cursor-pointer flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-amber-900 font-bold text-xs sm:text-sm hover:bg-amber-100 transition"
            title="Total Stars Collected"
          >
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>{stats.stars}</span>
            <span className="hidden sm:inline text-amber-600 text-[10px] font-bold">Stars</span>
          </button>

          {/* Streak Counter */}
          <button
            onClick={() => handleItemClick('progress')}
            className="cursor-pointer flex items-center gap-1 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl text-orange-900 font-bold text-xs sm:text-sm hover:bg-orange-100 transition"
            title="Daily Active Streak"
          >
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>{stats.streakDays}d</span>
            <span className="hidden sm:inline text-orange-600 text-[10px] font-bold">Streak</span>
          </button>

          {/* Player Profile & Cloud Sync Pill */}
          {onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition shadow-2xs text-xs font-black"
              title="View Profile & Cloud Sync"
            >
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-xs">
                {activeCharacter.icon || '🐾'}
              </div>
              <span className="hidden md:inline max-w-[80px] truncate">
                {profile?.display_name || profile?.username || session?.username || 'Hero'}
              </span>
            </button>
          )}

          {/* Audio Feedback Toggle */}
          <button
            onClick={onToggleAudio}
            className="p-2 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
            title={audioFeedback ? 'Mute Sound FX' : 'Unmute Sound FX'}
          >
            {audioFeedback ? (
              <Volume2 className="w-4 h-4 text-amber-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Direct CTA Button to Live Studio */}
          {currentPage !== 'experience' && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleItemClick('experience')}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-black shadow-md shadow-amber-400/30 transition"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play Live</span>
            </motion.button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden border-t border-slate-200 mt-2.5 pt-2 pb-1 space-y-1"
          >
            <div className="grid grid-cols-2 gap-1.5 p-1">
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`p-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition ${
                      isActive
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-black uppercase bg-orange-500 text-white px-1.5 py-0.2 rounded-full ml-auto">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
