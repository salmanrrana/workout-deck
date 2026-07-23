export interface VimeoVideoInfo {
  id: string;
  title: string;
  thumbnail: string | null;
}

/** Extract a numeric Vimeo ID from a public URL or a bare ID. */
export function extractVimeoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith("vimeo.com")) return null;
    const id = url.pathname.split("/").filter(Boolean).findLast((part) => /^\d+$/.test(part));
    return id ?? null;
  } catch {
    return null;
  }
}

export function getVimeoUrl(videoId: string) {
  return `https://vimeo.com/${videoId}`;
}

export async function fetchVimeoInfo(videoId: string): Promise<VimeoVideoInfo | null> {
  try {
    const response = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(getVimeoUrl(videoId))}`,
    );
    if (!response.ok) return null;

    const data = (await response.json()) as { title?: string; thumbnail_url?: string };
    return {
      id: videoId,
      title: data.title ?? "",
      thumbnail: data.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}
