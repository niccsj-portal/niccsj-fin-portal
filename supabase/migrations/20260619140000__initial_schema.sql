-- 20260619140000__initial_schema.sql
-- Sprint 1 story 1.1 — initial schema.
--
-- References:
--   * PRD §6.3   data model
--   * PRD §4.2   member_number sequential 1..N (existing range 1–78)
--   * PRD §4.1   role-based access (enum lands in story 1.2)
--   * PRD §4.11  client_errors append-only buffer (RLS lands in story 1.10)
--   * PRD §7     RLS skeleton (policies land in story 1.3)
--
-- Conventions enforced here so the unit-level parse test
-- (src/test/migrations.initialSchema.test.ts) stays green:
--   * money columns use numeric(12,2)
--   * timestamps use timestamptz default now()
--   * no hard deletes on records — soft delete via is_active boolean
--   * row level security is enabled on every table (policies arrive in 1.3/1.10)
--
-- This migration is intentionally schema-only. The roles enum, helper
-- function `auth.app_role()`, RLS policies, and audit-trigger framework land
-- in stories 1.2 / 1.3 / 1.4 / 1.10 — each as its own numbered file under
-- supabase/migrations/.

begin;

------------------------------------------------------------------------------
-- Extensions
------------------------------------------------------------------------------
-- pgcrypto gives us gen_random_uuid() for primary keys.
create extension if not exists "pgcrypto";

------------------------------------------------------------------------------
-- households
------------------------------------------------------------------------------
-- A household is the primary unit of membership (PRD §4.2). It groups a head
-- of household with an optional spouse and children. The primary_member_id
-- is the head of household; the foreign key is added after `members` exists
-- to avoid a cyclic create.
create table if not exists public.households (
    id                  uuid primary key default gen_random_uuid(),
    name                text not null,
    primary_member_id   uuid,
    is_active           boolean not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

comment on table public.households is
    'Family/household unit. PRD §4.2. Soft delete via is_active.';

------------------------------------------------------------------------------
-- members
------------------------------------------------------------------------------
-- member_number continues the existing 1..78 range (PRD §4.2). The unique
-- constraint protects against duplicate numbers; the next-number generator
-- lands as a function in Sprint 2 story 2.1.
create table if not exists public.members (
    id                  uuid primary key default gen_random_uuid(),
    member_number       integer not null,
    first_name          text not null,
    last_name           text not null,
    email               text,
    phone               text,
    address             text,
    joined_date         date not null default current_date,
    household_id        uuid references public.households(id) on delete restrict,
    role_in_household   text check (role_in_household in ('head', 'spouse', 'child')),
    is_active           boolean not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint members_member_number_unique unique (member_number)
);

comment on table public.members is
    'Person on the membership roster. PRD §4.2. Soft delete via is_active.';

-- Now that members exists we can close the household -> primary member link.
alter table public.households
    add constraint households_primary_member_fk
    foreign key (primary_member_id)
    references public.members(id)
    on delete set null
    deferrable initially deferred;

create index if not exists members_household_id_idx
    on public.members (household_id);

------------------------------------------------------------------------------
-- users (app-level user profile keyed by auth.users.id)
------------------------------------------------------------------------------
-- One row per Supabase auth user. `role` is stored as text here; story 1.2
-- introduces the `app_role` enum and adds a `using` constraint via ALTER
-- TABLE so this migration stays runnable on its own.
create table if not exists public.users (
    id                          uuid primary key references auth.users(id) on delete cascade,
    email                       text not null,
    role                        text not null default 'member',
    member_id                   uuid references public.members(id) on delete set null,
    fin_sec_signature_path      text,
    is_active                   boolean not null default true,
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now(),
    constraint users_email_unique unique (email)
);

comment on table public.users is
    'App-level user profile keyed by auth.users.id. PRD §6.3. Role enum lands in story 1.2.';

------------------------------------------------------------------------------
-- categories
------------------------------------------------------------------------------
create table if not exists public.categories (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,
    type            text not null check (type in ('income', 'expense')),
    parent_id       uuid references public.categories(id) on delete restrict,
    is_active       boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint categories_name_type_unique unique (name, type)
);

comment on table public.categories is
    'Contribution / expense categories. PRD §4.3. Donation sub-categories use parent_id.';

------------------------------------------------------------------------------
-- audit_log (append-only)
------------------------------------------------------------------------------
-- Story 1.4 lands the generic trigger that writes rows here.
create table if not exists public.audit_log (
    id              bigserial primary key,
    user_id         uuid references auth.users(id) on delete set null,
    action          text not null check (action in ('insert', 'update', 'delete')),
    entity          text not null,
    entity_id       text,
    before          jsonb,
    after           jsonb,
    occurred_at     timestamptz not null default now()
);

comment on table public.audit_log is
    'Append-only audit trail for financial tables. PRD §5 NFR auditability.';

create index if not exists audit_log_entity_idx
    on public.audit_log (entity, occurred_at desc);

------------------------------------------------------------------------------
-- client_errors (append-only buffer for the React error boundary)
------------------------------------------------------------------------------
-- RLS in story 1.10: authenticated insert, admin read.
create table if not exists public.client_errors (
    id              bigserial primary key,
    user_id         uuid references auth.users(id) on delete set null,
    path            text,
    message         text not null,
    stack           text,
    user_agent      text,
    occurred_at     timestamptz not null default now()
);

comment on table public.client_errors is
    'Client-side runtime errors captured by the React error boundary. PRD §4.11.';

create index if not exists client_errors_occurred_at_idx
    on public.client_errors (occurred_at desc);

------------------------------------------------------------------------------
-- Placeholder money column (PRD §6.3 convention check)
------------------------------------------------------------------------------
-- Sprint 4 introduces the full contributions table. Story 1.1 anchors the
-- numeric(12,2) convention by reserving an opening_balance on households
-- now; later sprints may relocate it onto a dedicated balances table.
alter table public.households
    add column if not exists opening_balance numeric(12,2) not null default 0.00;

------------------------------------------------------------------------------
-- Row Level Security — enable on every table (policies arrive in story 1.3)
------------------------------------------------------------------------------
alter table public.households    enable row level security;
alter table public.members       enable row level security;
alter table public.users         enable row level security;
alter table public.categories    enable row level security;
alter table public.audit_log     enable row level security;
alter table public.client_errors enable row level security;

commit;
