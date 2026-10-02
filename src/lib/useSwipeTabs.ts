"use client";

import { useEffect, useRef } from "react";

/**
 * Glisser le doigt vers la gauche ou la droite sur la liste pour passer
 * à la catégorie suivante ou précédente, comme les onglets d'une app native.
 * Le défilement vertical reste géré par le navigateur.
 */
export function useSwipeTabs<T extends string>(ids: T[], current: T | undefined, onChange: (id: T) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ ids, current, onChange });
  latest.current = { ids, current, onChange };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const EASE = "cubic-bezier(0.2, 0.9, 0.3, 1)";
    let startX = 0;
    let startY = 0;
    let startT = 0;
    let dx = 0;
    let mode: "idle" | "h" | "v" = "v";
    let busy = false;

    const reset = (ms: number) => {
      el.style.transition = ms ? `transform ${ms}ms ${EASE}, opacity ${ms}ms` : "none";
      el.style.transform = "";
      el.style.opacity = "";
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      // Un seul doigt, et pas depuis le tout bord de l'écran (gestes de l'iPhone)
      if (busy || e.touches.length !== 1 || t.clientX < 16 || t.clientX > window.innerWidth - 16) {
        mode = "v";
        return;
      }
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
      dx = 0;
      mode = "idle";
      el.style.transition = "none";
    };

    const onMove = (e: TouchEvent) => {
      if (mode === "v") return;
      const t = e.touches[0];
      const mx = t.clientX - startX;
      const my = t.clientY - startY;
      if (mode === "idle") {
        if (Math.abs(mx) < 10 && Math.abs(my) < 10) return;
        mode = Math.abs(mx) > Math.abs(my) * 1.3 ? "h" : "v";
        if (mode === "v") return;
      }
      e.preventDefault(); // geste horizontal : la page ne défile pas en même temps
      const { ids, current } = latest.current;
      const i = current ? ids.indexOf(current) : -1;
      const blocked = (mx > 0 && i <= 0) || (mx < 0 && i >= ids.length - 1);
      dx = blocked ? mx * 0.25 : mx; // résistance quand il n'y a plus de catégorie de ce côté
      el.style.transform = `translate3d(${dx}px, 0, 0)`;
      el.style.opacity = String(1 - Math.min(Math.abs(dx) / 700, 0.35));
    };

    const onEnd = () => {
      if (mode !== "h") {
        mode = "v";
        return;
      }
      mode = "v";
      const { ids, current, onChange } = latest.current;
      const i = current ? ids.indexOf(current) : -1;
      const speed = dx / Math.max(1, Date.now() - startT); // px par ms
      let next = i;
      if ((dx < -70 || speed < -0.5) && i < ids.length - 1) next = i + 1;
      else if ((dx > 70 || speed > 0.5) && i > 0) next = i - 1;

      if (next === i || i < 0) {
        reset(260);
        return;
      }

      // Sortie de l'ancienne liste, puis entrée de la nouvelle par l'autre côté
      busy = true;
      const dir = next > i ? 1 : -1;
      const w = window.innerWidth * 0.35;
      el.style.transition = `transform 150ms ease-in, opacity 150ms`;
      el.style.transform = `translate3d(${-dir * w}px, 0, 0)`;
      el.style.opacity = "0";
      window.setTimeout(() => {
        onChange(ids[next]);
        // Si on était descendu dans la liste, on revient en haut de la nouvelle
        const bar = document.querySelector<HTMLElement>("[data-filter-bar]");
        const target = el.getBoundingClientRect().top + window.scrollY - (bar?.getBoundingClientRect().bottom ?? 0);
        if (window.scrollY > target) window.scrollTo({ top: target });
        el.style.transition = "none";
        el.style.transform = `translate3d(${dir * w}px, 0, 0)`;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            reset(260);
            busy = false;
          }),
        );
      }, 150);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  return ref;
}
