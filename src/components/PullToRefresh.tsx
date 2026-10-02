"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const THRESHOLD = 72; // distance à tirer pour déclencher
const MAX = 110;

/** Tirer vers le bas pour actualiser, comme dans les apps iOS (absent en mode PWA). */
export function PullToRefresh({
  onRefresh,
  disabled = false,
  children,
}: {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const busy = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !busy.current && !disabledRef.current) {
        startY.current = e.touches[0].clientY;
        setDragging(true);
      }
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      const eased = dy > 0 ? Math.min(MAX, dy * 0.5) : 0;
      pullRef.current = eased;
      setPull(eased);
    };
    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      setDragging(false);
      if (pullRef.current >= THRESHOLD) {
        busy.current = true;
        setRefreshing(true);
        setPull(56);
        try {
          await refreshRef.current();
        } finally {
          busy.current = false;
          setRefreshing(false);
          setPull(0);
          pullRef.current = 0;
        }
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div>
      <div
        aria-hidden
        className="flex items-end justify-center overflow-hidden"
        style={{ height: pull, transition: dragging ? "none" : "height 220ms ease-out" }}
      >
        <svg
          viewBox="0 0 24 24"
          className="mb-3 h-6 w-6 text-label-2"
          style={{
            opacity: progress,
            transform: `rotate(${progress * 270}deg)`,
            animation: refreshing ? "spin 0.8s linear infinite" : undefined,
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        >
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      </div>
      {children}
    </div>
  );
}
