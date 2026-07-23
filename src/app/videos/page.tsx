"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { VideoCard } from "@/components/VideoCard";
import { Button, Chip, EmptyState, Input, Spinner } from "@/components/ui";

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  tags: string[];
  notes: string | null;
  createdAt: string;
}

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [isLoading, setIsLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTag) params.set("tag", selectedTag);
      if (debouncedSearch) params.set("search", debouncedSearch);

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
  }, [selectedTag, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Video Library</h1>
          <p className="mt-1 text-muted">
            {videos.length} video{videos.length !== 1 ? "s" : ""}
            {selectedTag && ` tagged "${selectedTag}"`}
          </p>
        </div>
        <Button
          icon={<PlusIcon className="h-5 w-5" />}
          onClick={() => router.push("/videos/new")}
        >
          Add Video
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
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
              onClick={() => setSelectedTag(null)}
            >
              All
            </Chip>
            {allTags.map((tag) => (
              <Chip
                key={tag}
                pressed={selectedTag === tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                variant={selectedTag === tag ? "selected" : "neutral"}
              >
                {tag}
              </Chip>
            ))}
          </div>
        )}

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all filters
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" label="Loading videos" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && videos.length === 0 && (
        <EmptyState
          icon={<VideoIcon className="h-6 w-6" />}
          title={hasFilters ? "No videos match your filters" : "Your video library is empty"}
          description={
            hasFilters
              ? "Try clearing your search or tag filters."
              : "Add your first workout video to start building your deck."
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button
                icon={<PlusIcon className="h-5 w-5" />}
                onClick={() => router.push("/videos/new")}
              >
                Add Video
              </Button>
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
