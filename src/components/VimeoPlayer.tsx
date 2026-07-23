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
  | "timeupdate";

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
  onPlayerRef?: (player: VideoPlayerHandle) => void;
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let apiPlayer: VimeoApiPlayer | null = null;
    let currentTime = 0;
    let duration = 0;

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
          if (!mounted || !apiPlayer) return;
          duration = await apiPlayer.getDuration();
          currentTime = await apiPlayer.getCurrentTime();
          onPlayerRef?.(handle);
          setIsReady(true);
          onReady?.();
        });
        apiPlayer.on("play", () => onStateChange?.("playing"));
        apiPlayer.on("pause", () => onStateChange?.("paused"));
        apiPlayer.on("ended", () => onStateChange?.("ended"));
        apiPlayer.on("bufferstart", () => onStateChange?.("buffering"));
        apiPlayer.on("bufferend", () => onStateChange?.("playing"));
        apiPlayer.on("timeupdate", (data) => {
          currentTime = data?.seconds ?? currentTime;
          duration = data?.duration ?? duration;
          onTimeUpdate?.(currentTime);
        });
      } catch (error) {
        console.error("Failed to initialize Vimeo player:", error);
        if (mounted) onError?.();
      }
    }

    void initialize();

    return () => {
      mounted = false;
      if (apiPlayer) void apiPlayer.destroy();
    };
  }, [onError, onPlayerRef, onReady, onStateChange, onTimeUpdate, videoId]);

  return (
    <div className={`relative aspect-video ${className}`}>
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${encodeURIComponent(videoId)}?dnt=1&playsinline=1&autoplay=${autoplay ? 1 : 0}`}
        title="Vimeo video player"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
      {!isReady && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-1">
          <Spinner size="lg" label="Loading video player" />
        </div>
      )}
    </div>
  );
}
