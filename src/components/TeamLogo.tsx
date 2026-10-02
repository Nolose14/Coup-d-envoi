"use client";

import { useState } from "react";

const SIZES = {
  sm: { box: "h-6 w-6", text: "text-[8px]" },
  md: { box: "h-9 w-9", text: "text-[11px]" },
  lg: { box: "h-12 w-12", text: "text-[14px]" },
} as const;

export function TeamLogo({
  src,
  name,
  small = false,
  size,
}: {
  src: string | null;
  name: string;
  small?: boolean;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);
  const s = SIZES[size ?? (small ? "sm" : "md")];

  if (!src || failed) {
    return (
      <span className={`flex ${s.box} shrink-0 items-center justify-center rounded-full bg-surface-2 ${s.text} font-semibold text-label-2`}>
        {name.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`${s.box} shrink-0 object-contain`} />
  );
}
