-- Run once in Supabase → SQL Editor. Safe to run again.

-- 1) Remember WHEN each entry was typed in (separate from the transaction date)
alter table public.expenses add column if not exists entered_at timestamptz;
alter table public.expenses alter column entered_at set default now();

-- 2) Keep every individual entry inside a monthly archive (not just category totals)
alter table public.expense_archives add column if not exists entries jsonb not null default '[]'::jsonb;

-- 3) Admin-controlled settings (monthly budget)
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
alter table public.app_settings enable row level security;

drop policy if exists "settings readable by signed-in users" on public.app_settings;
create policy "settings readable by signed-in users"
  on public.app_settings for select to authenticated using (true);

drop policy if exists "admins manage settings" on public.app_settings;
create policy "admins manage settings"
  on public.app_settings for all to authenticated
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into public.app_settings (key, value) values ('monthly_budget', '4500'::jsonb)
on conflict (key) do nothing;


-- 4) LINE report recipients (who gets daily / weekly / monthly reports)
create table if not exists public.report_recipients (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  name             text not null default '',
  line_user_id     text not null,
  frequency        text not null default 'weekly' check (frequency in ('off','daily','weekly','monthly')),
  remind_archive   boolean not null default false,
  last_sent_at     timestamptz,
  last_reminded_on date,
  created_by       uuid,
  created_at       timestamptz not null default now()
);
alter table public.report_recipients enable row level security;

drop policy if exists "recipients: own or admin" on public.report_recipients;
create policy "recipients: own or admin"
  on public.report_recipients for all to authenticated
  using      (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
