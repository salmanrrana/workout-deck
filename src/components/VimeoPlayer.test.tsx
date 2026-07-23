import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VimeoPlayer } from "./VimeoPlayer";

const eventHandlers = new Map<
  string,
  (data?: { seconds?: number; duration?: number }) => void
>();
const constructorMock = vi.fn();
const destroyMock = vi.fn(() => Promise.resolve());

class FakeVimeoPlayer {
  constructor(element: HTMLIFrameElement) {
    constructorMock(element);
  }

  play = vi.fn(() => Promise.resolve());
  pause = vi.fn(() => Promise.resolve());
  setCurrentTime = vi.fn((seconds: number) => Promise.resolve(seconds));
  getCurrentTime = vi.fn(() => Promise.resolve(0));
  getDuration = vi.fn(() => Promise.resolve(600));
  destroy = destroyMock;

  on(
    event: string,
    callback: (data?: { seconds?: number; duration?: number }) => void,
  ) {
    eventHandlers.set(event, callback);
  }
}

describe("VimeoPlayer", () => {
  afterEach(() => {
    cleanup();
    eventHandlers.clear();
    constructorMock.mockClear();
    destroyMock.mockClear();
    delete window.Vimeo;
  });

  it("keeps playback mounted when parent callbacks change", async () => {
    window.Vimeo = { Player: FakeVimeoPlayer };
    const firstTimeUpdate = vi.fn();
    const latestTimeUpdate = vi.fn();

    const { rerender } = render(
      <VimeoPlayer videoId="12345" onTimeUpdate={firstTimeUpdate} />,
    );

    await waitFor(() => expect(constructorMock).toHaveBeenCalledOnce());

    rerender(<VimeoPlayer videoId="12345" onTimeUpdate={latestTimeUpdate} />);

    expect(constructorMock).toHaveBeenCalledOnce();
    expect(destroyMock).not.toHaveBeenCalled();

    act(() => {
      eventHandlers.get("timeupdate")?.({ seconds: 42, duration: 600 });
    });

    expect(firstTimeUpdate).not.toHaveBeenCalled();
    expect(latestTimeUpdate).toHaveBeenCalledWith(42);
  });
});
