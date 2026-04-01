alter table public.videos
  add column if not exists disponible boolean;

update public.videos
set disponible = true
where disponible is null;

alter table public.videos
  alter column disponible set default true;

alter table public.videos
  alter column disponible set not null;

create index if not exists videos_disponible_idx
  on public.videos using btree (disponible) tablespace pg_default;
