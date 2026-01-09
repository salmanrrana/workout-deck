/**
 * Audio service for timer beeps using Web Audio API.
 * Handles iOS Safari audio context restrictions by requiring user interaction to enable.
 */

export type SoundType = "intervalStart" | "intervalEnd" | "workoutComplete" | "warning";

interface AudioServiceState {
  context: AudioContext | null;
  isEnabled: boolean;
  volume: number;
}

const state: AudioServiceState = {
  context: null,
  isEnabled: false,
  volume: 0.5,
};

/**
 * Initialize or resume the audio context.
 * Must be called from a user interaction (click/touch) on iOS Safari.
 */
export async function enableAudio(): Promise<boolean> {
  try {
    if (!state.context) {
      state.context = new AudioContext();
    }

    // iOS Safari requires resuming the context after user interaction
    if (state.context.state === "suspended") {
      await state.context.resume();
    }

    state.isEnabled = state.context.state === "running";
    return state.isEnabled;
  } catch (error) {
    console.error("Failed to enable audio:", error);
    return false;
  }
}

/**
 * Check if audio is currently enabled and ready.
 */
export function isAudioEnabled(): boolean {
  return state.isEnabled && state.context?.state === "running";
}

/**
 * Set the volume for all sounds (0.0 to 1.0).
 */
export function setVolume(volume: number): void {
  state.volume = Math.max(0, Math.min(1, volume));
}

/**
 * Get the current volume level.
 */
export function getVolume(): number {
  return state.volume;
}

/**
 * Play a beep sound with specified frequency and duration.
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  fadeOut: boolean = true
): void {
  if (!state.context || !state.isEnabled) return;

  const oscillator = state.context.createOscillator();
  const gainNode = state.context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(state.context.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, state.context.currentTime);

  // Set initial volume
  gainNode.gain.setValueAtTime(state.volume, state.context.currentTime);

  // Fade out to avoid click at the end
  if (fadeOut) {
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      state.context.currentTime + duration
    );
  }

  oscillator.start(state.context.currentTime);
  oscillator.stop(state.context.currentTime + duration);
}

/**
 * Play a multi-tone sequence for more complex sounds.
 */
function playToneSequence(
  tones: Array<{ frequency: number; duration: number; delay: number }>,
  type: OscillatorType = "sine"
): void {
  if (!state.context || !state.isEnabled) return;

  tones.forEach(({ frequency, duration, delay }) => {
    setTimeout(() => {
      playTone(frequency, duration, type);
    }, delay * 1000);
  });
}

/**
 * Play a sound based on the type of timer event.
 */
export function playSound(type: SoundType): void {
  if (!state.context || !state.isEnabled) {
    console.warn("Audio not enabled. Call enableAudio() first.");
    return;
  }

  switch (type) {
    case "intervalStart":
      // Single high-pitched beep - signals start of work/activity
      playTone(880, 0.15, "sine"); // A5
      break;

    case "intervalEnd":
      // Double beep - signals end of interval
      playTone(660, 0.1, "sine"); // E5
      setTimeout(() => playTone(660, 0.1, "sine"), 150);
      break;

    case "warning":
      // Quick triple beep - warning sound (e.g., 3 seconds left)
      playTone(440, 0.08, "square"); // A4
      setTimeout(() => playTone(440, 0.08, "square"), 120);
      setTimeout(() => playTone(440, 0.08, "square"), 240);
      break;

    case "workoutComplete":
      // Ascending celebration tones
      playToneSequence([
        { frequency: 523, duration: 0.15, delay: 0 },     // C5
        { frequency: 659, duration: 0.15, delay: 0.15 },  // E5
        { frequency: 784, duration: 0.15, delay: 0.3 },   // G5
        { frequency: 1047, duration: 0.3, delay: 0.45 },  // C6
      ]);
      break;
  }
}

/**
 * Play the interval start sound.
 */
export function playIntervalStart(): void {
  playSound("intervalStart");
}

/**
 * Play the interval end sound.
 */
export function playIntervalEnd(): void {
  playSound("intervalEnd");
}

/**
 * Play the warning sound.
 */
export function playWarning(): void {
  playSound("warning");
}

/**
 * Play the workout complete sound.
 */
export function playWorkoutComplete(): void {
  playSound("workoutComplete");
}

/**
 * Test all sounds in sequence (for debugging/settings).
 */
export async function testAllSounds(): Promise<void> {
  if (!state.isEnabled) {
    await enableAudio();
  }

  playIntervalStart();
  setTimeout(() => playIntervalEnd(), 500);
  setTimeout(() => playWarning(), 1200);
  setTimeout(() => playWorkoutComplete(), 2000);
}
