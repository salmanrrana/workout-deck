"use client";

import { useState } from "react";
import type { ExerciseCue } from "@/lib/types";
import { formatTime } from "@/lib/types";

interface ExtractedCue {
  timestamp: number;
  exerciseName: string;
  order: number;
}

interface AutoExtractButtonProps {
  videoId: string;
  onCuesExtracted: (cues: ExerciseCue[]) => void;
}

type ExtractState =
  | { status: "idle" }
  | { status: "extracting" }
  | { status: "preview"; cues: ExtractedCue[] }
  | { status: "saving" }
  | { status: "error"; message: string };

export function AutoExtractButton({
  videoId,
  onCuesExtracted,
}: AutoExtractButtonProps) {
  const [state, setState] = useState<ExtractState>({ status: "idle" });

  const handleExtract = async () => {
    setState({ status: "extracting" });
    try {
      const res = await fetch(`/api/videos/${videoId}/extract-cues`, {
        method: "POST",
      });
      if (!res.ok) {
        const message = await parseErrorMessage(
          res,
          "Failed to extract cues"
        );
        setState({ status: "error", message });
        return;
      }
      const data = await res.json();
      if (!data.cues || data.cues.length === 0) {
        setState({
          status: "error",
          message: "No exercises found in the transcript.",
        });
        return;
      }
      setState({ status: "preview", cues: data.cues });
    } catch (err) {
      console.error("Failed to extract cues:", err);
      setState({
        status: "error",
        message: "Network error. Check your connection and try again.",
      });
    }
  };

  const handleSave = async () => {
    if (state.status !== "preview") return;
    const previewedCues = state.cues;
    setState({ status: "saving" });
    try {
      const res = await fetch(`/api/videos/${videoId}/extract-cues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save: true, cues: previewedCues }),
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to save cues");
        setState({ status: "error", message });
        return;
      }
      const data = await res.json();
      // Server returns saved cues with DB-assigned IDs
      onCuesExtracted(data.cues);
      setState({ status: "idle" });
    } catch (err) {
      console.error("Failed to save cues:", err);
      setState({
        status: "error",
        message: "Network error. Check your connection and try again.",
      });
    }
  };

  const handleDismiss = () => {
    setState({ status: "idle" });
  };

  // Idle state - show extract button
  if (state.status === "idle") {
    return (
      <button
        onClick={handleExtract}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white transition-colors hover:bg-purple-700"
      >
        <SparklesIcon className="h-5 w-5" />
        Auto-Extract Cues
      </button>
    );
  }

  // Extracting state - show loading
  if (state.status === "extracting") {
    return (
      <div className="rounded-xl bg-zinc-900 p-4">
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-purple-500" />
          <p className="text-sm text-zinc-400">
            Analyzing transcript for exercises...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.status === "error") {
    return (
      <div className="rounded-xl bg-zinc-900 p-4">
        <p className="text-center text-sm text-red-400">{state.message}</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleExtract}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            Try Again
          </button>
          <button
            onClick={handleDismiss}
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-600"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Saving state
  if (state.status === "saving") {
    return (
      <div className="rounded-xl bg-zinc-900 p-4">
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
          <p className="text-sm text-zinc-400">Saving cues...</p>
        </div>
      </div>
    );
  }

  // Preview state - show extracted cues for review
  return (
    <div className="rounded-xl bg-zinc-900 p-4">
      <h3 className="mb-1 text-sm font-medium text-zinc-400">
        Found {state.cues.length} exercise{state.cues.length !== 1 ? "s" : ""}
      </h3>
      <p className="mb-3 text-xs text-zinc-500">
        Review the extracted cues below. Save to replace existing cues.
      </p>

      <div className="max-h-60 space-y-1 overflow-y-auto">
        {state.cues.map((cue) => (
          <div
            key={`${cue.timestamp}-${cue.order}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-left"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600/20 text-xs font-medium text-purple-400">
              {cue.order}
            </span>
            <span className="text-sm text-zinc-300">{cue.exerciseName}</span>
            <span className="ml-auto font-mono text-xs text-zinc-500">
              {formatTime(cue.timestamp)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSave}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700"
        >
          Save Cues
        </button>
        <button
          onClick={handleExtract}
          className="flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-600"
        >
          Re-extract
        </button>
        <button
          onClick={handleDismiss}
          className="flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

async function parseErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await res.json();
    return data.message || data.error || fallback;
  } catch {
    return `Server error (${res.status}). Please try again later.`;
  }
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z"
        clipRule="evenodd"
      />
    </svg>
  );
}
