"use client";

import { useState, useCallback } from "react";
import type { ExerciseCue } from "@/lib/types";
import { formatTime } from "@/lib/types";

interface CueEditorProps {
  videoId: string;
  cues: ExerciseCue[];
  currentTime: number;
  onCuesChange: (cues: ExerciseCue[]) => void;
}

export function CueEditor({
  videoId,
  cues,
  currentTime,
  onCuesChange,
}: CueEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTimestamp, setEditTimestamp] = useState("");

  const clearError = () => setError(null);

  // Add a new cue
  const handleAddCue = useCallback(
    async (ts: number) => {
      if (!exerciseName.trim()) {
        setError("Exercise name is required");
        return;
      }
      clearError();
      setSaving(true);
      try {
        const res = await fetch(`/api/videos/${videoId}/cues`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: ts,
            exerciseName: exerciseName.trim(),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to add cue");
          return;
        }
        const newCue = await res.json();
        const updated = [...cues, newCue].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        onCuesChange(updated);
        setExerciseName("");
        setTimestamp("");
      } catch (err) {
        console.error("Cue operation failed:", err);
        setError("Network error. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [exerciseName, videoId, cues, onCuesChange]
  );

  // Quick-add at current playback time
  const handleQuickAdd = useCallback(() => {
    handleAddCue(Math.floor(currentTime));
  }, [handleAddCue, currentTime]);

  // Add at manual timestamp
  const handleManualAdd = useCallback(() => {
    const ts = parseTimestamp(timestamp);
    if (ts === null) {
      setError("Invalid timestamp. Use seconds (e.g. 90) or m:ss (e.g. 1:30)");
      return;
    }
    handleAddCue(ts);
  }, [handleAddCue, timestamp]);

  // Delete a cue
  const handleDelete = useCallback(
    async (cueId: string) => {
      clearError();
      setSaving(true);
      try {
        const res = await fetch(
          `/api/videos/${videoId}/cues?cueId=${cueId}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          setError("Failed to delete cue");
          return;
        }
        onCuesChange(cues.filter((c) => c.id !== cueId));
      } catch (err) {
        console.error("Cue operation failed:", err);
        setError("Network error. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [videoId, cues, onCuesChange]
  );

  // Start editing a cue
  const startEdit = (cue: ExerciseCue) => {
    setEditingId(cue.id);
    setEditName(cue.exerciseName);
    setEditTimestamp(formatTime(cue.timestamp));
  };

  // Save edit
  const handleSaveEdit = useCallback(
    async (cueId: string) => {
      const ts = parseTimestamp(editTimestamp);
      if (ts === null) {
        setError("Invalid timestamp");
        return;
      }
      if (!editName.trim()) {
        setError("Exercise name is required");
        return;
      }
      clearError();
      setSaving(true);
      try {
        const updatedCues = cues.map((c, i) =>
          c.id === cueId
            ? { ...c, exerciseName: editName.trim(), timestamp: ts, order: i + 1 }
            : { ...c, order: i + 1 }
        );
        const res = await fetch(`/api/videos/${videoId}/cues`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cues: updatedCues }),
        });
        if (!res.ok) {
          setError("Failed to update cue");
          return;
        }
        onCuesChange(
          updatedCues.sort((a, b) => a.timestamp - b.timestamp)
        );
        setEditingId(null);
      } catch (err) {
        console.error("Cue operation failed:", err);
        setError("Network error. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [editName, editTimestamp, videoId, cues, onCuesChange]
  );

  // Move cue up/down in order
  const handleMove = useCallback(
    async (cueId: string, direction: "up" | "down") => {
      const idx = cues.findIndex((c) => c.id === cueId);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= cues.length) return;

      clearError();
      setSaving(true);
      const reordered = [...cues];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      const withOrders = reordered.map((c, i) => ({ ...c, order: i + 1 }));

      try {
        const res = await fetch(`/api/videos/${videoId}/cues`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cues: withOrders }),
        });
        if (!res.ok) {
          setError("Failed to reorder cues");
          return;
        }
        onCuesChange(withOrders);
      } catch (err) {
        console.error("Cue operation failed:", err);
        setError("Network error. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [videoId, cues, onCuesChange]
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
      >
        <PencilIcon className="h-4 w-4" />
        Edit Cues
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-400">Cue Editor</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-white"
          aria-label="Close cue editor"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Add new cue */}
      <div className="space-y-2">
        <input
          type="text"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          placeholder="Exercise name"
          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-green-600"
          onKeyDown={(e) => {
            if (e.key === "Enter" && exerciseName.trim()) handleQuickAdd();
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={handleQuickAdd}
            disabled={saving || !exerciseName.trim()}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            Add at {formatTime(Math.floor(currentTime))}
          </button>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="m:ss"
              className="w-16 rounded-lg bg-zinc-800 px-2 py-2 text-center text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-green-600"
            />
            <button
              onClick={handleManualAdd}
              disabled={saving || !exerciseName.trim() || !timestamp}
              className="flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-600 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}

      {/* Cue list */}
      {cues.length > 0 && (
        <div className="mt-4 space-y-1 border-t border-zinc-800 pt-3">
          {cues.map((cue, idx) => (
            <div key={cue.id} className="flex items-center gap-1">
              {editingId === cue.id ? (
                <>
                  <input
                    type="text"
                    value={editTimestamp}
                    onChange={(e) => setEditTimestamp(e.target.value)}
                    className="w-14 rounded bg-zinc-800 px-2 py-1 text-center font-mono text-xs text-white outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-0 flex-1 rounded bg-zinc-800 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-green-600"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(cue.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(cue.id)}
                    disabled={saving}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-green-400 transition-colors hover:text-green-300"
                    aria-label="Save edit"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-zinc-400 transition-colors hover:text-white"
                    aria-label="Cancel edit"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="w-14 shrink-0 text-center font-mono text-xs text-zinc-500">
                    {formatTime(cue.timestamp)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
                    {cue.exerciseName}
                  </span>
                  {/* Reorder buttons */}
                  <button
                    onClick={() => handleMove(cue.id, "up")}
                    disabled={idx === 0 || saving}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-zinc-500 transition-colors hover:text-white disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ChevronUpIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleMove(cue.id, "down")}
                    disabled={idx === cues.length - 1 || saving}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-zinc-500 transition-colors hover:text-white disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ChevronDownIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => startEdit(cue)}
                    disabled={saving}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-zinc-500 transition-colors hover:text-white"
                    aria-label="Edit cue"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(cue.id)}
                    disabled={saving}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-zinc-500 transition-colors hover:text-red-400"
                    aria-label="Delete cue"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Parse "m:ss" or raw seconds
function parseTimestamp(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try m:ss format
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }

  // Try raw seconds
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 0) return num;

  return null;
}

// Icons
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H5.25a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M11.47 7.72a.75.75 0 011.06 0l7.5 7.5a.75.75 0 11-1.06 1.06L12 9.31l-6.97 6.97a.75.75 0 01-1.06-1.06l7.5-7.5z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
    </svg>
  );
}
