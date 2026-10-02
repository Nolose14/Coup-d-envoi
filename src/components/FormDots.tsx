import type { ResultLetter } from "@/lib/types";

export const RESULT_COLORS: Record<ResultLetter, string> = { V: "#30D158", N: "#8E8E93", D: "#FF453A" };
const LABELS: Record<ResultLetter, string> = { V: "Victoire", N: "Nul", D: "Défaite" };

/** Forme sur les derniers matchs : le plus récent à droite, légèrement souligné. */
export function FormDots({ form, size = 16 }: { form: ResultLetter[]; size?: number }) {
  const ordered = [...form].reverse();
  if (ordered.length === 0) return <span className="text-[12px] text-label-3">–</span>;
  return (
    <span className="flex items-center gap-[3px]" aria-label={`Forme : ${ordered.map((r) => LABELS[r]).join(", ")}`}>
      {ordered.map((r, i) => (
        <span
          key={i}
          className="flex items-center justify-center rounded-full font-bold text-white"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.56,
            backgroundColor: RESULT_COLORS[r],
            boxShadow: i === ordered.length - 1 ? "0 0 0 1.5px #000, 0 0 0 3px rgb(255 255 255 / 0.35)" : undefined,
          }}
        >
          {r}
        </span>
      ))}
    </span>
  );
}
