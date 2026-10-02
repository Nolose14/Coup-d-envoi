"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CLUB_FILTERS, SELECTION_FILTERS } from "@/config/onglets";
import { MatchesView } from "./MatchesView";
import { StandingsView } from "./StandingsView";

/** Même ordre que la barre d'onglets du bas. */
const TABS = ["/clubs", "/selections", "/classements"];

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; // départ rapide, arrivée douce, comme iOS

/**
 * Les 3 onglets sont posés côte à côte, comme les pages d'un livre.
 * En glissant le doigt, la page voisine arrive en même temps que l'actuelle s'en va,
 * puis l'ensemble se cale tout seul sur la bonne page.
 * Chaque onglet garde sa propre position de défilement.
 */
export function SwipeNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const routeIndex = TABS.findIndex((t) => pathname.startsWith(t));
  const [index, setIndex] = useState(Math.max(0, routeIndex));
  const indexRef = useRef(index);
  const trackRef = useRef<HTMLDivElement>(null);
  const fromSwipe = useRef(false);

  const place = useCallback((i: number, dx: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate ? `transform 340ms ${EASE}` : "none";
    track.style.transform = `translate3d(${-i * window.innerWidth + dx}px, 0, 0)`;
  }, []);

  // Position de départ, et recalage si l'écran change de taille
  useLayoutEffect(() => {
    place(indexRef.current, 0, false);
    const onResize = () => place(indexRef.current, 0, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [place]);

  // Touche sur la barre du bas : changement immédiat, comme les apps de l'iPhone
  useEffect(() => {
    if (routeIndex < 0 || routeIndex === indexRef.current) {
      fromSwipe.current = false;
      return;
    }
    indexRef.current = routeIndex;
    setIndex(routeIndex);
    if (!fromSwipe.current) place(routeIndex, 0, false);
    fromSwipe.current = false;
  }, [routeIndex, place]);

  useEffect(() => {
    TABS.forEach((t) => router.prefetch(t));
  }, [router]);

  // Le geste
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let mode: "idle" | "h" | "v" = "v";
    let samples: { x: number; t: number }[] = [];

    const ignored = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n && n !== track; n = n.parentElement) {
        if (n.scrollWidth > n.clientWidth + 1) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll") return true; // barre des compétitions : elle défile d'abord
        }
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || document.querySelector('[role="dialog"]') || ignored(e.target)) {
        mode = "v";
        return;
      }
      startX = t.clientX;
      startY = t.clientY;
      dx = 0;
      samples = [{ x: t.clientX, t: e.timeStamp }];
      mode = "idle";
    };

    const onMove = (e: TouchEvent) => {
      if (mode === "v") return;
      const t = e.touches[0];
      const mx = t.clientX - startX;
      const my = t.clientY - startY;
      if (mode === "idle") {
        if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
        mode = Math.abs(mx) > Math.abs(my) ? "h" : "v";
        if (mode === "v") return;
        startX = t.clientX; // pas de saut au moment où le geste est reconnu
      }
      if (e.cancelable) e.preventDefault();
      const i = indexRef.current;
      const raw = t.clientX - startX;
      const atEdge = (raw > 0 && i === 0) || (raw < 0 && i === TABS.length - 1);
      dx = atEdge ? raw * 0.3 : raw; // résistance au bout, comme iOS
      samples.push({ x: t.clientX, t: e.timeStamp });
      if (samples.length > 5) samples.shift();
      place(i, dx, false);
    };

    const onEnd = () => {
      if (mode !== "h") {
        mode = "v";
        return;
      }
      mode = "v";
      const first = samples[0];
      const last = samples[samples.length - 1];
      const speed = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0; // px/ms
      const i = indexRef.current;
      const w = window.innerWidth;
      let next = i;
      if ((dx < -w * 0.25 || speed < -0.35) && i < TABS.length - 1) next = i + 1;
      else if ((dx > w * 0.25 || speed > 0.35) && i > 0) next = i - 1;

      place(next, 0, true);
      if (next !== i) {
        indexRef.current = next;
        setIndex(next);
        fromSwipe.current = true;
        router.replace(TABS[next], { scroll: false });
      }
    };

    track.addEventListener("touchstart", onStart, { passive: true });
    track.addEventListener("touchmove", onMove, { passive: false });
    track.addEventListener("touchend", onEnd);
    track.addEventListener("touchcancel", onEnd);
    return () => {
      track.removeEventListener("touchstart", onStart);
      track.removeEventListener("touchmove", onMove);
      track.removeEventListener("touchend", onEnd);
      track.removeEventListener("touchcancel", onEnd);
    };
  }, [place, router]);

  // Page qui n'est pas un onglet (ex. page introuvable) : affichage classique
  if (routeIndex < 0) {
    return (
      <main className="mx-auto h-full max-w-xl overflow-y-auto pb-[calc(84px+env(safe-area-inset-bottom))]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {children}
      </main>
    );
  }

  const panes = [
    <MatchesView key="clubs" section="clubs" title="Clubs" filters={CLUB_FILTERS} />,
    <MatchesView key="selections" section="selections" title="Sélections" filters={SELECTION_FILTERS} />,
    <StandingsView key="classements" />,
  ];

  return (
    <main className="fixed inset-0 overflow-hidden">
      <div ref={trackRef} className="flex h-full" style={{ width: `${TABS.length * 100}vw`, willChange: "transform" }}>
        {panes.map((pane, i) => (
          <div
            key={TABS[i]}
            inert={i !== index}
            aria-hidden={i !== index}
            className="h-full w-screen shrink-0 overflow-y-auto overflow-x-hidden"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto max-w-xl">{pane}</div>
          </div>
        ))}
      </div>
      {children}
    </main>
  );
}
