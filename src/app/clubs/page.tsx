import { MatchesView } from "@/components/MatchesView";
import { CLUB_COMPETITIONS } from "@/config/competitions";

export default function ClubsPage() {
  return (
    <MatchesView
      section="clubs"
      title="Clubs"
      filters={[
        { id: "all", label: "Tout" },
        ...CLUB_COMPETITIONS.map((c) => ({ id: c.id, label: c.short })),
      ]}
    />
  );
}
