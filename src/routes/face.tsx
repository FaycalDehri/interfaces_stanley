import { createFileRoute } from "@tanstack/react-router";
import { Face, query, useMounted } from "@/lib/frame";
import type { Proposition } from "@/lib/contract";

// Aperçu d'une face complète de la tour (8 positions). ?prop=A|B|C pour forcer une proposition.
export const Route = createFileRoute("/face")({
  head: () => ({ meta: [{ title: "Stanley · une face" }] }),
  component: () => {
    const mounted = useMounted();
    return (
      <div style={{ position: "fixed", inset: 0, display: "flex", background: "#000" }}>
        {mounted && <Face prop={query("prop") as Proposition | null} />}
      </div>
    );
  },
});
