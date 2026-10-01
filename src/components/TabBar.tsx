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
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-separator bg-surface/80 backdrop-blur-xl"
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
                className={`flex h-[50px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors active:opacity-60 ${
                  active ? "text-accent" : "text-label-2"
                }`}
              >
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
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
