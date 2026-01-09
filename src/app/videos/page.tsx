"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { VideoCard } from "@/components/VideoCard";

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  tags: string[];
  notes: string | null;
  createdAt: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTag) params.set("tag", selectedTag);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/videos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data);

        // Extract all unique tags from videos
        const tags = new Set<string>();
        data.forEach((video: Video) => {
          video.tags.forEach((tag) => tags.add(tag));
        });
        setAllTags(Array.from(tags).sort());
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTag, searchQuery]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearch !== searchQuery) return;
    fetchVideos();
  }, [debouncedSearch, fetchVideos, searchQuery]);

  const handleDelete = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const clearFilters = () => {
    setSelectedTag(null);
    setSearchQuery("");
  };

  const hasFilters = selectedTag !== null || searchQuery !== "";

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Video Library</h1>
          <p className="mt-1 text-zinc-400">
            {videos.length} video{videos.length !== 1 ? "s" : ""}
            {selectedTag && ` tagged "${selectedTag}"`}
          </p>
        </div>
        <Link
          href="/videos/new"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
        >
          <PlusIcon className="h-5 w-5" />
          Add Video
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search videos by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-[44px] w-full rounded-lg bg-zinc-900 py-2 pl-12 pr-4 text-white placeholder-zinc-500 outline-none ring-1 ring-zinc-700 transition-all focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-500">Filter by tag:</span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`min-h-[36px] rounded-full px-3 py-1 text-sm transition-colors ${
                selectedTag === null
                  ? "bg-green-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`min-h-[36px] rounded-full px-3 py-1 text-sm transition-colors ${
                  selectedTag === tag
                    ? "bg-green-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Clear Filters */}
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-zinc-400 underline hover:text-white"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-green-500" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && videos.length === 0 && (
        <div className="rounded-xl bg-zinc-900 p-8 text-center">
          {hasFilters ? (
            <>
              <p className="text-lg text-zinc-400">
                No videos match your filters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 text-green-500 underline hover:text-green-400"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <p className="text-lg text-zinc-400">
                No videos yet. Add your first workout video!
              </p>
              <Link
                href="/videos/new"
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
              >
                <PlusIcon className="h-5 w-5" />
                Add Video
              </Link>
            </>
          )}
        </div>
      )}

      {/* Video Grid */}
      {!isLoading && videos.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
