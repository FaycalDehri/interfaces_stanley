// ============================================================================
// Vues de la tour. Conçues à la taille réelle des écrans : 1920×1080, ou
// 3840×1080 pour une vue large répartie sur deux écrans.
// Règles de lisibilité (cahier §3.2) : texte ≥ 32 px, chiffres clés ≥ 120 px,
// un message principal par écran, statut toujours écrit en toutes lettres.
// ============================================================================
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import stanleyLogo from "@/assets/stanley-logo.png";
import opcoLogo from "@/assets/opco-atlas-logo.png";
import { MODE_LABEL, PHASE_LABEL, TACTICS, TACTIC_ORDER, type NetNode, type Severity, type StanleyState } from "./contract";
import { useNow, useStanley } from "./store";
import { ago, ctfProgress, fmtDuration, fmtTime, incidentPoints, rankCtf, rankIa, rankPvp } from "./scoring";
import type { ViewId } from "./layouts";

const C = {
  accent: "var(--accent)", ok: "var(--flag)", text: "var(--text-high)", body: "var(--text-body)", muted: "var(--text-muted)", faint: "var(--text-faint)",
  card: "var(--bg-elevated)", line: "var(--border)", warn: "var(--sev-medium)", high: "var(--sev-high)", crit: "var(--sev-critical)", low: "var(--sev-low)",
};
const SEV: Record<Severity, string> = { faible: C.low, moyenne: C.warn, haute: C.high, critique: C.crit };
const mono = "var(--font-mono)";
const display = "var(--font-display)";

/** Vue large : deux moitiés de 1920 px, rien ne traverse la jonction entre les écrans. */
function Halves({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1728px 1728px", columnGap: 192 }}>
      <div style={{ minWidth: 0, height: "100%" }}>{left}</div>
      <div style={{ minWidth: 0, height: "100%" }}>{right}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ margin: "auto", fontSize: 40, color: C.faint, textAlign: "center" }}>{text}</div>;
}

// ------------------------------------------------------------------ Accueil
function Accueil() {
  const { state } = useStanley();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48 }}>
      <img src={stanleyLogo} alt="Stanley" style={{ height: 420 }} />
      <div style={{ fontFamily: display, fontSize: 64, fontWeight: 700, color: C.text }}>{state.exercise.name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <span style={{ fontSize: 32, color: C.muted }}>Partenaire</span>
        <div style={{ background: "white", borderRadius: 16, padding: "16px 32px" }}><img src={opcoLogo} alt="OPCO Atlas" style={{ height: 80 }} /></div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Accès
function useQr(url: string | null) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    if (!url) return setSvg(null);
    QRCode.toString(url, { type: "svg", margin: 1 }).then(setSvg);
  }, [url]);
  return svg;
}
function Acces({ large = false }: { large?: boolean }) {
  const { state } = useStanley();
  const a = state.exercise.access;
  const qr = useQr(a.url);
  const size = large ? 760 : 520;
  if (large) {
    return (
      <Halves
        left={<div style={{ height: "100%", display: "grid", placeItems: "center" }}>{qr ? <div style={{ width: size, height: size, background: "white", borderRadius: 16, padding: 16 }} dangerouslySetInnerHTML={{ __html: qr }} /> : <div style={{ width: size, height: size, border: `4px dashed ${C.warn}`, borderRadius: 16, display: "grid", placeItems: "center", textAlign: "center", fontSize: 48, color: C.warn, padding: 48 }}>QR code affiché dès que l'adresse est connue</div>}</div>}
        right={<div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 44 }}>{([["Adresse", a.url], ["Réseau", a.network], ["Support", a.support], ["Format de flag", a.flagFormat]] as [string, string | null][]).map(([k, v]) => <div key={k}><div style={{ fontSize: 40, color: C.muted }}>{k}</div><div style={{ fontFamily: mono, fontSize: 72, color: v ? C.text : C.warn }}>{v ?? "à définir"}</div></div>)}</div>}
      />
    );
  }
  const rows: [string, string | null][] = [["Adresse", a.url], ["Réseau", a.network], ["Support", a.support], ["Format de flag", a.flagFormat]];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", gap: large ? 160 : 72, padding: large ? "0 240px" : "0 48px" }}>
      {qr ? (
        <div style={{ width: size, height: size, background: "white", borderRadius: 16, padding: 16, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: qr }} />
      ) : (
        <div style={{ width: size, height: size, flexShrink: 0, border: `4px dashed ${C.warn}`, borderRadius: 16, display: "grid", placeItems: "center", textAlign: "center", fontSize: 36, color: C.warn, padding: 32 }}>QR code affiché dès que l'adresse est connue</div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: large ? 48 : 32 }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: large ? 40 : 32, color: C.muted }}>{k}</div>
            <div style={{ fontFamily: mono, fontSize: large ? 72 : 48, color: v ? C.text : C.warn }}>{v ?? "à définir"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Chrono / départ
function Chrono() {
  const { state } = useStanley();
  const now = useNow(250);
  const ex = state.exercise;
  const start = Date.parse(ex.startsAt), end = Date.parse(ex.endsAt);
  if (ex.phase === "avant") return <Depart />;
  const done = ex.phase === "termine" || now >= end;
  const left = (end - now) / 1000;
  const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
  const urgent = !done && (ex.phase === "derniere-heure" || left < 3600);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
      <div style={{ fontSize: 56, color: urgent ? C.high : C.muted, fontWeight: 600 }}>{done ? "Partie terminée" : PHASE_LABEL[ex.phase]}</div>
      <div style={{ fontFamily: mono, fontSize: 300, fontWeight: 700, lineHeight: 1, color: urgent ? C.high : C.text, fontVariantNumeric: "tabular-nums" }}>
        {done ? fmtDuration((Math.min(now, end) - start) / 1000) : fmtDuration(left)}
      </div>
      <div style={{ fontSize: 36, color: C.muted }}>{done ? "durée de la partie" : "temps restant"}</div>
      {!done && (
        <div style={{ width: 1400, height: 24, borderRadius: 12, background: C.card }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 12, background: urgent ? C.high : C.accent }} />
        </div>
      )}
    </div>
  );
}
function Depart() {
  const { state } = useStanley();
  const now = useNow(250);
  const left = (Date.parse(state.exercise.startsAt) - now) / 1000;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
      <div style={{ fontSize: 56, color: C.muted }}>Départ dans</div>
      <div style={{ fontFamily: mono, fontSize: 300, fontWeight: 700, lineHeight: 1, color: C.text }}>{left > 0 ? fmtDuration(left).slice(3) : "00:00"}</div>
      <div style={{ fontSize: 44, color: C.accent }}>{MODE_LABEL[state.exercise.mode]}</div>
    </div>
  );
}

// ------------------------------------------------------------------ Fil d'événements
interface FeedItem { at: string; text: string; tag?: string; tagColor?: string; right?: string }
function feed(s: StanleyState): FeedItem[] {
  const team = Object.fromEntries(s.teams.items.map((t) => [t.id, t.name]));
  const node = Object.fromEntries(s.topology.nodes.map((n) => [n.id, n.label]));
  const chal = Object.fromEntries(s.challenges.items.map((c) => [c.id, c.name]));
  const alerts: FeedItem[] = s.alerts.items.filter((a) => a.public).map((a) => ({ at: a.at, text: a.title, tag: `Alerte ${a.severity}`, tagColor: SEV[a.severity] }));
  let items: FeedItem[] = [];
  if (s.exercise.mode === "ctf") {
    items = s.solves.items.map((x) => ({ at: x.at, text: `${team[x.team] ?? x.team} valide « ${chal[x.challenge] ?? x.challenge} »`, tag: x.firstBlood ? "Premier" : undefined, tagColor: C.crit, right: `+${x.points}` }));
  } else if (s.exercise.mode === "ad-pvp") {
    for (const i of s.incidents.items) {
      items.push({ at: i.startedAt, text: `Attaque sur ${node[i.target] ?? i.target} (${team[i.team] ?? i.team})`, tag: "Attaque", tagColor: C.crit });
      if (i.detectedAt) items.push({ at: i.detectedAt, text: `${team[i.team] ?? i.team} détecte l'attaque sur ${node[i.target] ?? i.target}`, tag: "Détection", tagColor: C.ok, right: `+${incidentPoints(i.startedAt, i.detectedAt)}` });
    }
    items.push(...alerts);
  } else {
    items = s.chain.reached.map((r) => ({ at: r.at, text: `${team[r.team] ?? r.team} atteint « ${s.chain.steps[r.step]?.label ?? r.step} »`, tag: r.step === s.chain.steps.length - 1 ? "Objectif" : `Étape ${r.step + 1}`, tagColor: r.step === s.chain.steps.length - 1 ? C.ok : C.accent }));
    items.push(...alerts);
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
function Fil() {
  const { state } = useStanley();
  const items = feed(state).slice(0, 5);
  if (!items.length) return <Empty text="Aucun événement pour l'instant" />;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 20, justifyContent: "center" }}>
      {items.map((f, i) => (
        <div key={f.at + f.text} style={{ display: "flex", alignItems: "center", gap: 28, padding: "20px 32px", borderRadius: 12, background: i === 0 ? "color-mix(in oklab, var(--accent) 14%, transparent)" : C.card, border: `2px solid ${i === 0 ? C.accent : "transparent"}`, fontSize: i === 0 ? 44 : 36, animation: i === 0 ? "stanley-in .5s ease-out" : undefined }}>
          <span style={{ fontFamily: mono, color: C.faint }}>{fmtTime(f.at)}</span>
          {f.tag && <span style={{ fontSize: 28, fontWeight: 700, color: f.tagColor, border: `2px solid ${f.tagColor}`, borderRadius: 8, padding: "2px 12px", whiteSpace: "nowrap" }}>{f.tag}</span>}
          <span style={{ color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.text}</span>
          {f.right && <span style={{ fontFamily: mono, fontWeight: 700, color: C.ok }}>{f.right}</span>}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Classement
function RankNum({ n }: { n: number }) {
  return <span style={{ fontFamily: mono, fontSize: 120, fontWeight: 700, width: 140, color: n === 1 ? C.accent : C.muted }}>{n}</span>;
}
function Classement({ compact = false }: { compact?: boolean }) {
  const { state } = useStanley();
  const now = useNow(10000);
  const mode = state.exercise.mode;
  const rowStyle = { display: "flex", alignItems: "center", gap: 40, padding: compact ? "8px 0" : "16px 0", borderBottom: `2px solid ${C.line}` } as const;
  const name = (n: string, first: boolean) => <span style={{ fontFamily: display, fontSize: 80, fontWeight: 700, color: first ? C.text : C.body, flex: 1 }}>{n}</span>;
  if (mode === "ctf") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {rankCtf(state).map((r) => (
          <div key={r.team.id} style={rowStyle}>
            <RankNum n={r.rank} />
            {name(r.team.name, r.rank === 1)}
            <span style={{ fontSize: 36, color: C.muted, width: 320 }}>{r.flags} flag{r.flags > 1 ? "s" : ""}<br /><span style={{ fontSize: 32 }}>{ago(r.last, now)}</span></span>
            <span style={{ fontFamily: mono, fontSize: 120, fontWeight: 700, color: r.rank === 1 ? C.accent : C.text, minWidth: 360, textAlign: "right" }}>{r.score}</span>
          </div>
        ))}
      </div>
    );
  }
  if (mode === "ad-pvp") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {rankPvp(state).map((r) => (
          <div key={r.team.id} style={rowStyle}>
            <RankNum n={r.rank} />
            {name(r.team.name, r.rank === 1)}
            <span style={{ fontSize: 36, color: C.muted, width: 420 }}>
              {r.detected}/{r.attacks} détectées<br />
              <span style={{ fontSize: 32, color: r.pending ? C.crit : C.muted }}>{r.pending ? `${r.pending} en cours` : r.avgMin != null ? `${Math.round(r.avgMin)} min en moyenne` : "—"}</span>
            </span>
            <span style={{ fontFamily: mono, fontSize: 120, fontWeight: 700, color: r.rank === 1 ? C.accent : C.text, minWidth: 300, textAlign: "right" }}>{r.score}</span>
          </div>
        ))}
      </div>
    );
  }
  const steps = state.chain.steps;
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      {rankIa(state).map((r) => (
        <div key={r.team.id} style={rowStyle}>
          <RankNum n={r.rank} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: display, fontSize: 80, fontWeight: 700, color: r.rank === 1 ? C.text : C.body }}>{r.team.name}</div>
            <div style={{ fontSize: 40, color: r.won ? C.ok : C.muted }}>{r.step < 0 ? "pas encore commencé" : r.won ? "Objectif atteint" : steps[r.step].label}</div>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {steps.map((_, i) => <span key={i} style={{ width: 56, height: 56, borderRadius: 28, background: i <= r.step ? (r.won ? C.ok : C.accent) : C.card, border: `2px solid ${C.line}` }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClassementLarge() {
  const { state } = useStanley();
  const now = useNow(1000);
  const left = (Date.parse(state.exercise.endsAt) - now) / 1000;
  return (
    <Halves left={<Classement />} right={
      <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 32, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 32 }}>
          <span style={{ fontSize: 40, color: C.muted }}>Temps restant</span>
          <span style={{ fontFamily: mono, fontSize: 96, fontWeight: 700, color: left < 3600 ? C.high : C.text }}>{fmtDuration(left)}</span>
        </div>
        <Progression />
      </div>
    } />
  );
}

// ------------------------------------------------------------------ Progression
function Progression() {
  const { state } = useStanley();
  const mode = state.exercise.mode;
  if (mode === "ctf") {
    const { tactics, rows } = ctfProgress(state);
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: `260px repeat(${tactics.length}, 1fr)`, gap: 12, fontSize: 28, color: C.muted, textAlign: "center" }}>
          <span />{tactics.map((t) => <span key={t}>{TACTICS[t]}</span>)}
        </div>
        {rows.map((r) => (
          <div key={r.team.id} style={{ display: "grid", gridTemplateColumns: `260px repeat(${tactics.length}, 1fr)`, gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: C.text }}>{r.team.name}</span>
            {r.values.map((v, i) => (
              <div key={i} style={{ height: 110, borderRadius: 10, display: "grid", placeItems: "center", fontSize: 36, fontWeight: 700, background: v >= 1 ? C.accent : v > 0 ? "color-mix(in oklab, var(--accent) 45%, var(--bg-elevated))" : C.card, color: v >= 1 ? "var(--bg-base)" : v > 0 ? C.text : C.faint }}>
                {v >= 1 ? "fait" : v > 0 ? `${Math.round(v * 100)} %` : "—"}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (mode === "ad-ia") {
    const steps = state.chain.steps;
    const rows = rankIa(state);
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: `260px repeat(${steps.length}, 1fr)`, gap: 12, fontSize: 28, color: C.muted, textAlign: "center" }}>
          <span />{steps.map((s) => <span key={s.label}>{s.label}</span>)}
        </div>
        {rows.map((r) => (
          <div key={r.team.id} style={{ display: "grid", gridTemplateColumns: `260px repeat(${steps.length}, 1fr)`, gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 44, fontWeight: 700, color: C.text }}>{r.team.name}</span>
            {steps.map((_, i) => (
              <div key={i} style={{ height: 110, borderRadius: 10, display: "grid", placeItems: "center", fontSize: 36, fontWeight: 700, background: i <= r.step ? C.accent : C.card, color: i <= r.step ? "var(--bg-base)" : C.faint }}>{i <= r.step ? "atteint" : "—"}</div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  const rows = rankPvp(state);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 40 }}>
      {rows.map((r) => (
        <div key={r.team.id}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 44, color: C.text, marginBottom: 12 }}>
            <b>{r.team.name}</b><span style={{ color: C.muted }}>{r.detected} détectées sur {r.attacks}</span>
          </div>
          <div style={{ height: 48, borderRadius: 24, background: C.card, overflow: "hidden" }}>
            <div style={{ width: `${r.attacks ? (r.detected / r.attacks) * 100 : 0}%`, height: "100%", background: C.ok }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Épreuves / objectifs
function Epreuves({ large = false }: { large?: boolean }) {
  const { state } = useStanley();
  const mode = state.exercise.mode;
  const team = Object.fromEntries(state.teams.items.map((t) => [t.id, t.name]));
  if (mode === "ctf") {
    const tactics = TACTIC_ORDER.filter((t) => state.challenges.items.some((c) => c.tactic === t));
    const board = (list: string[]) => (
      <div style={{ height: "100%", display: "grid", gridTemplateColumns: `repeat(${Math.max(1, list.length)}, 1fr)`, gap: large ? 32 : 16 }}>
        {list.map((t) => (
          <div key={t} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <div style={{ fontSize: large ? 40 : 30, fontWeight: 700, color: C.accent, minHeight: large ? 100 : 80 }}>{TACTICS[t] ?? t}</div>
            {state.challenges.items.filter((c) => c.tactic === t).map((c) => {
              const by = state.solves.items.filter((x) => x.challenge === c.id).map((x) => team[x.team] ?? x.team);
              const locked = c.status === "verrouille";
              return (
                <div key={c.id} style={{ flex: 1, borderRadius: 12, padding: large ? 32 : 18, background: C.card, opacity: locked ? 0.55 : 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ fontSize: large ? 48 : 32, fontWeight: 700, color: C.text }}>{locked ? "Verrouillée" : c.name}</div>
                  <div style={{ fontFamily: mono, fontSize: large ? 56 : 40, color: C.text }}>{c.points} pts</div>
                  <div style={{ fontSize: large ? 36 : 28, color: by.length ? C.ok : C.faint }}>{by.length ? `Réussie : ${by.join(", ")}` : "Pas encore réussie"}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
    if (!large) return board(tactics);
    const cut = Math.ceil(tactics.length / 2);
    return <Halves left={board(tactics.slice(0, cut))} right={board(tactics.slice(cut))} />;
  }
  if (mode === "ad-ia") {
    const rows = rankIa(state);
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
        <div style={{ fontSize: 36, color: C.muted }}>Chaîne d'attaque du scénario</div>
        {state.chain.steps.map((s, i) => {
          const at = rows.filter((r) => r.step >= i).map((r) => r.team.name);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 44 }}>
              <span style={{ fontFamily: mono, color: C.faint, width: 60 }}>{i + 1}</span>
              <span style={{ color: C.text, flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 36, color: at.length ? C.ok : C.faint }}>{at.length ? at.join(", ") : "—"}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
      <div style={{ fontSize: 36, color: C.muted }}>Machines à défendre</div>
      {state.topology.nodes.map((n) => (
        <div key={n.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 48, borderBottom: `2px solid ${C.line}`, paddingBottom: 12 }}>
          <span style={{ color: C.text }}>{n.label}</span><span style={{ color: nodeColor(n, true) }}>{n.status}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Carte réseau
function nodeColor(n: NetNode, live: boolean) {
  if (!live) return C.muted;
  return n.status === "attaque" ? C.high : n.status === "compromis" ? C.crit : n.status === "hors-ligne" ? C.faint : C.ok;
}
function Carte({ large = false }: { large?: boolean }) {
  const { state } = useStanley();
  const live = state.exercise.mode !== "ctf"; // en CTF la carte est un décor (découpage initial)
  const nodes = state.topology.nodes.map((n, i, all) => (n.x != null && n.y != null ? n : { ...n, x: 50 + 38 * Math.cos((i / all.length) * 2 * Math.PI), y: 50 + 38 * Math.sin((i / all.length) * 2 * Math.PI) }));
  const pos = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const W = large ? 1728 : 1728, H = 900;
  const alerts = state.alerts.items.filter((a) => a.public).slice(0, 3);
  return (
    <div style={{ height: "100%", display: "flex", gap: 192 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
        {state.topology.links.map((l, i) => {
          const a = pos[l.from], b = pos[l.to];
          if (!a || !b) return null;
          return <line key={i} x1={(a.x! / 100) * W} y1={(a.y! / 100) * H} x2={(b.x! / 100) * W} y2={(b.y! / 100) * H} stroke="var(--border)" strokeWidth={6} />;
        })}
        {nodes.map((n) => {
          const x = (n.x! / 100) * W, y = (n.y! / 100) * H, col = nodeColor(n, live);
          return (
            <g key={n.id}>
              {live && n.status === "attaque" && <circle cx={x} cy={y} r={70} fill="none" stroke={col} strokeWidth={4} className="stanley-pulse" />}
              <circle cx={x} cy={y} r={46} fill="var(--bg-elevated)" stroke={col} strokeWidth={8} />
              <text x={x + 70} y={y - 4} fontSize={44} fontWeight={700} fill="var(--text-high)" fontFamily="var(--font-sans)">{n.label}</text>
              {live && <text x={x + 70} y={y + 42} fontSize={34} fill={col} fontFamily="var(--font-sans)">{n.status}</text>}
            </g>
          );
        })}
      </svg>
      {large && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, justifyContent: "center" }}>
          {live ? (
            <>
              <div style={{ fontSize: 36, color: C.muted }}>Dernières alertes</div>
              {alerts.length ? alerts.map((a) => (
                <div key={a.id} style={{ borderLeft: `10px solid ${SEV[a.severity]}`, background: C.card, borderRadius: 8, padding: "20px 28px" }}>
                  <div style={{ fontSize: 30, color: SEV[a.severity], fontWeight: 700 }}>Alerte {a.severity} · {fmtTime(a.at)}</div>
                  <div style={{ fontSize: 40, color: C.text }}>{a.title}</div>
                </div>
              )) : <div style={{ fontSize: 36, color: C.faint }}>Aucune alerte publique</div>}
            </>
          ) : (
            <div style={{ fontSize: 40, color: C.muted }}>Topologie du scénario</div>
          )}
        </div>
      )}
    </div>
  );
}

function Arene() {
  const { state } = useStanley();
  return state.exercise.mode === "ctf" ? <Epreuves large /> : <Carte large />;
}

// ------------------------------------------------------------------ Vues de la proposition C
function Equipes() {
  const { state } = useStanley();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
      {state.teams.items.map((t) => (
        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${C.line}`, paddingBottom: 20 }}>
          <span style={{ fontFamily: display, fontSize: 80, fontWeight: 700, color: C.text }}>{t.name}</span>
          <span style={{ fontSize: 44, color: C.muted }}>{t.members} joueurs</span>
        </div>
      ))}
    </div>
  );
}
function Regles() {
  const { state } = useStanley();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 40 }}>
      <div style={{ fontSize: 44, color: C.accent }}>{MODE_LABEL[state.exercise.mode]}</div>
      {state.exercise.rules.slice(0, 4).map((r, i) => (
        <div key={i} style={{ display: "flex", gap: 32, fontSize: 52, color: C.text }}><span style={{ fontFamily: mono, color: C.faint }}>{i + 1}</span>{r}</div>
      ))}
    </div>
  );
}
function Rgpd() {
  return (
    <Halves
      left={<div style={{ height: "100%", display: "flex", alignItems: "center", fontFamily: display, fontSize: 140, fontWeight: 700, lineHeight: 1.1, color: C.text }}>Vous êtes filmés pendant l'exercice</div>}
      right={<div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 40, fontSize: 52, color: C.body }}>
        <div>Finalité, durée de conservation, contact :</div>
        <div style={{ color: C.warn }}>texte en attente de validation par le professeur responsable</div>
      </div>}
    />
  );
}
function Stats() {
  const { state } = useStanley();
  const mode = state.exercise.mode;
  const kpi = mode === "ctf" ? [["Flags validés", state.solves.items.length], ["Épreuves", state.challenges.items.length]]
    : mode === "ad-pvp" ? [["Attaques", state.incidents.items.length], ["Détectées", state.incidents.items.filter((i) => i.detectedAt).length]]
    : [["Étapes franchies", state.chain.reached.length], ["Équipes à l'objectif", rankIa(state).filter((r) => r.won).length]];
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "space-around" }}>
      {kpi.map(([k, v]) => (
        <div key={k as string} style={{ textAlign: "center" }}>
          <div style={{ fontFamily: mono, fontSize: 220, fontWeight: 700, color: C.text, lineHeight: 1 }}>{v}</div>
          <div style={{ fontSize: 44, color: C.muted }}>{k}</div>
        </div>
      ))}
    </div>
  );
}
function Premiers() {
  const { state } = useStanley();
  const team = Object.fromEntries(state.teams.items.map((t) => [t.id, t.name]));
  const chal = Object.fromEntries(state.challenges.items.map((c) => [c.id, c.name]));
  const mode = state.exercise.mode;
  const rows: [string, string][] = mode === "ctf"
    ? state.solves.items.filter((x) => x.firstBlood).map((x) => [chal[x.challenge] ?? x.challenge, team[x.team] ?? x.team])
    : mode === "ad-ia"
      ? state.chain.steps.map((st, i) => { const f = [...state.chain.reached].filter((r) => r.step === i).sort((a, b) => a.at.localeCompare(b.at))[0]; return [st.label, f ? team[f.team] ?? f.team : "—"] as [string, string]; })
      : rankPvp(state).filter((r) => r.avgMin != null).sort((a, b) => a.avgMin! - b.avgMin!).map((r) => [`Détection la plus rapide`, `${r.team.name} · ${Math.round(r.avgMin!)} min`] as [string, string]).slice(0, 1);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
      <div style={{ fontSize: 36, color: C.muted }}>{mode === "ctf" ? "Premières équipes à valider" : mode === "ad-ia" ? "Premières équipes à chaque étape" : "Réactivité"}</div>
      {rows.slice(0, 6).map(([a, b]) => (
        <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 44, borderBottom: `2px solid ${C.line}`, paddingBottom: 12 }}>
          <span style={{ color: C.body }}>{a}</span><b style={{ color: C.text }}>{b}</b>
        </div>
      ))}
    </div>
  );
}
function TempsForts() {
  const { state } = useStanley();
  const items = feed(state).filter((f) => f.tag).slice(0, 8).reverse();
  const col = (list: FeedItem[]) => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
      {list.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 28, alignItems: "baseline" }}>
          <span style={{ fontFamily: mono, fontSize: 40, color: C.faint }}>{fmtTime(f.at)}</span>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: f.tagColor }}>{f.tag}</div>
            <div style={{ fontSize: 44, color: C.text }}>{f.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
  if (!items.length) return <Empty text="Aucun temps fort enregistré" />;
  return <Halves left={col(items.slice(0, 4))} right={col(items.slice(4, 8))} />;
}
function Podium() {
  const { state } = useStanley();
  const mode = state.exercise.mode;
  const rows = mode === "ctf" ? rankCtf(state).map((r) => [r.team.name, `${r.score} pts`])
    : mode === "ad-pvp" ? rankPvp(state).map((r) => [r.team.name, `${r.score} pts`])
    : rankIa(state).map((r) => [r.team.name, r.won ? "objectif atteint" : r.step >= 0 ? state.chain.steps[r.step].label : "—"]);
  const block = (i: number, h: number) => rows[i] && (
    <div style={{ width: 760, textAlign: "center" }}>
      <div style={{ fontFamily: display, fontSize: i === 0 ? 120 : 88, fontWeight: 700, color: C.text }}>{rows[i][0]}</div>
      <div style={{ fontSize: 48, color: C.muted, marginBottom: 20 }}>{rows[i][1]}</div>
      <div style={{ height: h, borderRadius: "16px 16px 0 0", background: i === 0 ? C.accent : C.card, display: "grid", placeItems: "start center", paddingTop: 24, fontFamily: mono, fontSize: 160, fontWeight: 700, color: i === 0 ? "var(--bg-base)" : C.text }}>{i + 1}</div>
    </div>
  );
  return (
    <Halves
      left={<div style={{ height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>{block(0, 560)}</div>}
      right={<div style={{ height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 120 }}>{block(1, 400)}{block(2, 280)}</div>}
    />
  );
}

// ------------------------------------------------------------------ registre
export const VIEWS: Record<ViewId, () => React.ReactElement> = {
  accueil: Accueil, acces: () => <Acces />, "acces-large": () => <Acces large />, chrono: Chrono, depart: Depart, fil: Fil,
  classement: () => <Classement />, "classement-large": ClassementLarge, progression: Progression, epreuves: () => <Epreuves />,
  carte: () => <Carte />, arene: Arene, equipes: Equipes, regles: Regles, rgpd: Rgpd, stats: Stats, premiers: Premiers,
  "temps-forts": TempsForts, podium: Podium,
};
