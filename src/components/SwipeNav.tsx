"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSwipeTabs } from "@/lib/useSwipeTabs";

/** Même ordre que la barre d'onglets du bas. */
const TABS = ["/clubs", "/selections", "/classements"];

/** Glisser le doigt à gauche ou à droite passe d'un onglet à l'autre : Clubs ↔ Sélections ↔ Classements. */
export function SwipeNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = TABS.find((t) => pathname.startsWith(t));

  // Prépare les autres onglets à l'avance pour un changement instantané
  useEffect(() => {
    TABS.forEach((t) => router.prefetch(t));
  }, [router]);

  const ref = useSwipeTabs(TABS, current, (href) => router.replace(href));

  return (
    <div ref={ref} style={{ minHeight: "calc(100dvh - 84px - env(safe-area-inset-top) - env(safe-area-inset-bottom))" }}>
      {children}
    </div>
  );
}
