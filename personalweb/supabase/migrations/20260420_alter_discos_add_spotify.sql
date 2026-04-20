alter table public.discos
add column if not exists spotify text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'discos_spotify_not_blank'
  ) then
    alter table public.discos
    add constraint discos_spotify_not_blank check (
      spotify is null or char_length(btrim(spotify)) > 0
    );
  end if;
end
$$;
