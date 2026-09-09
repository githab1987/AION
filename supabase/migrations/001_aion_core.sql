create table if not exists worlds (
    id text primary key,
    name text not null default 'local',
    state jsonb not null default '{}'::jsonb
);

create table if not exists intentions (
    id text primary key,
    goal text not null,
    target text,
    constraints jsonb not null default '[]'::jsonb,
    status text not null default 'DECLARED'
);

create table if not exists capabilities (
    id text primary key,
    name text not null,
    can_do jsonb not null default '[]'::jsonb,
    effects jsonb not null default '[]'::jsonb,
    enabled boolean not null default true
);

create table if not exists actions (
    id text primary key,
    intention_id text not null references intentions(id),
    actor text not null,
    capability_id text not null references capabilities(id),
    target text,
    input jsonb not null default '{}'::jsonb,
    expected_state jsonb not null default '{}'::jsonb,
    status text not null default 'PLANNED',
    result jsonb
);

create table if not exists observations (
    id text primary key,
    action_id text not null references actions(id),
    target text,
    state jsonb not null default '{}'::jsonb,
    facts jsonb not null default '[]'::jsonb,
    source text not null default 'runtime',
    observed_at timestamptz not null default now()
);

create table if not exists evidences (
    id text primary key,
    observation_id text not null references observations(id),
    claim text not null,
    data jsonb not null default '{}'::jsonb,
    source text not null default 'runtime',
    reliability double precision
);

create table if not exists verifications (
    id bigint generated always as identity primary key,
    intention_id text not null references intentions(id),
    claim text not null,
    result text not null default 'UNKNOWN',
    reason text not null default ''
);

create index if not exists idx_actions_intention_id
    on actions(intention_id);

create index if not exists idx_observations_action_id
    on observations(action_id);

create index if not exists idx_evidences_observation_id
    on evidences(observation_id);

create index if not exists idx_verifications_intention_id
    on verifications(intention_id);
