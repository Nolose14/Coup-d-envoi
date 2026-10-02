"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/clubs",
    label: "Clubs",
    icon: (
      <path d="M12 3 4.5 5.5v6.2c0 4.3 3.1 7.9 7.5 9.3 4.4-1.4 7.5-5 7.5-9.3V5.5L12 3Z" />
    ),
  },
  {
    href: "/selections",
    label: "Sélections",
    icon: (
      <>
        <path d="M5 21V4" />
        <path d="M5 4.5c2.5-1.3 4.7-1.3 7 0s4.5 1.3 7 0v8.5c-2.5 1.3-4.7 1.3-7 0s-4.5-1.3-7 0" />
      </>
    ),
  },
  {
    href: "/classements",
    label: "Classements",
    icon: (
      <>
        <path d="M8 21h8M12 16v5" />
        <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
        <path d="M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11" />
      </>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-separator bg-bg/92 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-xl">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                replace
                aria-current={active ? "page" : undefined}
                className={`relative flex h-[54px] flex-col items-center justify-center gap-1 transition-colors active:opacity-60 ${
                  active ? "text-label" : "text-label-3"
                }`}
              >
                {active && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b bg-accent" aria-hidden />}
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.25 : 0}
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  aria-hidden
                >
                  {tab.icon}
                </svg>
                <span className="font-display text-[11px] font-medium tracking-[0.06em]">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
