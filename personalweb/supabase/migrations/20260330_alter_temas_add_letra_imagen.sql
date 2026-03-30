alter table public.temas
  add column if not exists letra_imagen text;

alter table public.temas
  drop constraint if exists temas_letra_imagen_not_blank;

alter table public.temas
  add constraint temas_letra_imagen_not_blank
  check (letra_imagen is null or char_length(btrim(letra_imagen)) > 0);
