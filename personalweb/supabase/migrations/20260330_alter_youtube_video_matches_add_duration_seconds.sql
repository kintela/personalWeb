alter table public.youtube_video_matches
  add column if not exists duration_seconds integer;

alter table public.youtube_video_matches
  drop constraint if exists youtube_video_matches_duration_seconds_non_negative;

alter table public.youtube_video_matches
  add constraint youtube_video_matches_duration_seconds_non_negative
  check (duration_seconds is null or duration_seconds >= 0);
