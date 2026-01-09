"use client";

import { useAudio } from "@/hooks/useAudio";

interface AudioEnablerProps {
  onEnabled?: () => void;
}

/**
 * Component that shows an enable audio button when audio is not enabled.
 * Required for iOS Safari which needs user interaction to start AudioContext.
 */
export function AudioEnabler({ onEnabled }: AudioEnablerProps) {
  const { isEnabled, enable, playIntervalStart } = useAudio();

  const handleEnable = async () => {
    const success = await enable();
    if (success) {
      // Play a test sound to confirm audio is working
      playIntervalStart();
      onEnabled?.();
    }
  };

  if (isEnabled) {
    return null;
  }

  return (
    <button
      onClick={handleEnable}
      className="flex min-h-[44px] items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
    >
      <SpeakerIcon />
      <span>Tap to Enable Audio</span>
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
      <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
  );
}
