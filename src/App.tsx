import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/pages/LandingPage';
import { CharacterSelectionPage } from './components/pages/CharacterSelectionPage';
import { CameraSetupPage } from './components/pages/CameraSetupPage';
import { LiveExperiencePage } from './components/pages/LiveExperiencePage';
import { CopyMeGamePage } from './components/pages/CopyMeGamePage';
import { ResultsPage } from './components/pages/ResultsPage';
import { ProgressPage } from './components/pages/ProgressPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { UserProfileModal } from './components/profile/UserProfileModal';
import {
  CHARACTERS,
  getCharacterById,
  getSavedSelectedCharacterId,
  saveSelectedCharacterId,
} from './data/characters';
import { CharacterProfile, StudioSettings, UserStats, AppPage, GameSessionResult } from './types';
import { playSoundEffect } from './utils/audioEffects';
import { authService, UserSession } from './services/authService';
import { progressService } from './services/progressService';
import { scoreService } from './services/scoreService';
import { achievementService } from './services/achievementService';
import { DbProfile, DbUserProgress, AchievementDefinition } from './types/database';

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('landing');
  const [activeCharacter, setActiveCharacter] = useState<CharacterProfile>(() => {
    return getCharacterById(getSavedSelectedCharacterId());
  });
  const [lastGameResult, setLastGameResult] = useState<GameSessionResult | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState(false);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<AchievementDefinition[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // User Session & Supabase Profile
  const [session, setSession] = useState<UserSession>({
    id: 'guest-player',
    isGuest: true,
    username: 'MimicBuddy',
  });
  const [profile, setProfile] = useState<DbProfile | null>(null);

  // Supabase User Progress
  const [userProgress, setUserProgress] = useState<DbUserProgress>({
    user_id: 'guest-player',
    xp: 280,
    level: 2,
    stars: 12,
    streak_days: 3,
    last_active_date: new Date().toISOString().split('T')[0],
    poses_completed: 12,
    minutes_played: 18,
    completed_challenge_ids: ['high-five', 'sky-reach'],
    unlocked_character_ids: ['bunny', 'bear', 'fox', 'cat', 'robot'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // User Stats state for compatibility
  const [stats, setStats] = useState<UserStats>({
    stars: 12,
    streakDays: 3,
    posesCompleted: 12,
    minutesPlayed: 18,
    unlockedCharacters: ['bunny', 'bear', 'fox', 'cat', 'robot'],
  });

  // Initialize session, profile, and progress
  useEffect(() => {
    let isMounted = true;

    async function initUser() {
      const activeSession = await authService.getCurrentSession();
      if (!isMounted) return;
      setSession(activeSession);

      const userProf = await authService.getProfile(activeSession.id);
      if (!isMounted) return;
      if (userProf) {
        setProfile(userProf);
        if (userProf.selected_character_id) {
          const char = getCharacterById(userProf.selected_character_id);
          setActiveCharacter(char);
        }
      }

      const prog = await progressService.getUserProgress(activeSession.id);
      if (!isMounted) return;
      setUserProgress(prog);
      setStats({
        stars: prog.stars,
        streakDays: prog.streak_days,
        posesCompleted: prog.poses_completed,
        minutesPlayed: prog.minutes_played,
        unlockedCharacters: prog.unlocked_character_ids,
      });
    }

    initUser();

    const { unsubscribe } = authService.onAuthStateChange(async (newSession) => {
      if (!newSession) return;
      setSession(newSession);
      const userProf = await authService.getProfile(newSession.id);
      if (userProf) {
        setProfile(userProf);
        if (userProf.selected_character_id) {
          setActiveCharacter(getCharacterById(userProf.selected_character_id));
        }
      }
      const prog = await progressService.getUserProgress(newSession.id);
      setUserProgress(prog);
      setStats({
        stars: prog.stars,
        streakDays: prog.streak_days,
        posesCompleted: prog.poses_completed,
        minutesPlayed: prog.minutes_played,
        unlockedCharacters: prog.unlocked_character_ids,
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSelectCharacter = async (char: CharacterProfile) => {
    setActiveCharacter(char);
    saveSelectedCharacterId(char.id);

    // Sync to Supabase profile
    const updated = await authService.updateSelectedCharacter(session.id, char.id, char.modelUrl);
    if (updated) {
      setProfile(updated);
    }
  };

  // Settings
  const [settings, setSettings] = useState<StudioSettings>({
    mirrorCamera: true,
    showSkeletonOverlay: true,
    smoothingFactor: 0.25,
    movementSensitivity: 1.0,
    confidenceThreshold: 0.45,
    activeVoiceEffect: 'chipmunk',
    micSensitivity: 1.0,
    themeEnvironment: 'playground',
    speechRecognitionEnabled: true,
    audioFeedback: true,
  });

  const handleAwardStars = async (count: number) => {
    const updated = await progressService.recordGameProgress(session.id, {
      xp: count * 15,
      stars: count,
      posesCount: 1,
      minutes: 1,
    });
    setUserProgress(updated);
    setStats({
      stars: updated.stars,
      streakDays: updated.streak_days,
      posesCompleted: updated.poses_completed,
      minutesPlayed: updated.minutes_played,
      unlockedCharacters: updated.unlocked_character_ids,
    });
  };

  const handleUpdateSettings = (newSettings: Partial<StudioSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleNavigate = (page: AppPage) => {
    if (settings.audioFeedback) {
      playSoundEffect('pop');
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishGameSession = async (result: GameSessionResult) => {
    setLastGameResult(result);

    const overallAccuracy = Math.round(
      (result.armAccuracy + result.bodyAccuracy + result.headAccuracy) / 3
    );

    // 1. Save Score into Supabase game_scores and best_scores
    // Privacy note: Strictly numeric scores & game tags. No webcam video, no mic audio.
    const { scoreRecord, isNewBest } = await scoreService.saveGameScore({
      userId: session.id,
      challengeId: 'copy-me-round',
      gameMode: 'copy_me',
      characterId: activeCharacter.id,
      score: result.score,
      accuracy: overallAccuracy,
      armAccuracy: result.armAccuracy,
      bodyAccuracy: result.bodyAccuracy,
      headAccuracy: result.headAccuracy,
      durationSeconds: 45,
      starsEarned: result.starsEarned,
      xpEarned: result.xpEarned,
    });

    setIsNewBestScore(isNewBest);

    // 2. Record Progress into Supabase user_progress (XP, Stars, Streak, Level, Poses)
    const updatedProgress = await progressService.recordGameProgress(session.id, {
      xp: result.xpEarned,
      stars: result.starsEarned,
      posesCount: result.posesCompleted,
      minutes: 2,
      challengeId: 'copy-me-round',
    });
    setUserProgress(updatedProgress);

    // 3. Evaluate and Unlock Achievements into Supabase user_achievements
    const newlyUnlocked = await achievementService.checkAndUnlockAchievements(session.id, {
      progress: updatedProgress,
      latestScore: scoreRecord,
      selectedCharacterId: activeCharacter.id,
    });
    setNewlyUnlockedAchievements(newlyUnlocked);

    // 4. Update memory stats
    setStats({
      stars: updatedProgress.stars,
      streakDays: updatedProgress.streak_days,
      posesCompleted: updatedProgress.poses_completed,
      minutesPlayed: updatedProgress.minutes_played,
      unlockedCharacters: updatedProgress.unlocked_character_ids,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-50/50 via-white to-orange-50/40 text-slate-800 antialiased selection:bg-amber-200">
      {/* Primary Navigation Bar with 8 Pages Navigation and Player Profile */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        activeCharacter={activeCharacter}
        stats={stats}
        audioFeedback={settings.audioFeedback}
        onToggleAudio={() => handleUpdateSettings({ audioFeedback: !settings.audioFeedback })}
        session={session}
        profile={profile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Page View Content */}
      <main className="flex-1">
        {currentPage === 'landing' && (
          <LandingPage
            activeCharacter={activeCharacter}
            onSelectCharacter={handleSelectCharacter}
            onNavigate={handleNavigate}
            stats={stats}
          />
        )}

        {currentPage === 'characters' && (
          <CharacterSelectionPage
            activeCharacter={activeCharacter}
            onSelectCharacter={handleSelectCharacter}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'camera-setup' && (
          <CameraSetupPage
            activeCharacter={activeCharacter}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'experience' && (
          <LiveExperiencePage
            activeCharacter={activeCharacter}
            onSelectCharacter={handleSelectCharacter}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            stats={stats}
            onAwardStars={handleAwardStars}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'copyme' && (
          <CopyMeGamePage
            activeCharacter={activeCharacter}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            stats={stats}
            onAwardStars={handleAwardStars}
            onNavigate={handleNavigate}
            onFinishGameSession={handleFinishGameSession}
          />
        )}

        {currentPage === 'results' && (
          <ResultsPage
            result={lastGameResult}
            stats={stats}
            isNewBest={isNewBestScore}
            newlyUnlocked={newlyUnlockedAchievements}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'progress' && (
          <ProgressPage
            session={session}
            profile={profile}
            progress={userProgress}
            onNavigate={handleNavigate}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
          />
        )}

        {currentPage === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Profile & Supabase Sync Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        session={session}
        profile={profile}
        progress={userProgress}
        onProfileUpdated={(updated) => setProfile(updated)}
        onSessionUpdated={(updated) => setSession(updated)}
      />

      {/* Persistent Kid-Safe Footer */}
      <Footer />
    </div>
  );
}
