do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'video_subcategoria'
      and n.nspname = 'public'
  ) then
    create type public.video_subcategoria as enum (
      'película',
      'documental',
      'podcast'
    );
  end if;
end
$$;

alter table public.videos
  add column if not exists subcategoria public.video_subcategoria;

create index if not exists videos_subcategoria_idx
on public.videos (subcategoria);
