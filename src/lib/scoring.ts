// Calculs d'affichage. Les barèmes sont des PROPOSITIONS du groupe 8 (cahier §5.1),
// à valider avec le groupe 7. Si la plateforme fournit ses propres scores, ils doivent primer.
import type { StanleyState, Team } from "./contract";
import { TACTIC_ORDER } from "./contract";

export const FIRST_BLOOD_BONUS = 0.1;
export const PVP_BASE = 100;
export const PVP_LOSS_PER_MIN = 3;
export const PVP_FLOOR = 10;

const minutes = (a: string, b: string) => Math.max(0, (Date.parse(b) - Date.parse(a)) / 60000);

export interface CtfRow { team: Team; rank: number; score: number; flags: number; last: string | null }
export function rankCtf(s: StanleyState): CtfRow[] {
  const rows = s.teams.items.map((team) => {
    const mine = s.solves.items.filter((x) => x.team === team.id);
    const score = mine.reduce((a, x) => a + Math.round(x.points * (x.firstBlood ? 1 + FIRST_BLOOD_BONUS : 1)), 0);
    const last = mine.reduce<string | null>((a, x) => (!a || x.at > a ? x.at : a), null);
    return { team, rank: 0, score, flags: mine.length, last };
  });
  // égalité : l'équipe qui a atteint ce score en premier passe devant
  rows.sort((a, b) => b.score - a.score || (a.last ?? "~").localeCompare(b.last ?? "~"));
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export interface PvpRow { team: Team; rank: number; score: number; attacks: number; detected: number; pending: number; avgMin: number | null }
export function incidentPoints(startedAt: string, detectedAt: string | null) {
  if (!detectedAt) return 0;
  return Math.max(PVP_FLOOR, Math.round(PVP_BASE - PVP_LOSS_PER_MIN * minutes(startedAt, detectedAt)));
}
export function rankPvp(s: StanleyState): PvpRow[] {
  const rows = s.teams.items.map((team) => {
    const mine = s.incidents.items.filter((i) => i.team === team.id);
    const det = mine.filter((i) => i.detectedAt);
    const avg = det.length ? det.reduce((a, i) => a + minutes(i.startedAt, i.detectedAt!), 0) / det.length : null;
    return { team, rank: 0, score: mine.reduce((a, i) => a + incidentPoints(i.startedAt, i.detectedAt), 0), attacks: mine.length, detected: det.length, pending: mine.length - det.length, avgMin: avg };
  });
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

export interface IaRow { team: Team; rank: number; step: number; at: string | null; won: boolean }
export function rankIa(s: StanleyState): IaRow[] {
  const last = s.chain.steps.length - 1;
  const rows = s.teams.items.map((team) => {
    const mine = s.chain.reached.filter((r) => r.team === team.id);
    const best = mine.reduce<{ step: number; at: string | null }>((a, r) => (r.step > a.step || (r.step === a.step && a.at && r.at < a.at) ? { step: r.step, at: r.at } : a), { step: -1, at: null });
    return { team, rank: 0, step: best.step, at: best.at, won: best.step === last };
  });
  rows.sort((a, b) => b.step - a.step || (a.at ?? "~").localeCompare(b.at ?? "~"));
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

/** Tactiques présentes dans les épreuves, dans l'ordre ATT&CK. */
export function tacticsInPlay(s: StanleyState) {
  const set = new Set(s.challenges.items.map((c) => c.tactic));
  return TACTIC_ORDER.filter((t) => set.has(t));
}

/** Part des épreuves réussies, par équipe et par tactique (0..1). */
export function ctfProgress(s: StanleyState) {
  const tactics = tacticsInPlay(s);
  return {
    tactics,
    rows: s.teams.items.map((team) => ({
      team,
      values: tactics.map((t) => {
        const ids = s.challenges.items.filter((c) => c.tactic === t).map((c) => c.id);
        const done = s.solves.items.filter((x) => x.team === team.id && ids.includes(x.challenge)).length;
        return ids.length ? done / ids.length : 0;
      }),
    })),
  };
}

export function fmtDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
export function fmtTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
export function ago(isoDate: string | null, now: number) {
  if (!isoDate) return "—";
  const m = Math.floor((now - Date.parse(isoDate)) / 60000);
  return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : `il y a ${Math.floor(m / 60)} h ${m % 60}`;
}
