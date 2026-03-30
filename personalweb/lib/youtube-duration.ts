export function parseYouTubeIsoDuration(
  value: string | null | undefined,
): number | null {
  const normalizedValue = value?.trim() ?? "";

  if (!normalizedValue) {
    return null;
  }

  const match = normalizedValue.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i,
  );

  if (!match) {
    return null;
  }

  const days = Number.parseInt(match[1] ?? "0", 10) || 0;
  const hours = Number.parseInt(match[2] ?? "0", 10) || 0;
  const minutes = Number.parseInt(match[3] ?? "0", 10) || 0;
  const seconds = Number.parseInt(match[4] ?? "0", 10) || 0;

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

export function normalizeYouTubeDurationSeconds(
  value: number | string | null | undefined,
) {
  const normalizedValue =
    typeof value === "number" ? value : Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(normalizedValue) || normalizedValue < 0) {
    return null;
  }

  return normalizedValue;
}

export function formatYouTubeDurationLabel(
  totalSeconds: number | null | undefined,
) {
  if (!Number.isFinite(totalSeconds) || !totalSeconds || totalSeconds < 0) {
    return null;
  }

  const normalizedTotalSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(normalizedTotalSeconds / 3600);
  const minutes = Math.floor((normalizedTotalSeconds % 3600) / 60);
  const seconds = normalizedTotalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatYouTubeDurationTotalLabel(
  totalSeconds: number | null | undefined,
) {
  if (!Number.isFinite(totalSeconds) || !totalSeconds || totalSeconds < 0) {
    return null;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${totalMinutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}
