-- Run once in your Supabase SQL editor. No public direct table access.
create table if not exists public.spark_guestbook (
 id uuid primary key default gen_random_uuid(),
 nickname text not null check (char_length(nickname) between 1 and 24),
 message text not null check (char_length(message) between 1 and 600),
 created_at timestamptz not null default now(),
 is_public boolean not null default true,
 client_hash text not null
);
alter table public.spark_guestbook enable row level security;
revoke all on public.spark_guestbook from anon, authenticated;
grant select, insert, update, delete on public.spark_guestbook to service_role;
create index if not exists spark_guestbook_recent on public.spark_guestbook(created_at desc);
create or replace function public.spark_add_guest_message(p_nickname text,p_message text,p_client_hash text)
returns void language plpgsql security definer set search_path = public
as $$
begin
 perform pg_advisory_xact_lock(371927);
 if exists(select 1 from public.spark_guestbook where client_hash=p_client_hash and created_at>now()-interval '1 minute')
 or (select count(*) from public.spark_guestbook where created_at>now()-interval '1 day')>=500 then
  raise exception 'rate limited';
 end if;
 insert into public.spark_guestbook(nickname,message,client_hash) values(trim(p_nickname),trim(p_message),p_client_hash);
end; $$;
revoke all on function public.spark_add_guest_message(text,text,text) from public, anon, authenticated;
grant execute on function public.spark_add_guest_message(text,text,text) to service_role;
