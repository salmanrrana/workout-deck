"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/ui";
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

export function AutoExtractButton({ videoId, onCuesExtracted }: AutoExtractButtonProps) {
  const [state, setState] = useState<ExtractState>({ status: "idle" });

  const handleExtract = async () => {
    setState({ status: "extracting" });
    try {
      const res = await fetch(`/api/videos/${videoId}/extract-cues`, { method: "POST" });
      if (!res.ok) {
        setState({ status: "error", message: await parseErrorMessage(res, "Failed to extract cues") });
        return;
      }
      const data = await res.json();
      if (!data.cues?.length) {
        setState({ status: "error", message: "No exercises were found in the transcript." });
        return;
      }
      setState({ status: "preview", cues: data.cues });
    } catch (error) {
      console.error("Failed to extract cues:", error);
      setState({ status: "error", message: "Connection lost. Check your network and try again." });
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
        setState({ status: "error", message: await parseErrorMessage(res, "Failed to save cues") });
        return;
      }
      const data = await res.json();
      onCuesExtracted(data.cues);
      setState({ status: "idle" });
    } catch (error) {
      console.error("Failed to save cues:", error);
      setState({ status: "error", message: "Connection lost. Check your network and try again." });
    }
  };

  if (state.status === "idle") {
    return (
      <Button onClick={handleExtract} variant="ghost" fullWidth icon={<SparklesIcon className="h-5 w-5" />}>
        Extract cues from transcript
      </Button>
    );
  }

  if (state.status === "extracting" || state.status === "saving") {
    return (
      <div role="status" className="flex min-h-20 items-center justify-center gap-3 rounded-md bg-surface-2 px-4 text-small text-muted">
        <Spinner size="sm" />
        {state.status === "extracting" ? "Analyzing transcript…" : "Saving cues…"}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-md bg-danger/10 p-4">
        <p role="alert" className="text-small text-danger">{state.message}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={handleExtract} size="sm" variant="danger">Try again</Button>
          <Button onClick={() => setState({ status: "idle" })} size="sm" variant="ghost">Dismiss</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-surface-2 p-4">
      <h3 className="font-semibold text-text">
        Found {state.cues.length} exercise{state.cues.length === 1 ? "" : "s"}
      </h3>
      <p className="mt-1 text-small text-muted">Review these cues before replacing the current timeline.</p>
      <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
        {state.cues.map((cue) => (
          <div key={`${cue.timestamp}-${cue.order}`} className="flex min-h-11 items-center gap-3 rounded-md px-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {cue.order}
            </span>
            <span className="min-w-0 flex-1 text-small text-text">{cue.exerciseName}</span>
            <span className="font-mono text-xs tabular-nums text-muted">{formatTime(cue.timestamp)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={handleSave} size="sm">Save cues</Button>
        <Button onClick={handleExtract} size="sm" variant="secondary">Extract again</Button>
        <Button onClick={() => setState({ status: "idle" })} size="sm" variant="ghost">Cancel</Button>
      </div>
    </div>
  );
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data.message || data.error || fallback;
  } catch {
    return `Server error (${res.status}). Try again later.`;
  }
}

function SparklesIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.72.54l.81 2.85a3.75 3.75 0 002.58 2.58l2.85.81a.75.75 0 010 1.44l-2.85.81a3.75 3.75 0 00-2.58 2.58l-.81 2.85a.75.75 0 01-1.44 0l-.81-2.85a3.75 3.75 0 00-2.58-2.58l-2.85-.81a.75.75 0 010-1.44l2.85-.81a3.75 3.75 0 002.58-2.58l.81-2.85A.75.75 0 019 4.5zm9-3a.75.75 0 01.73.57l.26 1.03a2.63 2.63 0 001.91 1.91l1.03.26a.75.75 0 010 1.46l-1.03.26a2.63 2.63 0 00-1.91 1.91l-.26 1.03a.75.75 0 01-1.46 0l-.26-1.03a2.63 2.63 0 00-1.91-1.91l-1.03-.26a.75.75 0 010-1.46l1.03-.26a2.63 2.63 0 001.91-1.91l.26-1.03A.75.75 0 0118 1.5z" clipRule="evenodd" /></svg>;
}
