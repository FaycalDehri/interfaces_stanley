import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Stanley · écrans de la tour" }] }),
  component: Hub,
});

const VUES = ["accueil", "acces", "chrono", "fil", "classement", "progression", "epreuves", "carte", "arene", "classement-large", "depart", "equipes", "regles", "rgpd", "acces-large", "stats", "premiers", "temps-forts", "podium"];

function Hub() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-10 text-[color:var(--text-body)]">
      <div>
        <h1 className="font-display text-3xl font-bold text-[color:var(--text-high)]">Stanley · écrans de la tour</h1>
        <p className="mt-2">Groupe 8. Voir README.md pour la mise en place sur la tour.</p>
      </div>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[color:var(--text-high)]">Démo</h2>
        <Link to="/demo" className="text-[color:var(--accent)] underline">Page de démo (pilotage + aperçu d'une face)</Link>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[color:var(--text-high)]">Une face de la tour</h2>
        <div className="flex gap-4">{["A", "B", "C"].map((p) => <a key={p} href={`/face?prop=${p}`} className="text-[color:var(--accent)] underline">Proposition {p}</a>)}<a href="/face" className="text-[color:var(--accent)] underline">Proposition choisie en régie</a></div>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[color:var(--text-high)]">Écrans (un par Raspberry Pi)</h2>
        <div className="flex flex-wrap gap-4">{Array.from({ length: 8 }, (_, i) => <a key={i} href={`/pos/${i + 1}`} className="font-mono text-[color:var(--accent)] underline">/pos/{i + 1}</a>)}</div>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[color:var(--text-high)]">Vues seules</h2>
        <div className="flex flex-wrap gap-3">{VUES.map((v) => <a key={v} href={`/vue/${v}`} className="font-mono text-sm text-[color:var(--accent)] underline">{v}</a>)}</div>
      </section>
    </main>
  );
}
