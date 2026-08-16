import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useCopiedState } from "@/lib/use-copied-state";

describe("useCopiedState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("starts false", () => {
    const { result } = renderHook(() => useCopiedState());
    expect(result.current.copied).toBe(false);
  });

  it("flips true on trigger() and back to false after the duration", () => {
    const { result } = renderHook(() => useCopiedState(2000));

    act(() => {
      result.current.trigger();
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });

  it("restarts the timer instead of stacking on a re-trigger", () => {
    const { result } = renderHook(() => useCopiedState(2000));

    act(() => {
      result.current.trigger();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // Re-trigger before the first timer fires — should push the reset
    // out another full 2000ms rather than firing at the original 2000ms
    // mark.
    act(() => {
      result.current.trigger();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.copied).toBe(false);
  });

  it("respects a custom duration", () => {
    const { result } = renderHook(() => useCopiedState(500));

    act(() => {
      result.current.trigger();
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.copied).toBe(false);
  });
});
