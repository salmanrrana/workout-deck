"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { VideoCard } from "@/components/VideoCard";
import { Button, Card, Chip, EmptyState, Input, Skeleton } from "@/components/ui";
import { buttonClassName } from "@/components/ui/Button";

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  tags: string[];
  notes: string | null;
  createdAt: string;
  provider: "youtube" | "vimeo";
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [isLoading, setIsLoading] = useState(true);
  const latestRequestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++latestRequestId.current;

    const fetchVideos = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedTag) params.set("tag", selectedTag);
        if (debouncedSearch) params.set("search", debouncedSearch);

        const res = await fetch(`/api/videos?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok || requestId !== latestRequestId.current) return;

        const data: Video[] = await res.json();
        if (requestId !== latestRequestId.current) return;

        setVideos(data);

        // Extract all unique tags from videos
        const tags = new Set<string>();
        data.forEach((video) => {
          video.tags.forEach((tag) => tags.add(tag));
        });
        setAllTags(Array.from(tags).sort());
      } catch (error) {
        if (
          requestId === latestRequestId.current &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          console.error("Failed to fetch videos:", error);
        }
      } finally {
        if (requestId === latestRequestId.current) setIsLoading(false);
      }
    };

    void fetchVideos();
    return () => controller.abort();
  }, [selectedTag, debouncedSearch]);

  const handleDelete = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const selectTag = (tag: string | null) => {
    // Tag filters apply immediately, so include the latest typed search rather
    // than the previous debounced value in the request they trigger.
    setDebouncedSearch(searchQuery);
    setSelectedTag(tag);
  };

  const clearFilters = () => {
    setSelectedTag(null);
    setSearchQuery("");
    setDebouncedSearch("");
  };

  const hasFilters = selectedTag !== null || searchQuery !== "";

  return (
    <div className="py-8">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-h1 font-bold tracking-tight sm:text-display-xl">Video Library</h1>
          <p className="mt-2 text-muted">
            Find the right card, press play, and get moving.
          </p>
        </div>
        <Link href="/videos/new" className={buttonClassName()}>
          <PlusIcon className="h-5 w-5" />
          Add Video
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <Input
          aria-label="Search videos"
          type="search"
          placeholder="Search videos by title..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          leadingIcon={<SearchIcon className="h-5 w-5" />}
        />

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-small text-muted">Filter by tag:</span>
            <Chip
              variant={selectedTag === null ? "selected" : "neutral"}
              pressed={selectedTag === null}
              onClick={() => selectTag(null)}
            >
              All
            </Chip>
            {allTags.map((tag) => (
              <Chip
                key={tag}
                pressed={selectedTag === tag}
                onClick={() => selectTag(tag === selectedTag ? null : tag)}
                variant={selectedTag === tag ? "selected" : "neutral"}
              >
                {tag}
              </Chip>
            ))}
          </div>
        )}

        <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
          <p className="text-label" aria-live="polite">
            {isLoading
              ? "Updating your deck"
              : `${videos.length} card${videos.length === 1 ? "" : "s"}${selectedTag ? ` · ${selectedTag}` : ""}${searchQuery ? ` · “${searchQuery}”` : ""}`}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <VideoGridSkeleton />}

      {/* Empty State */}
      {!isLoading && videos.length === 0 && (
        <EmptyState
          icon={<VideoIcon className="h-6 w-6" />}
          title={hasFilters ? "No cards match those filters" : "Your deck is empty"}
          description={
            hasFilters
              ? "Try a different search, choose another tag, or clear your filters."
              : "Add your first workout video to start building your deck."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Link href="/videos/new" className={buttonClassName()}>
                <PlusIcon className="h-5 w-5" />
                Add Video
              </Link>
            )
          }
        />
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

function VideoGridSkeleton() {
  return (
    <section
      role="status"
      aria-label="Loading your deck"
      aria-busy="true"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <span className="sr-only">Loading your deck</span>
      {Array.from({ length: 8 }, (_, index) => (
        <Card key={index} padding="none" className="overflow-hidden">
          <Skeleton className="aspect-video rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-4/5" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="h-11 w-full" />
          </div>
        </Card>
      ))}
    </section>
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

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
