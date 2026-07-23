"use client";

/*
THESIS: Adding a workout card should feel like preparing the deck, not filling out a database record; this form refuses a long undifferentiated field stack.
OWN-WORLD: Graphite instrument surfaces, one sliding green provider signal, tokenized controls, and a live media preview with restrained depth.
STORY: Choose the source, paste a link, confirm the preview, describe the workout, then place the finished card into the deck.
FIRST VIEWPORT: The focused form sits left while a sticky 16:9 preview and readiness summary sit right, collapsing into one clear phone flow.
FORM: Precision brief, two-stage operate layout; concept seed not applicable because the ticket pins both structure and visual system.
*/

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Chip, Input, Skeleton, Textarea } from "@/components/ui";
import { buttonClassName } from "@/components/ui/Button";
import { extractVimeoId, getVimeoUrl } from "@/lib/vimeo";
import { extractYouTubeId, getYouTubeThumbnail, getYouTubeUrl } from "@/lib/youtube";

type VideoProvider = "youtube" | "vimeo";
type FormMode = "create" | "edit";

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string | null;
}

interface StoredVideo {
  id: string;
  youtubeId: string;
  provider?: VideoProvider;
  title: string;
  tags: string[];
  notes: string | null;
  cues?: Array<{ id: string }>;
}

interface OriginalSource {
  provider: VideoProvider;
  id: string;
  cueCount: number;
}

interface VideoFormProps {
  mode: FormMode;
  videoId?: string;
}

const providerLabels: Record<VideoProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
};

function extractProviderId(provider: VideoProvider, value: string) {
  return provider === "youtube" ? extractYouTubeId(value) : extractVimeoId(value);
}

function canonicalProviderUrl(provider: VideoProvider, id: string) {
  return provider === "youtube" ? getYouTubeUrl(id) : getVimeoUrl(id);
}

function videoSourceKey(provider: VideoProvider, value: string) {
  return `${provider}:${value.trim()}`;
}

function fallbackInfo(provider: VideoProvider, id: string): VideoInfo {
  return {
    id,
    title: "",
    thumbnail: provider === "youtube" ? getYouTubeThumbnail(id, "mq") : null,
  };
}

export function VideoForm({ mode, videoId }: VideoFormProps) {
  const router = useRouter();
  const [provider, setProvider] = useState<VideoProvider>("youtube");
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [previewSourceKey, setPreviewSourceKey] = useState<string | null>(null);
  const [originalSource, setOriginalSource] = useState<OriginalSource | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notes, setNotes] = useState("");
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [isHydrating, setIsHydrating] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRequestRef = useRef(0);
  const titleEditedRef = useRef(mode === "edit");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/videos")
      .then((response) => response.json())
      .then((videos: Array<{ tags?: string[] }>) => {
        if (cancelled || !Array.isArray(videos)) return;
        const allTags = new Set<string>();
        videos.forEach((video) => video.tags?.forEach((tag) => allTags.add(tag)));
        setExistingTags(Array.from(allTags).sort());
      })
      .catch((fetchError) => console.error("Failed to load existing tags", fetchError));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !videoId) return;

    let cancelled = false;

    async function loadVideo() {
      try {
        const response = await fetch(`/api/videos/${videoId}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? "Video not found" : "Could not load this video");
        }
        const video = (await response.json()) as StoredVideo;
        if (cancelled) return;

        const storedProvider: VideoProvider = video.provider === "vimeo" ? "vimeo" : "youtube";
        setProvider(storedProvider);
        const storedUrl = canonicalProviderUrl(storedProvider, video.youtubeId);
        setUrl(storedUrl);
        setVideoInfo({
          ...fallbackInfo(storedProvider, video.youtubeId),
          title: video.title,
        });
        setPreviewSourceKey(videoSourceKey(storedProvider, storedUrl));
        setOriginalSource({
          provider: storedProvider,
          id: video.youtubeId,
          cueCount: video.cues?.length ?? 0,
        });
        setTitle(video.title);
        setTags(Array.isArray(video.tags) ? video.tags : []);
        setNotes(video.notes ?? "");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load this video");
        }
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    }

    void loadVideo();
    return () => {
      cancelled = true;
    };
  }, [mode, videoId]);

  const fetchVideoInfo = useCallback(async (inputUrl: string, selectedProvider: VideoProvider) => {
    const providerId = extractProviderId(selectedProvider, inputUrl);
    const requestId = ++previewRequestRef.current;

    if (!providerId) {
      setVideoInfo(null);
      setPreviewSourceKey(null);
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/${selectedProvider}/info?url=${encodeURIComponent(inputUrl)}`,
      );
      const info = response.ok
        ? ((await response.json()) as VideoInfo)
        : fallbackInfo(selectedProvider, providerId);

      if (requestId !== previewRequestRef.current) return;
      setVideoInfo(info);
      setPreviewSourceKey(videoSourceKey(selectedProvider, inputUrl));
      if (info.title && !titleEditedRef.current) setTitle(info.title);
    } catch {
      if (requestId !== previewRequestRef.current) return;
      setVideoInfo(fallbackInfo(selectedProvider, providerId));
      setPreviewSourceKey(videoSourceKey(selectedProvider, inputUrl));
    } finally {
      if (requestId === previewRequestRef.current) setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!url) {
      previewRequestRef.current += 1;
      setVideoInfo(null);
      setPreviewSourceKey(null);
      setIsFetching(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchVideoInfo(url, provider);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [fetchVideoInfo, provider, url]);

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed) {
      setTags((currentTags) => currentTags.includes(trimmed) ? currentTags : [...currentTags, trimmed]);
    }
    setTagInput("");
  }, []);

  const removeTag = useCallback((tag: string) => {
    setTags((currentTags) => currentTags.filter((currentTag) => currentTag !== tag));
  }, []);

  const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
    } else if (event.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const changeUrl = (nextUrl: string) => {
    previewRequestRef.current += 1;
    setUrl(nextUrl);
    setVideoInfo(null);
    setPreviewSourceKey(null);
    if (!titleEditedRef.current) setTitle("");
    setIsFetching(Boolean(extractProviderId(provider, nextUrl)));
    setError(null);
  };

  const changeProvider = (nextProvider: VideoProvider) => {
    if (nextProvider === provider) return;
    previewRequestRef.current += 1;
    setProvider(nextProvider);
    setUrl("");
    setVideoInfo(null);
    setPreviewSourceKey(null);
    if (!titleEditedRef.current) setTitle("");
    setIsFetching(false);
    setError(null);
  };

  const hasCurrentVideo = Boolean(
    videoInfo?.id && previewSourceKey === videoSourceKey(provider, url),
  );
  const sourceChanged = Boolean(
    mode === "edit"
      && originalSource
      && hasCurrentVideo
      && (provider !== originalSource.provider || videoInfo?.id !== originalSource.id),
  );
  const canSubmit = hasCurrentVideo && Boolean(title.trim()) && !isSaving && !isHydrating;
  const disabledReason = !videoInfo?.id
    ? `Enter a valid ${providerLabels[provider]} link or video ID to continue.`
    : !title.trim()
      ? "Add a title to continue."
      : "Ready to save.";

  const suggestedTags = useMemo(
    () => existingTags.filter(
      (tag) => !tags.includes(tag) && tag.toLowerCase().includes(tagInput.toLowerCase()),
    ),
    [existingTags, tagInput, tags],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!videoInfo?.id || previewSourceKey !== videoSourceKey(provider, url)) {
      setError(`Enter a valid ${providerLabels[provider]} link or video ID.`);
      return;
    }
    if (!title.trim()) {
      setError("Add a title for this workout video.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(mode === "edit" ? `/api/videos/${videoId}` : "/api/videos", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeId: videoInfo.id,
          provider,
          title: title.trim(),
          tags,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || `Could not ${mode === "edit" ? "save" : "add"} this video`);
      }

      router.push(mode === "edit" && videoId ? `/videos/${videoId}` : "/videos");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this video");
    } finally {
      setIsSaving(false);
    }
  };

  const pageTitle = mode === "edit" ? "Edit video" : "Add a video";
  const pageDescription = mode === "edit"
    ? "Update the source and details for this card."
    : "Turn a YouTube or Vimeo workout into the next card in your deck.";
  const submitLabel = mode === "edit" ? "Save changes" : "Add to deck";

  return (
    <div className="py-3 sm:py-8">
      <Link
        href="/videos"
        className="mb-5 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-small font-medium text-muted motion-safe:transition-colors hover:bg-surface-2 hover:text-text active:bg-surface-3"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        Back to library
      </Link>

      <header className="mb-7 max-w-2xl">
        <p className="text-label">Build your deck</p>
        <h1 className="mt-2 text-h1 font-bold tracking-tight text-text sm:text-display-xl">{pageTitle}</h1>
        <p className="mt-2 max-w-prose text-body text-muted">{pageDescription}</p>
      </header>

      {error && (
        <p role="alert" className="mb-5 max-w-3xl rounded-md bg-danger/10 px-4 py-3 text-small font-medium text-danger">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid max-w-5xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <Card as="section" padding="lg" className="space-y-6">
          {isHydrating ? (
            <div role="status" aria-label="Loading video details" className="space-y-5">
              <Skeleton className="h-20" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-28" />
            </div>
          ) : (
            <>
              <fieldset>
                <legend className="mb-2 text-small font-medium text-text">Video provider</legend>
                <div className="relative grid grid-cols-2 rounded-md bg-surface-2 p-1 ring-1 ring-border">
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-sm bg-accent motion-safe:transition-transform motion-safe:[transition-duration:var(--dur)] motion-safe:[transition-timing-function:var(--ease)] ${provider === "vimeo" ? "motion-safe:translate-x-full translate-x-full" : "translate-x-0"}`}
                  />
                  {(["youtube", "vimeo"] as const).map((option) => (
                    <Button
                      key={option}
                      variant="ghost"
                      fullWidth
                      aria-pressed={provider === option}
                      onClick={() => changeProvider(option)}
                      className={`relative z-10 hover:bg-transparent active:bg-transparent ${provider === option ? "text-accent-fg hover:text-accent-fg" : "text-muted"}`}
                    >
                      {providerLabels[option]}
                    </Button>
                  ))}
                </div>
              </fieldset>

              <div>
                <Input
                  id="video-url"
                  type="text"
                  label={`${providerLabels[provider]} URL or video ID`}
                  value={url}
                  onChange={(event) => changeUrl(event.target.value)}
                  placeholder={provider === "youtube" ? "youtube.com/watch?v=… or 11-character ID" : "vimeo.com/… or numeric ID"}
                  hint={`Paste the public ${providerLabels[provider]} link or video ID for this workout.`}
                  required
                />
                {sourceChanged && originalSource && originalSource.cueCount > 0 && (
                  <p role="status" className="mt-3 rounded-md bg-paused/10 px-4 py-3 text-small font-medium leading-relaxed text-paused">
                    Saving this new source will remove {originalSource.cueCount === 1 ? "the saved exercise cue" : `all ${originalSource.cueCount} saved exercise cues`} from the old video so they do not appear at the wrong times.
                  </p>
                )}
              </div>

              <Input
                id="video-title"
                label="Title"
                value={title}
                onChange={(event) => {
                  titleEditedRef.current = true;
                  setTitle(event.target.value);
                }}
                placeholder="e.g. 30-minute full body strength"
                required
              />

              <div>
                <Input
                  id="video-tags"
                  label="Tags"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={() => tagInput && addTag(tagInput)}
                  placeholder={tags.length === 0 ? "Type a tag, then press Enter" : "Add another tag"}
                  hint="Use Enter or comma to add. Backspace removes the last tag."
                />

                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2" aria-label="Selected tags">
                    {tags.map((tag) => (
                      <Chip
                        key={tag}
                        variant="accent"
                        onRemove={() => removeTag(tag)}
                        removeLabel={`Remove ${tag} tag`}
                      >
                        {tag}
                      </Chip>
                    ))}
                  </div>
                )}

                {suggestedTags.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted">Suggested from your deck</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestedTags.slice(0, tagInput ? 5 : 8).map((tag) => (
                        <Chip key={tag} size="sm" onClick={() => addTag(tag)}>
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Textarea
                id="video-notes"
                label="Notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Equipment, modifications, or anything worth remembering…"
                hint="Optional — these notes stay attached to the card."
                rows={4}
              />

              <div className="border-t border-border pt-5">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
                  <Link href="/videos" className={buttonClassName({ variant: "secondary", className: "sm:min-w-28" })}>
                    Cancel
                  </Link>
                  <Button
                    type="submit"
                    loading={isSaving}
                    disabled={!canSubmit}
                    icon={<PlusIcon className="h-5 w-5" />}
                    className="sm:flex-1"
                  >
                    {isSaving ? (mode === "edit" ? "Saving…" : "Adding…") : submitLabel}
                  </Button>
                </div>
                <p className={`mt-3 text-small ${canSubmit ? "text-accent" : "text-muted"}`} aria-live="polite">
                  {disabledReason}
                </p>
              </div>
            </>
          )}
        </Card>

        <aside aria-label="Video preview" className="space-y-4 lg:sticky lg:top-20">
          <Card as="section" padding="none" className="overflow-hidden">
            <div className="relative aspect-video bg-surface-2">
              {isFetching ? (
                <div role="status" aria-label={`Fetching ${providerLabels[provider]} preview`} className="absolute inset-0">
                  <Skeleton className="h-full w-full rounded-none" />
                  <span className="sr-only">Fetching video preview</span>
                </div>
              ) : videoInfo ? (
                <>
                  {videoInfo.thumbnail ? (
                    <Image
                      src={videoInfo.thumbnail}
                      alt={`${title || videoInfo.title || "Workout video"} preview`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-faint">
                      <VideoIcon className="h-14 w-14" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-bg-base/95 via-bg-base/25 to-transparent p-4">
                    <Chip size="sm" className="w-fit bg-surface-1 text-text hover:bg-surface-1 hover:text-text">
                      {providerLabels[provider]}
                    </Chip>
                    <p className="line-clamp-2 text-h3 font-semibold text-text">
                      {title || videoInfo.title || "Preview ready — add a title"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3 text-muted">
                    <VideoIcon className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="font-semibold text-text">Your preview appears here</p>
                    <p className="mt-1 text-small leading-relaxed text-muted">
                      Paste a {providerLabels[provider]} link or video ID to check the card before saving.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card as="section" padding="md">
            <div className="flex items-start gap-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${canSubmit ? "bg-accent" : "bg-faint"}`} aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-text">{canSubmit ? "Card ready" : "Finish the essentials"}</h2>
                <p className="mt-1 text-small leading-relaxed text-muted">
                  {canSubmit
                    ? "The source and title are valid. Add optional details or save when ready."
                    : disabledReason}
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </form>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" /></svg>;
}

function PlusIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true"><path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" /></svg>;
}

function VideoIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></svg>;
}
