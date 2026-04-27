alter table public.temas
add column if not exists spotify text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'temas_spotify_not_blank'
  ) then
    alter table public.temas
    add constraint temas_spotify_not_blank check (
      spotify is null or char_length(btrim(spotify)) > 0
    );
  end if;
end
$$;
