"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Chip, IconButton } from "@/components/ui";
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

interface VideoCardProps {
  video: Video;
  onDelete?: (id: string) => void;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const router = useRouter();
  const [imageFailed, setImageFailed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const thumbnailUrl =
    video.provider === "youtube"
      ? `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`
      : null;

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete request failed");

      onDelete(video.id);
      setShowConfirm(false);
    } catch {
      setDeleteError("Couldn’t delete this video. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setDeleteError(null);
  };

  return (
    <article className="group/card relative rounded-lg bg-surface-1 [box-shadow:var(--shadow-card)] motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:[box-shadow:var(--shadow-pop)]">
      <Card
        as="a"
        href={`/videos/${video.id}`}
        interactive
        padding="none"
        aria-label={`Play ${video.title}`}
        className="group/link block overflow-hidden rounded-b-none bg-transparent [box-shadow:none] motion-safe:hover:[box-shadow:none]"
      >
        <div className="relative aspect-video overflow-hidden rounded-t-lg bg-surface-2">
          {thumbnailUrl && !imageFailed ? (
            <Image
              src={thumbnailUrl}
              alt={`${video.title} thumbnail`}
              fill
              className="object-cover motion-safe:transition motion-safe:[transition-duration:var(--dur-slow)] motion-safe:[transition-timing-function:var(--ease)] motion-safe:group-hover/link:scale-[1.03] motion-safe:group-focus-visible/link:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-faint">
              <VideoPlaceholderIcon className="h-12 w-12" />
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-bg-base/90 via-bg-base/20 to-transparent opacity-0 motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] group-hover/link:opacity-100 group-focus-visible/link:opacity-100">
            <span className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-accent text-accent-fg [box-shadow:var(--shadow-pop)] motion-safe:transition motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] motion-safe:group-hover/link:scale-100 motion-safe:group-focus-visible/link:scale-100">
              <PlayIcon className="ml-0.5 h-6 w-6" />
            </span>
          </div>

          <Chip
            size="sm"
            className="absolute left-3 top-3 bg-surface-1 text-text [box-shadow:var(--shadow-card)] hover:bg-surface-1 hover:text-text"
          >
            {video.provider === "vimeo" ? "Vimeo" : "YouTube"}
          </Chip>
        </div>

        <div className="p-4 pb-3">
          <h3 className="line-clamp-2 text-h3 font-semibold text-text motion-safe:transition-colors motion-safe:[transition-duration:var(--dur)] group-hover/link:text-accent group-focus-visible/link:text-accent">
            {video.title}
          </h3>

          {video.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {video.tags.map((tag) => (
                <Chip key={tag} size="sm" variant="neutral">
                  {tag}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="border-t border-border p-3">
        {showConfirm ? (
          <div
            role="group"
            aria-label={`Delete ${video.title}?`}
            className="flex items-center gap-2 rounded-md bg-surface-2 p-1.5"
          >
            <span className="min-w-0 flex-1 pl-2 text-small font-semibold text-text">
              Delete?
            </span>
            <IconButton
              aria-label={`Confirm delete ${video.title}`}
              variant="danger"
              loading={isDeleting}
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              <CheckIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              aria-label="Cancel delete"
              variant="ghost"
              disabled={isDeleting}
              onClick={cancelDelete}
            >
              <CloseIcon className="h-4 w-4" />
            </IconButton>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href={`/videos/${video.id}`}
              className={buttonClassName({ className: "flex-1", size: "md" })}
            >
              <PlayIcon className="h-4 w-4" />
              Play
            </Link>
            <IconButton
              aria-label={`Edit ${video.title}`}
              onClick={() => router.push(`/videos/${video.id}/edit`)}
            >
              <EditIcon className="h-4 w-4" />
            </IconButton>
            {onDelete && (
              <IconButton
                aria-label={`Delete ${video.title}`}
                variant="danger"
                onClick={() => {
                  setDeleteError(null);
                  setShowConfirm(true);
                }}
              >
                <TrashIcon className="h-4 w-4" />
              </IconButton>
            )}
          </div>
        )}

        {deleteError && (
          <p role="alert" className="mt-2 text-small text-danger">
            {deleteError}
          </p>
        )}
      </div>
    </article>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 5.5a1 1 0 0 1 1.53-.85l10 6.5a1 1 0 0 1 0 1.7l-10 6.5A1 1 0 0 1 7 18.5v-13Z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 5.25 3 3M4.5 19.5l3.7-.75L19 7.95a2.12 2.12 0 0 0-3-3L5.2 15.75l-.7 3.75Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15m-9-3h3m-7.5 3 .75 12h10.5l.75-12M10 11v5m4-5v5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function VideoPlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
