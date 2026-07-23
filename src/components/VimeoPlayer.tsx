"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerState, VideoPlayerHandle } from "@/components/YouTubePlayer";
import { Spinner } from "@/components/ui";

type VimeoEvent =
  | "loaded"
  | "play"
  | "pause"
  | "ended"
  | "bufferstart"
  | "bufferend"
  | "timeupdate"
  | "error";

interface VimeoApiPlayer {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  setCurrentTime: (seconds: number) => Promise<number>;
  getCurrentTime: () => Promise<number>;
  getDuration: () => Promise<number>;
  on: (event: VimeoEvent, callback: (data?: { seconds?: number; duration?: number }) => void) => void;
  destroy: () => Promise<void>;
}

declare global {
  interface Window {
    Vimeo?: {
      Player: new (element: HTMLIFrameElement) => VimeoApiPlayer;
    };
  }
}

let vimeoApiPromise: Promise<void> | null = null;

function loadVimeoApi(): Promise<void> {
  if (window.Vimeo) return Promise.resolve();
  if (vimeoApiPromise) return vimeoApiPromise;

  vimeoApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://player.vimeo.com/api/player.js"]',
    );
    const script = existing ?? document.createElement("script");

    const handleLoad = () => resolve();
    const handleError = () => reject(new Error("Failed to load the Vimeo player API"));
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existing) {
      script.src = "https://player.vimeo.com/api/player.js";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return vimeoApiPromise;
}

interface VimeoPlayerProps {
  videoId: string;
  onReady?: () => void;
  onStateChange?: (state: PlayerState) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onError?: () => void;
  onPlayerRef?: (player: VideoPlayerHandle | null) => void;
  autoplay?: boolean;
  className?: string;
}

export function VimeoPlayer({
  videoId,
  onReady,
  onStateChange,
  onTimeUpdate,
  onError,
  onPlayerRef,
  autoplay = false,
  className = "",
}: VimeoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [readyVideoId, setReadyVideoId] = useState<string | null>(null);
  const [failedVideoId, setFailedVideoId] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);
  const onStateChangeRef = useRef(onStateChange);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onErrorRef = useRef(onError);
  const onPlayerRefRef = useRef(onPlayerRef);

  useEffect(() => {
    onReadyRef.current = onReady;
    onStateChangeRef.current = onStateChange;
    onTimeUpdateRef.current = onTimeUpdate;
    onErrorRef.current = onError;
    onPlayerRefRef.current = onPlayerRef;
  }, [onError, onPlayerRef, onReady, onStateChange, onTimeUpdate]);

  useEffect(() => {
    let mounted = true;
    let apiPlayer: VimeoApiPlayer | null = null;
    let currentTime = 0;
    let duration = 0;

    const reportError = (error: unknown) => {
      if (!mounted) return;
      console.error("Vimeo player error:", error);
      setReadyVideoId(null);
      setFailedVideoId(videoId);
      onPlayerRefRef.current?.(null);
      onErrorRef.current?.();
    };

    async function initialize() {
      try {
        await loadVimeoApi();
        if (!mounted || !iframeRef.current || !window.Vimeo) return;

        apiPlayer = new window.Vimeo.Player(iframeRef.current);
        const handle: VideoPlayerHandle = {
          playVideo: () => {
            void apiPlayer?.play();
          },
          pauseVideo: () => {
            void apiPlayer?.pause();
          },
          seekTo: (seconds) => {
            void apiPlayer?.setCurrentTime(seconds);
          },
          getCurrentTime: () => currentTime,
          getDuration: () => duration,
        };

        apiPlayer.on("loaded", async () => {
          const loadedPlayer = apiPlayer;
          if (!mounted || !loadedPlayer) return;

          try {
            [duration, currentTime] = await Promise.all([
              loadedPlayer.getDuration(),
              loadedPlayer.getCurrentTime(),
            ]);
            if (!mounted || apiPlayer !== loadedPlayer) return;
            onPlayerRefRef.current?.(handle);
            setFailedVideoId(null);
            setReadyVideoId(videoId);
            onReadyRef.current?.();
          } catch (error) {
            reportError(error);
          }
        });
        apiPlayer.on("play", () => {
          if (mounted) onStateChangeRef.current?.("playing");
        });
        apiPlayer.on("pause", () => {
          if (mounted) onStateChangeRef.current?.("paused");
        });
        apiPlayer.on("ended", () => {
          if (mounted) onStateChangeRef.current?.("ended");
        });
        apiPlayer.on("bufferstart", () => {
          if (mounted) onStateChangeRef.current?.("buffering");
        });
        apiPlayer.on("bufferend", () => {
          if (mounted) onStateChangeRef.current?.("playing");
        });
        apiPlayer.on("timeupdate", (data) => {
          if (!mounted) return;
          currentTime = data?.seconds ?? currentTime;
          duration = data?.duration ?? duration;
          onTimeUpdateRef.current?.(currentTime);
        });
        apiPlayer.on("error", reportError);
      } catch (error) {
        reportError(error);
      }
    }

    void initialize();

    return () => {
      mounted = false;
      onPlayerRefRef.current?.(null);
      if (apiPlayer) void apiPlayer.destroy();
    };
  }, [videoId]);

  return (
    <div className={`relative aspect-video ${className}`}>
      <iframe
        key={videoId}
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${encodeURIComponent(videoId)}?dnt=1&playsinline=1&autoplay=${autoplay ? 1 : 0}`}
        title="Vimeo video player"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
      {readyVideoId !== videoId && failedVideoId !== videoId && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-1">
          <Spinner size="lg" label="Loading video player" />
        </div>
      )}
    </div>
  );
}
