alter table public.discos
add column if not exists estudio text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'discos_estudio_not_blank'
  ) then
    alter table public.discos
    add constraint discos_estudio_not_blank check (
      estudio is null or char_length(btrim(estudio)) > 0
    );
  end if;
end
$$;
