-- Forms data model and RPCs
-- Tables: forms, form_recipients, form_submissions

-- Enable required extensions (usually enabled in Supabase)
-- create extension if not exists pgcrypto;

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  company_id uuid not null,
  title text not null,
  description text,
  schema_json jsonb not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.form_recipients (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  email text not null,
  name text,
  token text not null unique,
  expires_at timestamptz,
  status text not null default 'sent' check (status in ('sent','opened','submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_form_recipients_form on public.form_recipients(form_id);
create index if not exists idx_form_recipients_token on public.form_recipients(token);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  recipient_id uuid not null references public.form_recipients(id) on delete cascade,
  submission_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_form_submissions_form on public.form_submissions(form_id);
create index if not exists idx_form_submissions_recipient on public.form_submissions(recipient_id);

-- RLS
alter table public.forms enable row level security;
alter table public.form_recipients enable row level security;
alter table public.form_submissions enable row level security;

-- Policies: company-scoped access for authenticated users
drop policy if exists forms_select on public.forms;
create policy forms_select on public.forms
  for select to authenticated
  using (true); -- app-side filters by company_id/event_id

drop policy if exists forms_insert on public.forms;
create policy forms_insert on public.forms
  for insert to authenticated
  with check (true);

drop policy if exists forms_update on public.forms;
create policy forms_update on public.forms
  for update to authenticated
  using (true) with check (true);

drop policy if exists fr_select on public.form_recipients;
create policy fr_select on public.form_recipients
  for select to authenticated
  using (true);

drop policy if exists fr_insert on public.form_recipients;
create policy fr_insert on public.form_recipients
  for insert to authenticated
  with check (true);

drop policy if exists fs_select on public.form_submissions;
create policy fs_select on public.form_submissions
  for select to authenticated
  using (true);

drop policy if exists fs_insert on public.form_submissions;
create policy fs_insert on public.form_submissions
  for insert to authenticated
  with check (true);

-- Anonymous access happens only through SECURITY DEFINER RPCs below

-- Helper: secure random token
create or replace function public.generate_form_token()
returns text language sql as $$
  select encode(gen_random_bytes(24), 'hex');
$$;

-- RPC: create recipients with tokens (authenticated)
drop function if exists public.create_form_recipients(uuid, text[], text[], timestamptz);
create or replace function public.create_form_recipients(
  p_form_id uuid,
  p_emails text[],
  p_names text[] default array[]::text[],
  p_expires_at timestamptz default null
) returns setof public.form_recipients
language plpgsql
security definer
as $$
declare
  i int;
  v_email text;
  v_name text;
  v_token text;
  v_rec public.form_recipients%rowtype;
begin
  if p_emails is null or array_length(p_emails,1) is null then
    raise exception 'No emails provided';
  end if;

  for i in 1..array_length(p_emails,1) loop
    v_email := trim(p_emails[i]);
    v_name := case when p_names is not null and array_length(p_names,1) >= i then p_names[i] else null end;
    v_token := public.generate_form_token();

    insert into public.form_recipients(form_id,email,name,token,expires_at,status)
    values (p_form_id, v_email, v_name, v_token, p_expires_at, 'sent')
    returning * into v_rec;

    return next v_rec;
  end loop;
  return;
end;
$$;

grant execute on function public.create_form_recipients(uuid, text[], text[], timestamptz) to authenticated;

-- RPC: get form by token (anonymous)
drop function if exists public.get_form_by_token(text);
create or replace function public.get_form_by_token(p_token text)
returns table (
  form_id uuid,
  title text,
  description text,
  schema_json jsonb,
  recipient_id uuid,
  recipient_name text
) language plpgsql security definer as $$
declare
  v_rec public.form_recipients;
  v_form public.forms;
begin
  select * into v_rec from public.form_recipients where token = p_token limit 1;
  if not found then
    raise exception 'Invalid token' using errcode = '22023';
  end if;
  if v_rec.expires_at is not null and now() > v_rec.expires_at then
    raise exception 'Token expired' using errcode = '22023';
  end if;

  select * into v_form from public.forms where id = v_rec.form_id;
  return query select v_form.id, v_form.title, v_form.description, v_form.schema_json, v_rec.id, v_rec.name;
end;
$$;

grant execute on function public.get_form_by_token(text) to anon, authenticated;

-- RPC: submit form response by token (anonymous)
drop function if exists public.submit_form_response(text, jsonb);
create or replace function public.submit_form_response(p_token text, p_submission jsonb)
returns jsonb language plpgsql security definer as $$
declare
  v_rec public.form_recipients;
  v_form_id uuid;
  v_submission_id uuid;
begin
  select * into v_rec from public.form_recipients where token = p_token limit 1;
  if not found then
    raise exception 'Invalid token' using errcode = '22023';
  end if;
  if v_rec.status = 'submitted' then
    return jsonb_build_object('success', false, 'message', 'Already submitted');
  end if;
  if v_rec.expires_at is not null and now() > v_rec.expires_at then
    return jsonb_build_object('success', false, 'message', 'Token expired');
  end if;

  v_form_id := v_rec.form_id;
  insert into public.form_submissions(form_id, recipient_id, submission_json)
  values (v_form_id, v_rec.id, coalesce(p_submission,'{}'::jsonb))
  returning id into v_submission_id;

  update public.form_recipients
  set status = 'submitted', submitted_at = now()
  where id = v_rec.id;

  return jsonb_build_object('success', true, 'submission_id', v_submission_id);
end;
$$;

grant execute on function public.submit_form_response(text, jsonb) to anon, authenticated;

