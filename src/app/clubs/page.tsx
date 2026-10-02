import { MatchesView } from "@/components/MatchesView";
import { CLUB_COMPETITIONS, TSDB_CLUB_COMPETITIONS } from "@/config/competitions";

export default function ClubsPage() {
  return (
    <MatchesView
      section="clubs"
      title="Clubs"
      filters={[
        { id: "all", label: "Tout" },
        ...[...CLUB_COMPETITIONS.slice(0, 2), ...TSDB_CLUB_COMPETITIONS, ...CLUB_COMPETITIONS.slice(2)].map((c) => ({
          id: c.id,
          label: c.short,
        })),
      ]}
    />
  );
}
