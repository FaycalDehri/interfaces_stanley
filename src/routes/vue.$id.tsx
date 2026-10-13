import { createFileRoute } from "@tanstack/react-router";
import { ViewCanvas, useMounted } from "@/lib/frame";
import { VIEWS } from "@/lib/views";
import type { ViewId } from "@/lib/layouts";

// Aperçu d'une vue seule, en entier (une vue large est affichée sur toute sa largeur).
export const Route = createFileRoute("/vue/$id")({
  head: () => ({ meta: [{ title: "Stanley · vue" }] }),
  component: () => {
    const { id } = Route.useParams();
    const mounted = useMounted();
    if (!(id in VIEWS)) return <div style={{ padding: 40, color: "white" }}>Vue inconnue : {id}</div>;
    return <div style={{ position: "fixed", inset: 0 }}>{mounted && <ViewCanvas view={id as ViewId} />}</div>;
  },
});
