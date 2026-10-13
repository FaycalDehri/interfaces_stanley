import { createFileRoute } from "@tanstack/react-router";
import { Position, query, useMounted } from "@/lib/frame";
import type { Proposition } from "@/lib/contract";

// URL à ouvrir sur chaque Raspberry Pi : /pos/1 … /pos/8
// Options : ?prop=A|B|C (sinon celle choisie en régie), ?badge=0, ?sync=http://ip:8787
export const Route = createFileRoute("/pos/$n")({
  head: () => ({ meta: [{ title: "Stanley · écran" }] }),
  component: PosPage,
});

function PosPage() {
  const { n } = Route.useParams();
  const mounted = useMounted();
  const num = Math.min(8, Math.max(1, Number(n) || 1));
  if (!mounted) return <div style={{ position: "fixed", inset: 0, background: "var(--bg-base)" }} />;
  return (
    <div style={{ position: "fixed", inset: 0, cursor: "none" }}>
      <Position n={num} prop={query("prop") as Proposition | null} />
    </div>
  );
}
