// Les trois propositions du cahier des charges (§6), sous forme de données.
// Position 1 = rangée 1 (haut) à gauche … position 8 = rangée 4 (bas) à droite.
import type { Phase, Proposition, StanleyState } from "./contract";

export type ViewId =
  | "accueil" | "acces" | "chrono" | "fil" | "classement" | "progression" | "epreuves" | "carte"
  | "depart" | "equipes" | "regles" | "stats" | "premiers"
  // vues larges (deux écrans)
  | "arene" | "classement-large" | "rgpd" | "acces-large" | "temps-forts" | "podium";

export const WIDE: ViewId[] = ["arene", "classement-large", "rgpd", "acces-large", "temps-forts", "podium"];

export interface Slot { view: ViewId; half?: "gauche" | "droite" }
type Face = [Slot, Slot, Slot, Slot, Slot, Slot, Slot, Slot];

const one = (v: ViewId): Slot => ({ view: v });
const wide = (v: ViewId): [Slot, Slot] => [{ view: v, half: "gauche" }, { view: v, half: "droite" }];

const A: Face = [one("accueil"), one("acces"), one("epreuves"), one("progression"), one("fil"), one("carte"), one("classement"), one("chrono")];
const B: Face = [one("accueil"), one("acces"), one("chrono"), one("fil"), ...wide("arene"), ...wide("classement-large")];
const C_AVANT: Face = [one("accueil"), one("depart"), one("equipes"), one("regles"), ...wide("rgpd"), ...wide("acces-large")];
const C_FIN: Face = [one("accueil"), one("stats"), one("chrono"), one("premiers"), ...wide("temps-forts"), ...wide("podium")];

export function faceFor(prop: Proposition, phase: Phase): Face {
  if (prop === "A") return A;
  if (prop === "B") return B;
  if (phase === "avant") return C_AVANT;
  if (phase === "termine") return C_FIN;
  return B; // proposition C pendant le jeu = proposition B
}

export function slotFor(s: StanleyState, position: number, override?: Proposition | null): Slot {
  return faceFor(override ?? s.display.proposition, s.exercise.phase)[position - 1];
}

/** Blocs de données utilisés par chaque vue (badge RÉEL / SIMULÉ). */
export const VIEW_DATA: Record<ViewId, (keyof StanleyState)[]> = {
  accueil: ["sponsors"], acces: ["exercise"], "acces-large": ["exercise"], chrono: ["exercise"], depart: ["exercise"], regles: ["exercise"], rgpd: ["exercise"],
  fil: ["solves", "incidents", "chain", "alerts"], classement: ["teams", "solves", "incidents", "chain"], "classement-large": ["teams", "solves", "incidents", "chain"],
  progression: ["teams", "challenges", "solves", "incidents", "chain"], epreuves: ["challenges", "solves", "chain", "topology"], carte: ["topology", "alerts"], arene: ["challenges", "solves", "topology", "alerts"],
  equipes: ["teams"], stats: ["solves", "incidents", "chain"], premiers: ["solves", "incidents", "chain"], "temps-forts": ["solves", "incidents", "chain", "alerts"], podium: ["teams", "solves", "incidents", "chain"],
};

export const VIEW_TITLE: Record<ViewId, string> = {
  accueil: "Accueil", acces: "Accès", "acces-large": "Accès", chrono: "Temps restant", fil: "En direct", classement: "Classement", "classement-large": "Classement",
  progression: "Progression", epreuves: "Épreuves", carte: "Carte du réseau", arene: "Arène", depart: "Départ", equipes: "Équipes", regles: "Règles",
  stats: "Bilan", premiers: "Premiers", rgpd: "Avertissement", "temps-forts": "Temps forts", podium: "Podium",
};
