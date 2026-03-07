-- Create api_keys table for burnrate-init CLI authentication
create table if not exists public.api_keys (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  key         text unique not null,
  is_active   boolean default true not null,
  created_at  timestamptz default now() not null,
  last_used   timestamptz,
  revoked_at  timestamptz
);

-- Index for fast key lookups
create index if not exists api_keys_key_idx on public.api_keys(key);
create index if not exists api_keys_user_idx on public.api_keys(user_id);

-- RLS: users can only see their own keys
alter table public.api_keys enable row level security;

create policy "Users can view own keys"
  on public.api_keys for select
  using (auth.uid() = user_id);

create policy "Users can insert own keys"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

create policy "Users can update own keys"
  on public.api_keys for update
  using (auth.uid() = user_id);
