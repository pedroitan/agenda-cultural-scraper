create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  title text not null,
  start_datetime timestamptz not null,
  city text not null,
  venue_name text,
  image_url text,
  is_free boolean not null default false,
  min_price integer,
  price_text text,
  url text not null,
  raw_payload jsonb,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_source_external_unique unique (source, external_id)
);

create index if not exists idx_events_start_datetime on public.events (start_datetime);

create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  city text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'running',
  items_fetched integer not null default 0,
  items_valid integer not null default 0,
  items_upserted integer not null default 0,
  items_invalid integer not null default 0,
  error_message text,
  constraint scrape_runs_status_check check (status in ('running', 'success', 'failed'))
);

create index if not exists idx_scrape_runs_started_at on public.scrape_runs (started_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_events_set_updated_at on public.events;
create trigger trg_events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();
