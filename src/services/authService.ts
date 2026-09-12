import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DbProfile } from '../types/database';

export interface UserSession {
  id: string;
  email?: string;
  isGuest: boolean;
  username: string;
}

const LOCAL_USER_KEY = 'mimictoon_local_user';
const LOCAL_PROFILE_KEY = 'mimictoon_local_profile';

function getLocalProfile(): DbProfile {
  try {
    const saved = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (_) {}

  const defaultProfile: DbProfile = {
    id: 'guest-user-' + Math.random().toString(36).substring(2, 9),
    username: 'MimicBuddy',
    display_name: 'Mimic Buddy',
    avatar_url: null,
    selected_character_id: 'bunny',
    custom_model_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(defaultProfile));
  } catch (_) {}

  return defaultProfile;
}

function saveLocalProfile(profile: DbProfile): void {
  try {
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  } catch (_) {}
}

export const authService = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  async getCurrentSession(): Promise<UserSession> {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        return {
          id: data.session.user.id,
          email: data.session.user.email,
          isGuest: false,
          username:
            data.session.user.user_metadata?.username ||
            data.session.user.email?.split('@')[0] ||
            'Player',
        };
      }
    }

    // Fallback: Local guest session
    const localProf = getLocalProfile();
    return {
      id: localProf.id,
      isGuest: true,
      username: localProf.username,
    };
  },

  async signUp(email: string, password: string, username: string, characterId = 'bunny') {
    if (!supabase) {
      // Local simulated signup
      const prof = getLocalProfile();
      prof.username = username;
      prof.display_name = username;
      prof.selected_character_id = characterId;
      prof.updated_at = new Date().toISOString();
      saveLocalProfile(prof);
      return { user: { id: prof.id, email }, profile: prof, error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          selected_character_id: characterId,
        },
      },
    });

    if (error) {
      return { user: null, profile: null, error: error.message };
    }

    if (data.user) {
      // Upsert profile
      const newProfile: DbProfile = {
        id: data.user.id,
        username,
        display_name: username,
        avatar_url: null,
        selected_character_id: characterId,
        custom_model_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await supabase.from('profiles').upsert(newProfile);
      return { user: data.user, profile: newProfile, error: null };
    }

    return { user: null, profile: null, error: 'Registration failed' };
  },

  async signIn(email: string, password: string) {
    if (!supabase) {
      const prof = getLocalProfile();
      return { user: { id: prof.id, email }, profile: prof, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, profile: null, error: error.message };
    }

    if (data.user) {
      const profile = await this.getProfile(data.user.id);
      return { user: data.user, profile, error: null };
    }

    return { user: null, profile: null, error: 'Sign in failed' };
  },

  async signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
  },

  async getProfile(userId: string): Promise<DbProfile | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as DbProfile;
      }
    }

    return getLocalProfile();
  },

  async updateProfile(userId: string, updates: Partial<DbProfile>): Promise<DbProfile | null> {
    const updatedAt = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: updatedAt,
        })
        .eq('id', userId)
        .select()
        .single();

      if (!error && data) {
        return data as DbProfile;
      }
    }

    // Local profile update
    const prof = getLocalProfile();
    const updated = {
      ...prof,
      ...updates,
      updated_at: updatedAt,
    };
    saveLocalProfile(updated);
    return updated;
  },

  async updateSelectedCharacter(userId: string, characterId: string, modelUrl?: string) {
    return this.updateProfile(userId, {
      selected_character_id: characterId,
      custom_model_url: modelUrl || null,
    });
  },

  onAuthStateChange(callback: (session: UserSession | null) => void) {
    if (!supabase) {
      return { unsubscribe: () => {} };
    }

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email,
          isGuest: false,
          username:
            session.user.user_metadata?.username ||
            session.user.email?.split('@')[0] ||
            'Player',
        });
      } else {
        const local = getLocalProfile();
        callback({
          id: local.id,
          isGuest: true,
          username: local.username,
        });
      }
    });

    return {
      unsubscribe: () => {
        data.subscription.unsubscribe();
      },
    };
  },
};
