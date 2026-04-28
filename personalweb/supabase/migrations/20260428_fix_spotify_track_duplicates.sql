drop index if exists public.spotify_playlist_tracks_cache_playlist_track_idx;

create index if not exists spotify_playlist_tracks_cache_playlist_track_idx
on public.spotify_playlist_tracks_cache (playlist_cache_id, spotify_track_id)
where spotify_track_id is not null;

create or replace function public.sync_spotify_playlist_tracks_cache(
  target_playlist_cache_id bigint,
  target_tracks jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_tracks jsonb := coalesce(target_tracks, '[]'::jsonb);
  max_incoming_position integer := 0;
begin
  if target_playlist_cache_id is null or target_playlist_cache_id <= 0 then
    raise exception 'Falta el identificador interno de la playlist cacheada.';
  end if;

  if jsonb_typeof(normalized_tracks) <> 'array' then
    raise exception 'La lista de canciones de Spotify debe llegar en un array JSON.';
  end if;

  create temporary table temp_spotify_playlist_incoming_tracks (
    spotify_track_id text,
    position integer not null,
    name text not null,
    artists_label text not null,
    album_name text,
    album_release_date text,
    duration_ms bigint,
    is_local boolean not null,
    normalized_track_name text not null,
    canonical_track_name text not null
  ) on commit drop;

  insert into temp_spotify_playlist_incoming_tracks (
    spotify_track_id,
    position,
    name,
    artists_label,
    album_name,
    album_release_date,
    duration_ms,
    is_local,
    normalized_track_name,
    canonical_track_name
  )
  select
    nullif(btrim(track.spotify_track_id), ''),
    track.position,
    btrim(track.name),
    btrim(track.artists_label),
    nullif(btrim(track.album_name), ''),
    nullif(btrim(track.album_release_date), ''),
    track.duration_ms,
    coalesce(track.is_local, false),
    btrim(track.normalized_track_name),
    btrim(track.canonical_track_name)
  from jsonb_to_recordset(normalized_tracks) as track(
    spotify_track_id text,
    position integer,
    name text,
    artists_label text,
    album_name text,
    album_release_date text,
    duration_ms bigint,
    is_local boolean,
    normalized_track_name text,
    canonical_track_name text
  );

  if exists (
    select 1
    from temp_spotify_playlist_incoming_tracks
    where
      position is null
      or position <= 0
      or char_length(name) = 0
      or char_length(artists_label) = 0
      or char_length(normalized_track_name) = 0
      or char_length(canonical_track_name) = 0
      or duration_ms < 0
  ) then
    raise exception 'La sincronización ha recibido canciones de Spotify inválidas.';
  end if;

  if exists (
    select 1
    from temp_spotify_playlist_incoming_tracks
    group by position
    having count(*) > 1
  ) then
    raise exception 'La sincronización ha recibido posiciones duplicadas para la misma playlist.';
  end if;

  create temporary table temp_spotify_playlist_track_matches (
    existing_track_id bigint primary key,
    incoming_position integer not null unique
  ) on commit drop;

  insert into temp_spotify_playlist_track_matches (
    existing_track_id,
    incoming_position
  )
  select
    existing_track.id,
    incoming_track.position
  from temp_spotify_playlist_incoming_tracks incoming_track
  join public.spotify_playlist_tracks_cache existing_track
    on existing_track.playlist_cache_id = target_playlist_cache_id
   and existing_track.position = incoming_track.position
  where not exists (
    select 1
    from temp_spotify_playlist_track_matches matched_track
    where matched_track.incoming_position = incoming_track.position
  )
  and not exists (
    select 1
    from temp_spotify_playlist_track_matches matched_track
    where matched_track.existing_track_id = existing_track.id
  );

  select coalesce(max(position), 0)
  into max_incoming_position
  from temp_spotify_playlist_incoming_tracks;

  with temporary_positions as (
    select
      matched_track.existing_track_id,
      max_incoming_position
      + row_number() over (order by matched_track.existing_track_id) as temp_position
    from temp_spotify_playlist_track_matches matched_track
  )
  update public.spotify_playlist_tracks_cache existing_track
  set position = temporary_positions.temp_position
  from temporary_positions
  where existing_track.id = temporary_positions.existing_track_id;

  delete from public.spotify_playlist_tracks_cache existing_track
  where existing_track.playlist_cache_id = target_playlist_cache_id
    and not exists (
      select 1
      from temp_spotify_playlist_track_matches matched_track
      where matched_track.existing_track_id = existing_track.id
    );

  update public.spotify_playlist_tracks_cache existing_track
  set
    spotify_track_id = incoming_track.spotify_track_id,
    position = incoming_track.position,
    name = incoming_track.name,
    artists_label = incoming_track.artists_label,
    album_name = incoming_track.album_name,
    album_release_date = incoming_track.album_release_date,
    duration_ms = incoming_track.duration_ms,
    is_local = incoming_track.is_local,
    normalized_track_name = incoming_track.normalized_track_name,
    canonical_track_name = incoming_track.canonical_track_name,
    last_synced_at = timezone('utc', now())
  from temp_spotify_playlist_track_matches matched_track
  join temp_spotify_playlist_incoming_tracks incoming_track
    on incoming_track.position = matched_track.incoming_position
  where existing_track.id = matched_track.existing_track_id;

  insert into public.spotify_playlist_tracks_cache (
    playlist_cache_id,
    spotify_track_id,
    position,
    name,
    artists_label,
    album_name,
    album_release_date,
    duration_ms,
    is_local,
    normalized_track_name,
    canonical_track_name,
    last_synced_at
  )
  select
    target_playlist_cache_id,
    incoming_track.spotify_track_id,
    incoming_track.position,
    incoming_track.name,
    incoming_track.artists_label,
    incoming_track.album_name,
    incoming_track.album_release_date,
    incoming_track.duration_ms,
    incoming_track.is_local,
    incoming_track.normalized_track_name,
    incoming_track.canonical_track_name,
    timezone('utc', now())
  from temp_spotify_playlist_incoming_tracks incoming_track
  where not exists (
    select 1
    from temp_spotify_playlist_track_matches matched_track
    where matched_track.incoming_position = incoming_track.position
  );

  update public.spotify_playlists_cache
  set
    last_synced_at = timezone('utc', now()),
    is_active = true
  where id = target_playlist_cache_id;
end;
$$;

revoke all on function public.sync_spotify_playlist_tracks_cache(bigint, jsonb)
from public, anon, authenticated;

grant execute on function public.sync_spotify_playlist_tracks_cache(bigint, jsonb)
to service_role;
