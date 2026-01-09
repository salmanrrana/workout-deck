"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
}

export default function AddVideoPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing tags on mount
  useEffect(() => {
    fetch("/api/videos")
      .then((res) => res.json())
      .then((videos) => {
        const allTags = new Set<string>();
        videos.forEach((video: { tags: string[] }) => {
          video.tags.forEach((tag) => allTags.add(tag));
        });
        setExistingTags(Array.from(allTags).sort());
      })
      .catch(console.error);
  }, []);

  // Fetch video info when URL changes
  const fetchVideoInfo = useCallback(async (inputUrl: string) => {
    const videoId = extractYouTubeId(inputUrl);
    if (!videoId) {
      setVideoInfo(null);
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/youtube/info?url=${encodeURIComponent(inputUrl)}`
      );
      if (res.ok) {
        const info = await res.json();
        setVideoInfo(info);
        setTitle(info.title);
      } else {
        // Even if we can't fetch info, we can still show the thumbnail
        setVideoInfo({
          id: videoId,
          title: "",
          thumbnail: getYouTubeThumbnail(videoId, "mq"),
        });
      }
    } catch {
      setVideoInfo(null);
    } finally {
      setIsFetching(false);
    }
  }, []);

  // Debounced URL fetch
  useEffect(() => {
    if (!url) {
      setVideoInfo(null);
      return;
    }

    const timer = setTimeout(() => {
      fetchVideoInfo(url);
    }, 500);

    return () => clearTimeout(timer);
  }, [url, fetchVideoInfo]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoInfo?.id) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeId: videoInfo.id,
          title: title.trim(),
          tags,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        router.push("/videos");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add video");
      }
    } catch {
      setError("Failed to add video");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedTags = existingTags.filter(
    (tag) => !tags.includes(tag) && tag.includes(tagInput.toLowerCase())
  );

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/videos"
          className="mb-4 inline-flex items-center gap-1 text-zinc-400 hover:text-white"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back to Videos
        </Link>
        <h1 className="text-3xl font-bold sm:text-4xl">Add Video</h1>
        <p className="mt-1 text-zinc-400">
          Add a YouTube workout video to your library
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-900/50 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* YouTube URL Input */}
        <div>
          <label
            htmlFor="url"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            YouTube URL
          </label>
          <input
            type="text"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="min-h-[44px] w-full rounded-lg bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-700 transition-all focus:ring-2 focus:ring-green-500"
          />
          {isFetching && (
            <p className="mt-2 text-sm text-zinc-500">Fetching video info...</p>
          )}
        </div>

        {/* Video Preview */}
        {videoInfo && (
          <div className="overflow-hidden rounded-lg bg-zinc-900">
            <div className="relative aspect-video">
              <Image
                src={videoInfo.thumbnail}
                alt={videoInfo.title || "Video thumbnail"}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Title Input */}
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video title"
            className="min-h-[44px] w-full rounded-lg bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-700 transition-all focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Tags Input */}
        <div>
          <label
            htmlFor="tags"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Tags
          </label>
          <div className="flex flex-wrap gap-2 rounded-lg bg-zinc-900 p-3 ring-1 ring-zinc-700 focus-within:ring-2 focus-within:ring-green-500">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-green-600 px-3 py-1 text-sm text-white"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-red-300"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              id="tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder={tags.length === 0 ? "Add tags (press Enter)" : ""}
              className="min-h-[36px] min-w-[120px] flex-1 bg-transparent text-white placeholder-zinc-500 outline-none"
            />
          </div>
          {/* Tag Suggestions */}
          {suggestedTags.length > 0 && tagInput && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-zinc-500">Suggestions:</span>
              {suggestedTags.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-700"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {/* Existing Tags */}
          {existingTags.length > 0 && !tagInput && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-zinc-500">Existing tags:</span>
              {existingTags
                .filter((tag) => !tags.includes(tag))
                .slice(0, 8)
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-700"
                  >
                    {tag}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Notes Input */}
        <div>
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this video..."
            rows={3}
            className="min-h-[100px] w-full rounded-lg bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-700 transition-all focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading || !videoInfo?.id || !title.trim()}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Adding...
              </>
            ) : (
              <>
                <PlusIcon className="h-5 w-5" />
                Add Video
              </>
            )}
          </button>
          <Link
            href="/videos"
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-zinc-700 px-6 py-2 font-medium text-white transition-colors hover:bg-zinc-600"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
