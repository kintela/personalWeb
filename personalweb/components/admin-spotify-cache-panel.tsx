"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SpotifyCacheSummary = {
  activePlaylistCount: number;
  activePlaylistCountWithTracks: number;
  activePlaylistCountFullySynced: number;
  incompletePlaylistCount: number;
  cachedTrackCount: number;
  latestSyncAt: string | null;
} | null;

type SpotifyPlaylistCacheSyncGap = {
  playlistCacheId: number;
  spotifyId: string;
  name: string;
  expectedTrackCount: number;
  cachedTrackCount: number;
  missingTrackCount: number;
  lastSyncedAt: string | null;
};

type AdminSpotifyCachePanelProps = {
  summary: SpotifyCacheSummary;
  syncGaps: SpotifyPlaylistCacheSyncGap[];
};

type SyncStatus = "idle" | "running" | "success" | "error";

function formatSyncDate(value: string | null | undefined) {
  if (!value) {
    return "Sin sincronización";
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminSpotifyCachePanel({
  summary,
  syncGaps,
}: AdminSpotifyCachePanelProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [message, setMessage] = useState("");
  const [playlistId, setPlaylistId] = useState("");

  async function runSync(force: boolean, playlistIdOverride?: string) {
    setStatus("running");
    setMessage("");

    try {
      const targetPlaylistId = force
        ? ""
        : playlistIdOverride?.trim() || playlistId.trim();
      const response = await fetch("/api/admin/spotify-cache", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          force,
          playlistId: targetPlaylistId || undefined,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        completedCount?: number;
        failedCount?: number;
        attemptedCount?: number;
        rateLimited?: boolean;
        retryAfterMs?: number | null;
        finishedAt?: string;
        failedPlaylists?: Array<{
          name: string;
          error: string;
        }>;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        const retryLabel =
          payload.retryAfterMs && payload.retryAfterMs > 0
            ? ` Reintenta en ${Math.ceil(payload.retryAfterMs / 1000)} s.`
            : "";
        const firstFailure = payload.failedPlaylists?.[0];
        const detail = firstFailure
          ? ` ${firstFailure.name}: ${firstFailure.error}`
          : "";

        throw new Error(
          payload.error ??
            (payload.rateLimited
              ? `Spotify ha cortado por rate limit.${retryLabel}${detail}`
              : `No he podido sincronizar Spotify.${detail}`),
        );
      }

      setStatus("success");
      setMessage(
        `Sincronización terminada: ${payload.completedCount ?? 0} de ${
          payload.attemptedCount ?? 0
        } listas actualizadas. ${formatSyncDate(payload.finishedAt ?? null)}.`,
      );
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "No he podido sincronizar Spotify.",
      );
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-lg font-semibold text-white">
            Caché de Spotify
          </h2>
          <p className="text-sm leading-7 text-slate-400">
            Ejecuta la misma sincronización que el cron nocturno. La
            sincronización normal rellena listas nuevas, modificadas o sin
            canciones cacheadas.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[440px]">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Listas
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {summary?.activePlaylistCount ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Completas
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {summary?.activePlaylistCountFullySynced ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
              Canciones
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {summary?.cachedTrackCount ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">
            Playlist Spotify opcional
          </span>
          <input
            type="text"
            value={playlistId}
            onChange={(event) => setPlaylistId(event.target.value)}
            placeholder="Ejemplo: 6psPzKsbhVRZ7NGZYh1HfJ"
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runSync(false)}
            disabled={status === "running"}
            className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
          >
            Sincronizar
          </button>
          <button
            type="button"
            onClick={() => void runSync(true)}
            disabled={status === "running"}
            className="rounded-2xl border border-white/15 bg-black/20 px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-300/40 hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            Forzar todo
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
        <span>Última sync: {formatSyncDate(summary?.latestSyncAt)}</span>
        <span>Pendientes: {(summary?.incompletePlaylistCount ?? syncGaps.length).toLocaleString("es-ES")} listas</span>
        {status === "running" ? <span>Sincronizando...</span> : null}
      </div>

      {message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            status === "error"
              ? "border-rose-300/20 bg-rose-400/10 text-rose-100"
              : "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
              Listas incompletas
            </h3>
            <p className="text-sm text-slate-400">
              Comparación entre el total de Spotify y las canciones guardadas en
              caché.
            </p>
          </div>
          <p className="text-sm text-slate-400">
            Mostrando {Math.min(syncGaps.length, 30)} de {syncGaps.length}
          </p>
        </div>

        {syncGaps.length === 0 ? (
          <p className="mt-4 text-sm text-slate-300">
            Todas las playlists activas tienen sus canciones cacheadas.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.24em] text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Lista</th>
                  <th className="px-3 py-2 font-medium">Caché</th>
                  <th className="px-3 py-2 font-medium">Faltan</th>
                  <th className="px-3 py-2 font-medium">Sync</th>
                  <th className="px-3 py-2 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {syncGaps.slice(0, 30).map((playlist) => (
                  <tr
                    key={playlist.spotifyId}
                    className="rounded-2xl bg-white/[0.04] text-slate-200"
                  >
                    <td className="rounded-l-2xl px-3 py-3">
                      <div className="space-y-1">
                        <p className="font-medium text-white">
                          {playlist.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {playlist.spotifyId}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {playlist.cachedTrackCount.toLocaleString("es-ES")} /{" "}
                      {playlist.expectedTrackCount.toLocaleString("es-ES")}
                    </td>
                    <td className="px-3 py-3 text-amber-100">
                      {playlist.missingTrackCount.toLocaleString("es-ES")}
                    </td>
                    <td className="px-3 py-3 text-slate-400">
                      {formatSyncDate(playlist.lastSyncedAt)}
                    </td>
                    <td className="rounded-r-2xl px-3 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setPlaylistId(playlist.spotifyId);
                          void runSync(false, playlist.spotifyId);
                        }}
                        disabled={status === "running"}
                        className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/60 disabled:cursor-wait disabled:opacity-60"
                      >
                        Sincronizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
