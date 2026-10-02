/** Bandeau de date : « VEN 09 OCT » façon programme TV. */
const TZ = "Europe/Paris";
const weekday = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short" });
const month = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, month: "short" });

export function DayHeader({ dayKey, label, count }: { dayKey: string; label: string; count: number }) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const special = label === "Aujourd'hui" || label === "Demain";
  return (
    <div className="mb-2.5 flex items-end justify-between px-1">
      <div className="flex items-end gap-2.5">
        <span className="font-display text-[34px] font-semibold leading-[0.85] tabular-nums">{String(d).padStart(2, "0")}</span>
        <span className="flex flex-col leading-tight">
          <span className={`font-display text-[13px] font-medium ${special ? "text-accent" : "text-label-2"}`}>
            {special ? label : weekday.format(date).replace(".", "")}
          </span>
          <span className="font-display text-[13px] font-medium text-label-3">{month.format(date).replace(".", "")}</span>
        </span>
      </div>
      <span className="text-[12px] text-label-3">
        {count} match{count > 1 ? "s" : ""}
      </span>
    </div>
  );
}
