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
    { id: 'landing', label: 'Home', icon: <Home className="w-3.5 h-3.5" /> },
    { id: 'characters', label: 'Buddies', icon: <Smile className="w-3.5 h-3.5" /> },
    { id: 'camera-setup', label: 'Camera Check', icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'experience', label: 'Live Studio', icon: <Sparkles className="w-3.5 h-3.5 text-[#E76F51]" /> },
    { id: 'copyme', label: 'Copy Me', icon: <Gamepad2 className="w-3.5 h-3.5 text-[#E76F51]" />, badge: 'Game' },
    { id: 'progress', label: 'Progress', icon: <Trophy className="w-3.5 h-3.5 text-[#D49826]" /> },
    { id: 'settings', label: 'Settings', icon: <Sliders className="w-3.5 h-3.5 text-[#6C655E]" /> },
  ];

  const handleItemClick = (page: AppPage) => {
    if (audioFeedback) playSoundEffect('click');
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-[#E6DED3] px-3 sm:px-6 py-2.5 transition-all shadow-[0_1px_3px_rgba(35,32,29,0.04)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div
          onClick={() => handleItemClick('landing')}
          className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-[#FDF0EB] border border-[#F7CEC3] flex items-center justify-center text-lg shadow-2xs transition-colors group-hover:border-[#E76F51]"
          >
            <span>🦊</span>
          </motion.div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#23201D] group-hover:text-[#E76F51] transition-colors">
                Mimic<span className="text-[#E76F51]">Toon</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EBF7F0] text-[#226D43] border border-[#BFE3CD] hidden sm:inline-block">
                AI Mirror
              </span>
            </div>
            <p className="text-[10px] text-[#988F85] font-bold tracking-tight hidden md:block">
              Interactive 3D Motion & Voice Mirror
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links (Segmented Pill Bar) */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#F4EFE6] p-1 rounded-xl border border-[#E6DED3]">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#23201D] shadow-xs border border-[#DFD6CA]'
                    : 'text-[#6C655E] hover:text-[#23201D] hover:bg-white/60 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-[#E76F51] text-white px-1.5 py-0.2 rounded-md">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Side Utilities: Stars, Streak, Audio, Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Stars Counter */}
          <button
            onClick={() => handleItemClick('progress')}
            className="cursor-pointer flex items-center gap-1.5 bg-[#FEF7E8] border border-[#FBE2A8] px-2.5 py-1 rounded-lg text-[#23201D] font-extrabold text-xs sm:text-sm hover:bg-[#FDF0D0] transition shadow-2xs"
            title="Total Stars Collected"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F2C66D] fill-[#F2C66D]" />
            <span>{stats.stars}</span>
            <span className="hidden sm:inline text-[#988F85] text-[10px] font-bold">Stars</span>
          </button>

          {/* Streak Counter */}
          <button
            onClick={() => handleItemClick('progress')}
            className="cursor-pointer flex items-center gap-1.5 bg-[#FDF0EB] border border-[#F7CEC3] px-2.5 py-1 rounded-lg text-[#23201D] font-extrabold text-xs sm:text-sm hover:bg-[#FCE2D9] transition shadow-2xs"
            title="Daily Active Streak"
          >
            <Flame className="w-3.5 h-3.5 text-[#E76F51] fill-[#E76F51]" />
            <span>{stats.streakDays}d</span>
            <span className="hidden sm:inline text-[#988F85] text-[10px] font-bold">Streak</span>
          </button>

          {/* Player Profile & Cloud Sync Pill */}
          {onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E6DED3] bg-white hover:bg-[#F8F4EC] text-[#23201D] transition shadow-2xs text-xs font-extrabold"
              title="View Profile & Cloud Sync"
            >
              <div className="w-5 h-5 rounded-md bg-[#F4EFE6] border border-[#E6DED3] flex items-center justify-center text-xs">
                {activeCharacter.icon || '🐾'}
              </div>
              <span className="hidden md:inline max-w-[80px] truncate text-xs">
                {profile?.display_name || profile?.username || session?.username || 'Hero'}
              </span>
            </button>
          )}

          {/* Audio Feedback Toggle */}
          <button
            onClick={onToggleAudio}
            className="cursor-pointer p-2 rounded-lg border border-[#E6DED3] bg-white text-[#6C655E] hover:text-[#23201D] hover:bg-[#F8F4EC] transition shadow-2xs"
            title={audioFeedback ? 'Mute Sound FX' : 'Unmute Sound FX'}
          >
            {audioFeedback ? (
              <Volume2 className="w-4 h-4 text-[#E76F51]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#988F85]" />
            )}
          </button>

          {/* Direct CTA Button to Live Studio */}
          {currentPage !== 'experience' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleItemClick('experience')}
              className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#E76F51] hover:bg-[#D85D3F] text-white text-xs sm:text-sm font-black shadow-tactile-coral transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play Live</span>
            </motion.button>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg border border-[#E6DED3] text-[#23201D] hover:bg-[#F8F4EC] transition cursor-pointer"
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
            className="lg:hidden overflow-hidden border-t border-[#E6DED3] mt-2.5 pt-2 pb-1 space-y-1"
          >
            <div className="grid grid-cols-2 gap-1.5 p-1">
              {navItems.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`p-2.5 rounded-lg text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                      isActive
                        ? 'bg-[#FDF0EB] text-[#C04F34] border border-[#F7CEC3]'
                        : 'bg-[#F8F4EC] text-[#6C655E] hover:bg-white hover:text-[#23201D] border border-transparent'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-black uppercase bg-[#E76F51] text-white px-1.5 py-0.2 rounded-md ml-auto">
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
