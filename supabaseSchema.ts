/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SUPABASE_SQL_SCHEMA = `-- ==========================================
-- IG ESCALA - DATABASE ARCHITECTURE (SUPABASE/POSTGRESQL)
-- ==========================================

-- 1. EXTENSIONS & TYPES
create extension if not exists "uuid-ossp";

create type user_role as enum ('admin', 'leader', 'volunteer');
create type assignment_status as enum ('pending', 'confirmed', 'declined');
create type recurrence_type as enum ('none', 'weekly', 'biweekly', 'monthly');
create type schedule_status as enum ('draft', 'published');

-- 2. CREATE TABLES

-- Profiles/Users Table (Synced with Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null unique,
  role user_role not null default 'volunteer',
  ministry_id uuid, -- For leaders/volunteers to assign them to a main ministry
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ministries Table
create table public.ministries (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  leader_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add foreign key back to profiles once ministries table exists to avoid circular references during init
alter table public.profiles
  add constraint fk_profiles_ministry
  foreign key (ministry_id)
  references public.ministries(id)
  on delete set null;

-- Schedules Table
create table public.schedules (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  ministry_id uuid references public.ministries(id) on delete cascade not null,
  event_date timestamp with time zone not null,
  is_recurring boolean default false not null,
  recurrence_pattern recurrence_type default 'none' not null,
  status schedule_status default 'draft' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Assignments Table (Scale members)
create table public.assignments (
  id uuid default uuid_generate_v4() primary key,
  schedule_id uuid references public.schedules(id) on delete cascade not null,
  volunteer_id uuid references public.profiles(id) on delete cascade not null,
  role_in_ministry text not null, -- ex: 'Bateria', 'Guitarra', 'Projeção', 'Vocal'
  status assignment_status default 'pending' not null,
  notified_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (schedule_id, volunteer_id) -- Avoid duplicating volunteer on the same schedule
);

-- Songs Table (Louvor Repertoire & Schedule Link)
create table public.songs (
  id uuid default uuid_generate_v4() primary key,
  schedule_id uuid references public.schedules(id) on delete cascade not null,
  title text not null,
  artist text not null,
  link_letras text, -- Automatically calculated (or on application layer)
  link_cifra text,  -- Automatically calculated (or on application layer)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications Trigger Log
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null, -- 'new_schedule', 'reminder_24h', 'reminder_2h'
  schedule_id uuid references public.schedules(id) on delete cascade,
  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false not null
);

-- 3. AUTOMATION & TRIGGERS

-- A. USER SYNC FROM AUTH TO PROFILES
-- When an auth.user is created, automatically insert a record into public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'volunteer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper urlencode function in Postgres
create or replace function public.urlencode(uri text)
returns text as $$
declare
  g_val text;
begin
  if uri is null then
    return null;
  end if;
  -- Basic replacement of spaces and special chars
  g_val := replace(uri, ' ', '%20');
  g_val := replace(g_val, '&', '%26');
  g_val := replace(g_val, '?', '%3F');
  g_val := replace(g_val, '=', '%3D');
  return g_val;
end;
$$ language plpgsql immutable;

-- B. AUTOMATIC REPERTÓRIO SONG LINK GENERATION
-- Automatically format search URLs upon inserting a song
create or replace function public.generate_song_links()
returns trigger as $$
begin
  new.link_letras := 'https://letras.mus.br/busca/?q=' || public.urlencode(new.title || ' ' || new.artist);
  new.link_cifra := 'https://www.cifraclub.com.br/busca/?q=' || public.urlencode(new.title || ' ' || new.artist);
  return new;
end;
$$ language plpgsql;

create trigger on_song_inserted
  before insert or update on public.songs
  for each row execute procedure public.generate_song_links();


-- 4. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.ministries enable row level security;
alter table public.schedules enable row level security;
alter table public.assignments enable row level security;
alter table public.songs enable row level security;
alter table public.notifications enable row level security;

-- A. PROFILES POLICIES
create policy "Qualquer usuário autenticado pode ler perfis"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Administradores gerenciam tudo em perfis"
  on public.profiles for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

create policy "Usuários podem atualizar seus próprios perfis"
  on public.profiles for update
  using (auth.uid() = id);

-- B. MINISTRIES POLICIES
create policy "Qualquer autenticado lê ministérios"
  on public.ministries for select
  using (auth.role() = 'authenticated');

create policy "Somente Administradores gerenciam ministérios"
  on public.ministries for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- C. SCHEDULES POLICIES
create policy "Usuários podem ler escalas publicadas"
  on public.schedules for select
  using (status = 'published' or auth.role() = 'authenticated'); -- Or restricted to assignments/ministry

create policy "Líderes gerenciam escalas do seu ministério"
  on public.schedules for all
  using (
    exists (
      select 1 from public.ministries
      where id = schedules.ministry_id and leader_id = auth.uid()
    ) or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- D. ASSIGNMENTS POLICIES
create policy "Qualquer membro vê escalações das escalas publicadas"
  on public.assignments for select
  using (
    exists (
      select 1 from public.schedules
      where id = assignments.schedule_id and status = 'published'
    ) or volunteer_id = auth.uid()
  );

create policy "Voluntários confirmam ou recusam a sua própria escalação"
  on public.assignments for update
  using (volunteer_id = auth.uid())
  with check (volunteer_id = auth.uid());

create policy "Líderes e Admins gerenciam escalações"
  on public.assignments for all
  using (
    exists (
      select 1 from public.schedules s
      join public.ministries m on s.ministry_id = m.id
      where s.id = assignments.schedule_id and m.leader_id = auth.uid()
    ) or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- E. SONGS POLICIES
create policy "Membros do Louvor e Mídia leem músicas"
  on public.songs for select
  using (auth.role() = 'authenticated');

create policy "Líderes do Louvor gerenciam músicas"
  on public.songs for all
  using (
    exists (
      select 1 from public.schedules s
      join public.ministries m on s.ministry_id = m.id
      where s.id = songs.schedule_id and m.name ilike '%louvor%' and m.leader_id = auth.uid()
    ) or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );



`;
