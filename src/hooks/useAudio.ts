"use client";

import { useState, useCallback } from "react";
import {
  enableAudio,
  isAudioEnabled,
  setVolume,
  getVolume,
  playSound,
  playIntervalStart,
  playIntervalEnd,
  playWarning,
  playWorkoutComplete,
  type SoundType,
} from "@/lib/audio";

export function useAudio() {
  // Use lazy initializer to check audio state on first render
  const [isEnabled, setIsEnabled] = useState(() => isAudioEnabled());
  const [volume, setVolumeState] = useState(() => getVolume());

  // Enable audio (must be called from user interaction)
  const enable = useCallback(async () => {
    const success = await enableAudio();
    setIsEnabled(success);
    return success;
  }, []);

  // Update volume
  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    setVolumeState(newVolume);
  }, []);

  // Play a sound by type
  const play = useCallback((type: SoundType) => {
    playSound(type);
  }, []);

  return {
    isEnabled,
    volume,
    enable,
    setVolume: updateVolume,
    play,
    playIntervalStart,
    playIntervalEnd,
    playWarning,
    playWorkoutComplete,
  };
}
