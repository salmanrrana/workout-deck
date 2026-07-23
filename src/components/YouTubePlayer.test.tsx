import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VideoPlayerHandle } from "./YouTubePlayer";
import { YouTubePlayer } from "./YouTubePlayer";

type PlayerOptions = ConstructorParameters<Window["YT"]["Player"]>[1];

const constructorMock = vi.fn();
const destroyMock = vi.fn();

class FakeYouTubePlayer implements VideoPlayerHandle {
  private iframe: HTMLIFrameElement;

  constructor(elementId: string, options: PlayerOptions) {
    const target = document.getElementById(elementId);
    if (!target) throw new Error(`Missing player target ${elementId}`);

    this.iframe = document.createElement("iframe");
    this.iframe.dataset.videoId = options.videoId;
    target.replaceWith(this.iframe);
    constructorMock(elementId, options.videoId, this.iframe);
    options.events?.onReady?.({ target: this });
  }

  playVideo = vi.fn();
  pauseVideo = vi.fn();
  seekTo = vi.fn();
  getCurrentTime = vi.fn(() => 0);
  getDuration = vi.fn(() => 600);
  stopVideo = vi.fn();
  getPlayerState = vi.fn(() => 5);
  setVolume = vi.fn();
  getVolume = vi.fn(() => 100);
  mute = vi.fn();
  unMute = vi.fn();
  isMuted = vi.fn(() => false);

  destroy = () => {
    destroyMock(this.iframe);
    this.iframe.remove();
  };
}

describe("YouTubePlayer", () => {
  afterEach(() => {
    cleanup();
    constructorMock.mockClear();
    destroyMock.mockClear();
  });

  it("rebuilds the SDK-owned player host when the video changes", async () => {
    window.YT = {
      Player: FakeYouTubePlayer,
      PlayerState: {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5,
      },
    };
    const onPlayerRef = vi.fn();
    const { container, rerender } = render(
      <YouTubePlayer videoId="first-video" onPlayerRef={onPlayerRef} />,
    );

    await waitFor(() => expect(window.onYouTubeIframeAPIReady).toBeTypeOf("function"));
    act(() => {
      window.onYouTubeIframeAPIReady?.();
    });
    await waitFor(() => expect(constructorMock).toHaveBeenCalledOnce());

    const firstIframe = container.querySelector("iframe");
    expect(firstIframe?.dataset.videoId).toBe("first-video");
    expect(onPlayerRef).toHaveBeenLastCalledWith(expect.any(Object));

    rerender(<YouTubePlayer videoId="second-video" onPlayerRef={onPlayerRef} />);

    await waitFor(() => expect(constructorMock).toHaveBeenCalledTimes(2));
    const replacementIframe = container.querySelector("iframe");
    expect(destroyMock).toHaveBeenCalledOnce();
    expect(onPlayerRef).toHaveBeenCalledWith(null);
    expect(firstIframe).not.toBe(replacementIframe);
    expect(firstIframe?.isConnected).toBe(false);
    expect(replacementIframe?.isConnected).toBe(true);
    expect(replacementIframe?.dataset.videoId).toBe("second-video");
  });
});
