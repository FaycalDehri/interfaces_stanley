import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Face, useMounted } from "@/lib/frame";
import { useStanley, post, syncUrl } from "@/lib/store";
import { MODE_LABEL, PHASE_LABEL, type Mode, type Phase } from "@/lib/contract";

// Page de démonstration (régie provisoire). Ce n'est PAS le pavé tactile :
// celui-ci n'existe qu'en maquettes dans le cahier des charges (§8).
export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [{ title: "Stanley · démo" }] }),
  component: Demo,
});

const btn = "rounded-md border px-3 py-2 text-sm transition hover:border-[color:var(--accent)]";
const on = "border-[color:var(--accent)] bg-[color:var(--accent)]/15 text-[color:var(--text-high)]";
const off = "border-[color:var(--border)] text-[color:var(--text-body)]";

function Demo() {
  const mounted = useMounted();
  const { state, connection } = useStanley();
  const [msg, setMsg] = useState("");
  const [csv, setCsv] = useState("type,team,challenge\nsolve,t2,c4\n");
  if (!mounted) return null;
  const ex = state.exercise;
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const run = async (p: Promise<unknown>) => { try { setMsg(JSON.stringify(await p)); } catch (e) { setMsg(`Échec : ${String(e)} (serveur de synchro lancé ?)`); } };
  const ctrl = (c: object) => run(post("/api/control", c));
  const ev = (e: object) => run(post("/api/events", e));
  const team = () => pick(state.teams.items).id;
  const node = () => pick(state.topology.nodes).id;
  const origin = window.location.origin;

  return (
    <div className="grid h-screen grid-cols-[440px_1fr] bg-[var(--bg-base)] text-[color:var(--text-body)]">
      <aside className="flex flex-col gap-5 overflow-y-auto border-r border-[color:var(--border)] p-5">
        <div>
          <h1 className="font-display text-xl font-bold text-[color:var(--text-high)]">Démo de la tour</h1>
          <p className="text-sm">Serveur : <span className="font-mono">{syncUrl()}</span> · <b style={{ color: connection === "en-ligne" ? "var(--flag)" : "var(--sev-high)" }}>{connection}</b></p>
        </div>

        <section className="space-y-2">
          <h2 className="font-semibold text-[color:var(--text-high)]">Proposition</h2>
          <div className="flex gap-2">{(["A", "B", "C"] as const).map((p) => <button key={p} className={`${btn} ${state.display.proposition === p ? on : off}`} onClick={() => ctrl({ proposition: p })}>{p}</button>)}</div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[color:var(--text-high)]">Mode</h2>
          <div className="flex flex-col gap-2">{(Object.keys(MODE_LABEL) as Mode[]).map((m) => <button key={m} className={`${btn} text-left ${ex.mode === m ? on : off}`} onClick={() => ctrl({ mode: m })}>{MODE_LABEL[m]}</button>)}</div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[color:var(--text-high)]">Phase</h2>
          <div className="flex flex-wrap gap-2">{(Object.keys(PHASE_LABEL) as Phase[]).map((p) => <button key={p} className={`${btn} ${ex.phase === p ? on : off}`} onClick={() => ctrl({ phase: p })}>{PHASE_LABEL[p]}</button>)}</div>
          <p className="text-xs text-[color:var(--text-muted)]">« Avant » lance un compte à rebours de 5 min. La proposition C change d'affichage avant et après la partie.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[color:var(--text-high)]">Envoyer un événement</h2>
          <div className="flex flex-wrap gap-2">
            {ex.mode === "ctf" && <button className={`${btn} ${off}`} onClick={() => ev({ type: "solve", team: team(), challenge: pick(state.challenges.items.filter((c) => c.status === "ouvert")).id })}>Flag validé</button>}
            {ex.mode === "ad-pvp" && <>
              <button className={`${btn} ${off}`} onClick={() => { const n = node(); ev([{ type: "attack", team: team(), target: n }, { type: "alert", title: `Activité suspecte sur ${n}`, target: n, severity: "haute", public: true }]); }}>Attaque</button>
              <button className={`${btn} ${off}`} onClick={() => { const i = state.incidents.items.find((x) => !x.detectedAt); if (i) ev({ type: "detect", id: i.id }); else setMsg("Aucune attaque en cours"); }}>Détection</button>
            </>}
            {ex.mode === "ad-ia" && <button className={`${btn} ${off}`} onClick={() => { const t = team(); const best = Math.max(-1, ...state.chain.reached.filter((r) => r.team === t).map((r) => r.step)); if (best < state.chain.steps.length - 1) ev({ type: "step", team: t, step: best + 1 }); }}>Étape franchie</button>}
            <button className={`${btn} ${off}`} onClick={() => ev({ type: "alert", title: "Alerte de test envoyée depuis la démo", severity: "critique", public: true })}>Alerte IA</button>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-[color:var(--text-high)]">Envoyer du CSV</h2>
          <textarea className="h-24 w-full rounded-md border border-[color:var(--border)] bg-[var(--bg-elevated)] p-2 font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} />
          <button className={`${btn} ${off}`} onClick={() => run(post("/api/events", csv, true))}>POST /api/events (CSV)</button>
        </section>

        <section className="space-y-2">
          <button className={`${btn} ${off}`} onClick={() => ctrl({ reset: true })}>Remettre le jeu d'essai</button>
          <p className="break-all font-mono text-xs text-[color:var(--text-muted)]">{msg}</p>
        </section>

        <section className="space-y-1">
          <h2 className="font-semibold text-[color:var(--text-high)]">URL de chaque Raspberry Pi</h2>
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="font-mono text-xs">Pi {i + 1} · rangée {Math.ceil((i + 1) / 2)} {i % 2 ? "droite" : "gauche"} → {origin}/pos/{i + 1}</div>)}
        </section>
      </aside>
      <main className="flex min-h-0 p-4"><Face /></main>
    </div>
  );
}
