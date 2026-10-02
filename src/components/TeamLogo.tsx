"use client";

import { useState } from "react";

export function TeamLogo({ src, name, small = false }: { src: string | null; name: string; small?: boolean }) {
  const size = small ? "h-6 w-6" : "h-9 w-9";
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-surface-2 ${small ? "text-[8px]" : "text-[11px]"} font-semibold text-label-2`}>
        {name.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`${size} shrink-0 object-contain`} />
  );
}
