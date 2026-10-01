import type { ReactNode } from "react";

/**
 * Lien vers un site externe. Depuis l'app installée sur l'écran d'accueil,
 * iOS l'ouvre dans Safari, par-dessus : l'app reste intacte en arrière-plan
 * et on y revient d'un geste, toujours en plein écran.
 */
export function ExternalLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
