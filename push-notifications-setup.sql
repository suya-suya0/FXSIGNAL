-- FX SIGNAL background Web Push setup
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  notify_importance_1 boolean not null default false,
  notify_importance_2 boolean not null default true,
  notify_importance_3 boolean not null default true,
  notify_rates boolean not null default true,
  notify_central_bank boolean not null default true,
  notify_speech boolean not null default false,
  notify_60 boolean not null default true,
  notify_30 boolean not null default true,
  notify_5 boolean not null default true,
  notify_0 boolean not null default false,
  user_agent text
);
create index if not exists push_subscriptions_enabled_idx on public.push_subscriptions(enabled);
create table if not exists public.push_notification_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  timing_minutes integer not null,
  unique(event_id, subscription_id, timing_minutes)
);
alter table public.push_subscriptions enable row level security;
alter table public.push_notification_log enable row level security;
drop policy if exists "public can insert push subscriptions" on public.push_subscriptions;
create policy "public can insert push subscriptions" on public.push_subscriptions for insert to anon, authenticated with check (true);
drop policy if exists "public can update push subscriptions" on public.push_subscriptions;
create policy "public can update push subscriptions" on public.push_subscriptions for update to anon, authenticated using (true) with check (true);
create or replace function public.touch_push_subscription_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists push_subscriptions_touch_updated_at on public.push_subscriptions;
create trigger push_subscriptions_touch_updated_at before update on public.push_subscriptions for each row execute function public.touch_push_subscription_updated_at();
