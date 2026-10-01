import { COMPETITION_COLORS } from "@/config/competitions";
import { formatTime } from "@/lib/dates";
import type { MatchItem } from "@/lib/types";
import { ExternalLink } from "./ExternalLink";
import { TeamLogo } from "./TeamLogo";

export function MatchCard({ match, index }: { match: MatchItem; index: number }) {
  const place = [match.venue.stadium, match.venue.city].filter(Boolean).join(", ");

  return (
    <article
      className="animate-card-in rounded-2xl bg-surface px-4 pb-3.5 pt-3 transition-transform duration-150 active:scale-[0.985]"
      style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
    >
      {/* Compétition + diffuseurs */}
      <header className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-[13px] text-label-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: COMPETITION_COLORS[match.competition] ?? "#8E8E93" }}
          />
          <span className="truncate">
            <span className="font-medium text-label">{match.competitionName}</span>
            {match.stageLabel && <span>, {match.stageLabel.toLowerCase()}</span>}
          </span>
        </p>
        <div className="flex shrink-0 gap-1.5">
          {match.broadcasters.length === 0 ? (
            <span className="text-[12px] text-label-3">Chaîne non communiquée</span>
          ) : (
            match.broadcasters.map((b) => {
              const badge = "rounded-md bg-surface-2 px-2 py-0.5 text-[12px] font-semibold text-label";
              return b.url ? (
                <ExternalLink key={b.name} href={b.url} className={`${badge} active:opacity-60`}>
                  {b.name}
                </ExternalLink>
              ) : (
                <span key={b.name} className={badge}>{b.name}</span>
              );
            })
          )}
        </div>
      </header>

      {/* Affiche */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <TeamLogo src={match.home.logo} name={match.home.name} />
          <span className="w-full truncate text-[15px] font-semibold leading-tight">{match.home.name}</span>
        </div>

        <div className="flex flex-col items-center">
          <time dateTime={match.kickoff} className="text-[28px] font-bold leading-none tracking-tight tabular-nums">
            {formatTime(match.kickoff)}
          </time>
          {!match.timeConfirmed && <span className="mt-1 text-[11px] text-warning">Horaire provisoire</span>}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <TeamLogo src={match.away.logo} name={match.away.name} />
          <span className="w-full truncate text-[15px] font-semibold leading-tight">{match.away.name}</span>
        </div>
      </div>

      {/* Lieu */}
      {place && (
        <p className="mt-3 flex items-center justify-center gap-1 text-[13px] text-label-2">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
          <span className="truncate">{place}</span>
        </p>
      )}
    </article>
  );
}
