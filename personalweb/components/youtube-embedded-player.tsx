"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

type YouTubeEmbeddedPlayerProps = {
  videoId: string;
  title: string;
  autoplay?: boolean;
  className?: string;
  onEnded?: () => void;
};

type YouTubePlayerStateEvent = {
  data: number;
  target: YouTubePlayerInstance;
};

type YouTubePlayerReadyEvent = {
  target: YouTubePlayerInstance;
};

type YouTubePlayerInstance = {
  destroy: () => void;
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
};

type YouTubeNamespace = {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady?: (event: YouTubePlayerReadyEvent) => void;
        onStateChange?: (event: YouTubePlayerStateEvent) => void;
      };
    },
  ) => YouTubePlayerInstance;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}

let youTubeIframeApiPromise: Promise<YouTubeNamespace> | null = null;

function ensurePlayerHasSound(player: YouTubePlayerInstance) {
  player.unMute();
  player.setVolume(100);
}

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube solo se puede cargar en cliente."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (!youTubeIframeApiPromise) {
    youTubeIframeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();

        if (window.YT?.Player) {
          resolve(window.YT);
          return;
        }

        reject(new Error("YouTube no ha inicializado correctamente el reproductor."));
      };

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      );

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => {
          reject(new Error("No he podido cargar la API de YouTube."));
        };
        document.head.appendChild(script);
      }
    });
  }

  return youTubeIframeApiPromise;
}

export function YouTubeEmbeddedPlayer({
  videoId,
  title,
  autoplay = true,
  className,
  onEnded,
}: YouTubeEmbeddedPlayerProps) {
  const playerContainerId = useId().replace(/:/g, "-");
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const activeVideoIdRef = useRef("");
  const initialVideoIdRef = useRef(videoId);
  const initialAutoplayRef = useRef(autoplay);
  const playerContainerIdRef = useRef(playerContainerId);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const handleEnded = useEffectEvent(() => {
    onEnded?.();
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const YT = await loadYouTubeIframeApi();

        if (cancelled || playerRef.current) {
          return;
        }

        playerRef.current = new YT.Player(playerContainerIdRef.current, {
          videoId: initialVideoIdRef.current,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: initialAutoplayRef.current ? 1 : 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                return;
              }

              activeVideoIdRef.current = initialVideoIdRef.current;
              setIsPlayerReady(true);
              setApiError(null);
              ensurePlayerHasSound(event.target);

              if (initialAutoplayRef.current) {
                event.target.playVideo();
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                ensurePlayerHasSound(event.target);
              }

              if (event.data === YT.PlayerState.ENDED) {
                handleEnded();
              }
            },
          },
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setApiError(
          error instanceof Error
            ? error.message
            : "No he podido iniciar el reproductor de YouTube.",
        );
      }
    })();

    return () => {
      cancelled = true;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      activeVideoIdRef.current = "";
      setIsPlayerReady(false);
    };
  }, []);

  useEffect(() => {
    if (!isPlayerReady || !playerRef.current || !videoId) {
      return;
    }

    if (activeVideoIdRef.current === videoId) {
      return;
    }

    playerRef.current.loadVideoById(videoId);
    ensurePlayerHasSound(playerRef.current);
    activeVideoIdRef.current = videoId;
  }, [isPlayerReady, videoId]);

  if (apiError) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-7 text-rose-100">
        {apiError}
      </div>
    );
  }

  return (
    <div className={className}>
      <div id={playerContainerId} aria-label={title} className="h-full w-full" />
    </div>
  );
}
