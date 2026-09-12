-- ==============================================================================
-- MIMICTOON SUPABASE DATABASE SCHEMA
-- Kid-friendly Motion-Tracking Cartoon Avatar Application
-- ==============================================================================
-- Privacy Note:
-- This schema strictly complies with privacy standards:
-- - NO raw webcam video is stored.
-- - NO audio recordings are stored.
-- - ONLY game progress, scores, achievements, and player preferences are stored.
-- ==============================================================================

-- 1. PROFILES TABLE
-- Stores public user profile and character selection
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  selected_character_id text not null default 'bunny',
  custom_model_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone for leaderboards"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. USER PROGRESS TABLE
-- Stores gamification stats: XP, Level, Stars, Streak, and completed challenges
create table if not exists public.user_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  xp bigint not null default 0,
  level integer not null default 1,
  stars integer not null default 0,
  streak_days integer not null default 1,
  last_active_date date not null default current_date,
  poses_completed integer not null default 0,
  minutes_played integer not null default 0,
  completed_challenge_ids text[] not null default '{}',
  unlocked_character_ids text[] not null default '{"bunny", "bear", "fox", "cat", "robot"}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_progress enable row level security;

-- Policies for user_progress
create policy "User progress is viewable by everyone for leaderboards"
  on public.user_progress for select
  using (true);

create policy "Users can insert their own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.user_progress for update
  using (auth.uid() = user_id);

-- 3. GAME SCORES TABLE
-- Stores historical game scores and accuracy metrics
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id text,
  game_mode text not null default 'copy_me', -- 'copy_me', 'free_play', 'pose_match'
  character_id text not null default 'bunny',
  score integer not null,
  accuracy numeric(5, 2) not null, -- 0.00 to 100.00
  arm_accuracy numeric(5, 2),
  body_accuracy numeric(5, 2),
  head_accuracy numeric(5, 2),
  duration_seconds integer not null default 0,
  stars_earned integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.game_scores enable row level security;

-- Policies for game_scores
create policy "Scores are viewable by everyone for leaderboards"
  on public.game_scores for select
  using (true);

create policy "Users can insert their own game scores"
  on public.game_scores for insert
  with check (auth.uid() = user_id);

-- 4. BEST SCORES TABLE (Leaderboard optimized)
-- Stores highest score per challenge for each user
create table if not exists public.best_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id text not null,
  best_score integer not null,
  best_accuracy numeric(5, 2) not null,
  character_id text not null,
  achieved_at timestamptz not null default now(),
  constraint unique_user_challenge_best unique (user_id, challenge_id)
);

-- Enable RLS
alter table public.best_scores enable row level security;

-- Policies for best_scores
create policy "Best scores are viewable by everyone"
  on public.best_scores for select
  using (true);

create policy "Users can insert their own best score"
  on public.best_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own best score"
  on public.best_scores for update
  using (auth.uid() = user_id);

-- 5. USER ACHIEVEMENTS TABLE
-- Tracks unlocked badges, trophies, and milestones
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null,
  progress integer not null default 100, -- 100% or threshold count
  unlocked_at timestamptz not null default now(),
  constraint unique_user_achievement unique (user_id, achievement_id)
);

-- Enable RLS
alter table public.user_achievements enable row level security;

-- Policies for user_achievements
create policy "User achievements are viewable by everyone"
  on public.user_achievements for select
  using (true);

create policy "Users can insert their own achievements"
  on public.user_achievements for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own achievements"
  on public.user_achievements for update
  using (auth.uid() = user_id);

-- 6. PERFORMANCE INDEXES
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_user_progress_xp on public.user_progress(xp desc);
create index if not exists idx_user_progress_stars on public.user_progress(stars desc);
create index if not exists idx_user_progress_streak on public.user_progress(streak_days desc);
create index if not exists idx_game_scores_user on public.game_scores(user_id, created_at desc);
create index if not exists idx_best_scores_challenge on public.best_scores(challenge_id, best_score desc);
create index if not exists idx_user_achievements_user on public.user_achievements(user_id);

-- 7. AUTOMATIC USER CREATION TRIGGER
-- When a user registers via Supabase Auth, automatically initialize their Profile and User Progress
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_username text;
  chosen_character text;
begin
  -- Derive username from metadata or email
  raw_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'Player'
  );

  chosen_character := coalesce(
    new.raw_user_meta_data->>'selected_character_id',
    'bunny'
  );

  -- Insert profile
  insert into public.profiles (id, username, display_name, selected_character_id)
  values (new.id, raw_username, raw_username, chosen_character)
  on conflict (id) do nothing;

  -- Insert initial progress
  insert into public.user_progress (user_id, xp, level, stars, streak_days, poses_completed, minutes_played)
  values (new.id, 0, 1, 0, 1, 0, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. LEADERBOARD VIEW
create or replace view public.leaderboard_xp_view as
select 
  p.id as user_id,
  p.username,
  p.display_name,
  p.selected_character_id,
  up.xp,
  up.level,
  up.stars,
  up.streak_days,
  up.poses_completed
from public.profiles p
join public.user_progress up on up.user_id = p.id
order by up.xp desc;
