"use client";

import { useEffect, useRef } from "react";

/**
 * Geste « glisser à gauche / à droite » sur un élément pour passer à l'onglet
 * suivant ou précédent. L'élément suit le doigt, sort d'un côté, puis la
 * nouvelle page entre par l'autre côté dès qu'elle est affichée.
 * Le défilement vertical reste géré normalement par l'iPhone.
 */
export function useSwipeTabs(ids: string[], current: string | undefined, onChange: (id: string) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef({ ids, current, onChange });
  latest.current = { ids, current, onChange };
  const pending = useRef<{ dir: 1 | -1; timer: number } | null>(null);

  const EASE = "cubic-bezier(0.2, 0.9, 0.3, 1)";
  const reset = (el: HTMLElement, ms: number) => {
    el.style.transition = ms ? `transform ${ms}ms ${EASE}, opacity ${ms}ms` : "none";
    el.style.transform = "";
    el.style.opacity = "";
  };

  // La nouvelle page est là : elle entre par le côté opposé
  useEffect(() => {
    const el = ref.current;
    const p = pending.current;
    if (!el || !p) return;
    window.clearTimeout(p.timer);
    pending.current = null;
    el.style.transition = "none";
    el.style.transform = `translate3d(${p.dir * window.innerWidth * 0.3}px, 0, 0)`;
    el.style.opacity = "0";
    requestAnimationFrame(() => requestAnimationFrame(() => reset(el, 280)));
  }, [current]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let dx = 0;
    let mode: "idle" | "h" | "v" = "v";

    /** Le geste commence dans une zone qui défile déjà de côté (filtres) ou dans une fiche ouverte ? */
    const ignored = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (n.getAttribute?.("role") === "dialog") return true;
        if (n.scrollWidth > n.clientWidth + 1) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll") return true;
        }
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (
        pending.current ||
        e.touches.length !== 1 ||
        t.clientX < 16 ||
        t.clientX > window.innerWidth - 16 ||
        document.body.style.overflow === "hidden" || // une feuille est ouverte
        ignored(e.target)
      ) {
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
      if (e.cancelable) e.preventDefault(); // geste horizontal : la page ne défile pas en même temps
      const { ids, current } = latest.current;
      const i = current ? ids.indexOf(current) : -1;
      const blocked = (mx > 0 && i <= 0) || (mx < 0 && i >= ids.length - 1);
      dx = blocked ? mx * 0.25 : mx; // résistance quand il n'y a plus d'onglet de ce côté
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

      if (i < 0 || next === i) {
        reset(el, 260);
        return;
      }

      const dir = next > i ? 1 : -1;
      el.style.transition = "transform 150ms ease-in, opacity 150ms";
      el.style.transform = `translate3d(${-dir * window.innerWidth * 0.3}px, 0, 0)`;
      el.style.opacity = "0";
      // Filet de sécurité : si la page met trop longtemps à changer, on réaffiche quand même
      const timer = window.setTimeout(() => {
        pending.current = null;
        reset(el, 200);
      }, 2500);
      pending.current = { dir, timer };
      window.setTimeout(() => onChange(ids[next]), 150);
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
