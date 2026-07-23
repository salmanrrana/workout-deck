"use client";

import { useEffect, useRef, useState, useCallback, useId } from "react";
import { Spinner } from "@/components/ui";

// YouTube IFrame API types
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface VideoPlayerHandle {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface YTPlayer extends VideoPlayerHandle {
  stopVideo: () => void;
  getPlayerState: () => number;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
}

export type PlayerState =
  | "unstarted"
  | "ended"
  | "playing"
  | "paused"
  | "buffering"
  | "cued";

interface YouTubePlayerProps {
  videoId: string;
  onReady?: () => void;
  onStateChange?: (state: PlayerState) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onError?: (errorCode: number) => void;
  onPlayerRef?: (player: VideoPlayerHandle | null) => void;
  autoplay?: boolean;
  className?: string;
}

// Track if API is loading/loaded globally
let apiLoaded = false;
let apiLoading = false;
const apiReadyCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (apiLoaded) {
      resolve();
      return;
    }

    apiReadyCallbacks.push(resolve);

    if (apiLoading) {
      return;
    }

    apiLoading = true;

    // Set up global callback
    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      apiReadyCallbacks.forEach((cb) => cb());
      apiReadyCallbacks.length = 0;
    };

    // Load the script
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
}

function playerStateToString(state: number): PlayerState {
  switch (state) {
    case -1:
      return "unstarted";
    case 0:
      return "ended";
    case 1:
      return "playing";
    case 2:
      return "paused";
    case 3:
      return "buffering";
    case 5:
      return "cued";
    default:
      return "unstarted";
  }
}

export function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
  onTimeUpdate,
  onError,
  onPlayerRef,
  autoplay = false,
  className = "",
}: YouTubePlayerProps) {
  const uniqueId = useId();
  const containerId = `yt-player-${uniqueId.replace(/:/g, "-")}`;
  const playerRef = useRef<YTPlayer | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Store callbacks in refs to avoid re-creating player
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
  }, [onReady, onStateChange, onTimeUpdate, onError, onPlayerRef]);

  // Start/stop time updates based on player state
  const startTimeUpdates = useCallback(() => {
    if (timeUpdateIntervalRef.current) return;

    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && onTimeUpdateRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        onTimeUpdateRef.current(currentTime);
      }
    }, 100); // Update every 100ms for smooth cue syncing
  }, []);

  const stopTimeUpdates = useCallback(() => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
  }, []);

  // Initialize player
  useEffect(() => {
    let mounted = true;

    async function initPlayer() {
      await loadYouTubeAPI();

      if (!mounted) return;

      // Wait for container to be in DOM
      const container = document.getElementById(containerId);
      if (!container) return;

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            if (!mounted) return;
            setIsReady(true);
            onPlayerRefRef.current?.(event.target);
            onReadyRef.current?.();
          },
          onStateChange: (event) => {
            if (!mounted) return;
            const state = playerStateToString(event.data);
            onStateChangeRef.current?.(state);

            // Manage time updates based on state
            if (state === "playing") {
              startTimeUpdates();
            } else {
              stopTimeUpdates();
            }
          },
          onError: (event) => {
            if (!mounted) return;
            onErrorRef.current?.(event.data);
          },
        },
      });
    }

    initPlayer();

    return () => {
      mounted = false;
      stopTimeUpdates();
      onPlayerRefRef.current?.(null);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, autoplay, containerId, startTimeUpdates, stopTimeUpdates]);

  return (
    <div className={`relative aspect-video ${className}`}>
      <div id={containerId} className="absolute inset-0" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-1">
          <Spinner size="lg" label="Loading video player" />
        </div>
      )}
    </div>
  );
}

// Hook to control the player from parent components
export function useYouTubePlayer() {
  const playerRef = useRef<VideoPlayerHandle | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [state, setState] = useState<PlayerState>("unstarted");
  const [isReady, setIsReady] = useState(false);

  const registerPlayer = useCallback((player: VideoPlayerHandle | null) => {
    playerRef.current = player;
    if (!player) {
      setCurrentTime(0);
      setDuration(0);
      setState("unstarted");
      setIsReady(false);
    }
  }, []);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  }, []);

  const handleReady = useCallback(() => {
    setIsReady(true);
    if (playerRef.current) {
      setDuration(playerRef.current.getDuration());
    }
  }, []);

  const handleStateChange = useCallback((newState: PlayerState) => {
    setState(newState);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  return {
    registerPlayer,
    play,
    pause,
    seekTo,
    currentTime,
    duration,
    state,
    isReady,
    handlers: {
      onReady: handleReady,
      onStateChange: handleStateChange,
      onTimeUpdate: handleTimeUpdate,
    },
  };
}
