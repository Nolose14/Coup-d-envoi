import { COMPETITION_COLORS } from "@/config/competitions";
import { formatTime } from "@/lib/dates";
import type { MatchItem, TeamInfo } from "@/lib/types";
import { ExternalLink } from "./ExternalLink";
import { TeamLogo } from "./TeamLogo";

const LIVE_MS = 2 * 3600_000;

/** Moitié d'affiche : écusson, nom, et la couleur du club en liseré. */
function TeamPanel({ team, accent }: { team: TeamInfo; accent: string }) {
  return (
    <div
      className={`flex min-w-0 flex-col items-center gap-2 bg-surface px-2 pb-3 pt-3.5`}
      style={{ boxShadow: `inset 0 -3px 0 ${team.color ?? accent}` }}
    >
      <TeamLogo src={team.logo} name={team.name} />
      <span className="font-display w-full truncate text-center text-[16px] font-medium leading-tight">{team.name}</span>
    </div>
  );
}

export function MatchCard({ match, index }: { match: MatchItem; index: number }) {
  const color = COMPETITION_COLORS[match.competition] ?? "#8E8E93";
  const start = new Date(match.kickoff).getTime();
  const now = Date.now();
  const live = now >= start && now < start + LIVE_MS;
  const place = [match.venue.stadium, match.venue.city].filter(Boolean).join(", ");

  return (
    <article
      className="animate-card-in overflow-hidden rounded-[14px] bg-surface-2"
      style={{ animationDelay: `${Math.min(index, 8) * 25}ms`, boxShadow: "inset 0 0 0 1px var(--color-separator)" }}
    >
      {/* Bandeau compétition + diffuseur */}
      <header className="flex items-center justify-between gap-3 py-2 pl-0 pr-2.5">
        <p className="flex min-w-0 items-center gap-2.5">
          <span className="h-5 w-1 shrink-0 rounded-r-sm" style={{ backgroundColor: color }} aria-hidden />
          <span className="font-display truncate text-[13px] font-medium" style={{ color }}>
            {match.competitionName}
          </span>
          {match.stageLabel && (
            <span className="truncate text-[12px] text-label-3">{match.stageLabel}</span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {live && (
            <span className="font-display flex items-center gap-1 rounded-[4px] bg-live px-1.5 py-0.5 text-[11px] font-semibold text-white">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              En cours
            </span>
          )}
          {match.broadcasters.length === 0 ? (
            <span className="text-[11px] text-label-3">Chaîne non communiquée</span>
          ) : (
            match.broadcasters.map((b) => {
              const badge = "font-display rounded-[4px] bg-white px-2 py-0.5 text-[12px] font-semibold text-bg";
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

      {/* Affiche : équipe | heure | équipe */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-px">
        <TeamPanel team={match.home} accent={`${color}55`} />
        <div className="flex min-w-[88px] flex-col items-center justify-center bg-bg px-2">
          <time dateTime={match.kickoff} className="font-display text-[30px] font-semibold leading-none tabular-nums">
            {formatTime(match.kickoff)}
          </time>
          {!match.timeConfirmed && <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-warning">Provisoire</span>}
        </div>
        <TeamPanel team={match.away} accent={`${color}55`} />
      </div>

      {place && (
        <p className="flex items-center justify-center gap-1 px-3 py-2 text-[12px] text-label-2">
          <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
          <span className="truncate">{place}</span>
        </p>
      )}
    </article>
  );
}
