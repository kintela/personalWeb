insert into public.grupos (nombre)
values
  ('Derek & The Dominos'),
  ('Manel'),
  ('Neil Young & Crazy Horse'),
  ('The Silent Comedy'),
  ('Seven Hammond Soul'),
  ('The Silencers'),
  ('Mano Negra'),
  ('Milli Vanilli'),
  ('George Michael'),
  ('Tears for fears'),
  ('Itoiz'),
  ('Black Box'),
  ('Sinéad O''Connor'),
  ('Madonna')
on conflict (nombre) do nothing;
