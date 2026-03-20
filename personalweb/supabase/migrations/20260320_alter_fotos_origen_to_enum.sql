do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'foto_origen'
      and n.nspname = 'public'
  ) then
    create type public.foto_origen as enum (
      'Facebook',
      'Spotify',
      'Propia',
      'Instagram'
    );
  end if;
end
$$;

alter table public.fotos
  alter column origen drop default;

alter table public.fotos
  alter column origen type public.foto_origen
  using (
    case
      when origen is null then null
      else origen::public.foto_origen
    end
  );

alter table public.fotos
  alter column origen set default 'Facebook'::public.foto_origen;
