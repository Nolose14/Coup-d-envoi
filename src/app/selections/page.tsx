import { MatchesView } from "@/components/MatchesView";

export default function SelectionsPage() {
  return (
    <MatchesView
      section="selections"
      title="Sélections"
      filters={[
        { id: "all", label: "Tout" },
        { id: "france", label: "Équipe de France" },
        { id: "NL", label: "Ligue des nations" },
        { id: "FRIENDLY", label: "Amicaux" },
      ]}
    />
  );
}
