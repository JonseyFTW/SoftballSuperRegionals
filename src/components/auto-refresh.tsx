"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({
  liveIntervalMs = 15_000,
  idleIntervalMs = 60_000,
  hasLiveGames = false,
}: {
  liveIntervalMs?: number;
  idleIntervalMs?: number;
  hasLiveGames?: boolean;
}) {
  const router = useRouter();
  const intervalMs = hasLiveGames ? liveIntervalMs : idleIntervalMs;

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      if (cancelled) return;
      timeout = setTimeout(tick, intervalMs);
    };

    const tick = () => {
      if (cancelled) return;
      if (document.visibilityState === "visible") {
        router.refresh();
      }
      scheduleNext();
    };

    const refreshNow = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      if (timeout) clearTimeout(timeout);
      scheduleNext();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshNow();
      } else if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refreshNow();
    };

    scheduleNext();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refreshNow);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", refreshNow);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", refreshNow);
    };
  }, [router, intervalMs]);

  return null;
}
