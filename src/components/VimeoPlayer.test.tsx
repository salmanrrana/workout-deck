import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VimeoPlayer } from "./VimeoPlayer";

const eventHandlers = new Map<
  string,
  (data?: { seconds?: number; duration?: number }) => void
>();
const constructorMock = vi.fn();
const destroyMock = vi.fn((element: HTMLIFrameElement) => {
  element.remove();
  return Promise.resolve();
});

class FakeVimeoPlayer {
  private element: HTMLIFrameElement;

  constructor(element: HTMLIFrameElement) {
    this.element = element;
    constructorMock(element);
  }

  play = vi.fn(() => Promise.resolve());
  pause = vi.fn(() => Promise.resolve());
  setCurrentTime = vi.fn((seconds: number) => Promise.resolve(seconds));
  getCurrentTime = vi.fn(() => Promise.resolve(0));
  getDuration = vi.fn(() => Promise.resolve(600));
  destroy = () => destroyMock(this.element);

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

  it("replaces the SDK-owned iframe and clears the stale handle when the video changes", async () => {
    window.Vimeo = { Player: FakeVimeoPlayer };
    const onPlayerRef = vi.fn();
    const { container, rerender } = render(
      <VimeoPlayer videoId="12345" onPlayerRef={onPlayerRef} />,
    );

    await waitFor(() => expect(constructorMock).toHaveBeenCalledOnce());
    const firstIframe = container.querySelector("iframe");

    await act(async () => {
      eventHandlers.get("loaded")?.();
      await Promise.resolve();
    });
    expect(onPlayerRef).toHaveBeenLastCalledWith(expect.any(Object));

    rerender(<VimeoPlayer videoId="67890" onPlayerRef={onPlayerRef} />);

    await waitFor(() => expect(constructorMock).toHaveBeenCalledTimes(2));
    const replacementIframe = container.querySelector("iframe");
    expect(destroyMock).toHaveBeenCalledOnce();
    expect(onPlayerRef).toHaveBeenCalledWith(null);
    expect(firstIframe).not.toBe(replacementIframe);
    expect(firstIframe?.isConnected).toBe(false);
    expect(replacementIframe?.isConnected).toBe(true);
    expect(replacementIframe?.src).toContain("/video/67890");
  });

  it("reports Vimeo embed errors and removes the loading state", async () => {
    window.Vimeo = { Player: FakeVimeoPlayer };
    const onError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { queryByRole } = render(
      <VimeoPlayer videoId="private-video" onError={onError} />,
    );

    await waitFor(() => expect(constructorMock).toHaveBeenCalledOnce());
    expect(queryByRole("status")).not.toBeNull();

    act(() => {
      eventHandlers.get("error")?.();
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(queryByRole("status")).toBeNull();
    consoleError.mockRestore();
  });
});
