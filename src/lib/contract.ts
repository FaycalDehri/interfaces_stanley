// ============================================================================
// Contrat de données des écrans STANLEY (groupe 8) — voir cahier des charges.
// Chaque bloc porte `meta` : origine RÉELLE (reçue) ou SIMULÉE (jeu d'essai).
// ============================================================================

export type DataOrigin = "reel" | "simule";
export interface Meta {
  origin: DataOrigin;
  via: string; // "jeu d'essai", "POST /api/events (csv)", …
  updatedAt: string | null;
}

/** CTF, attaque-défense équipe contre équipe, toutes les équipes contre l'IA */
export type Mode = "ctf" | "ad-pvp" | "ad-ia";
/** Phases reprises du découpage initial + « avant » (proposition C) */
export type Phase = "avant" | "echauffement" | "jeu" | "derniere-heure" | "termine";
export type Proposition = "A" | "B" | "C";

export const MODE_LABEL: Record<Mode, string> = {
  ctf: "CTF",
  "ad-pvp": "Attaque-défense · équipe contre équipe",
  "ad-ia": "Attaque-défense · toutes les équipes contre l'IA",
};
export const PHASE_LABEL: Record<Phase, string> = {
  avant: "Avant le début",
  echauffement: "Échauffement",
  jeu: "Jeu",
  "derniere-heure": "Dernière heure",
  termine: "Terminé",
};

/** Tactiques MITRE ATT&CK (Enterprise), libellés français. */
export const TACTICS: Record<string, string> = {
  TA0043: "Reconnaissance",
  TA0042: "Développement de ressources",
  TA0001: "Accès initial",
  TA0002: "Exécution",
  TA0003: "Persistance",
  TA0004: "Élévation de privilèges",
  TA0005: "Contournement des défenses",
  TA0006: "Accès aux identifiants",
  TA0007: "Découverte",
  TA0008: "Mouvement latéral",
  TA0009: "Collecte",
  TA0011: "Commande et contrôle",
  TA0010: "Exfiltration",
  TA0040: "Impact",
};
export const TACTIC_ORDER = Object.keys(TACTICS);

export interface Exercise {
  name: string;
  scenario: string;
  mode: Mode;
  phase: Phase;
  startsAt: string; // ISO
  durationSec: number;
  endsAt: string; // ISO, = startsAt + durée
  access: { url: string | null; network: string | null; support: string | null; flagFormat: string | null };
  rules: string[];
}

export interface Team { id: string; name: string; members: number }

export interface Challenge {
  id: string;
  name: string;
  tactic: string; // TAxxxx
  points: number;
  status: "ouvert" | "verrouille";
}

export interface Solve { id: string; team: string; challenge: string; points: number; at: string; firstBlood: boolean }

/** Équipe contre équipe : une attaque subie par une équipe, et sa détection. */
export interface Incident {
  id: string;
  team: string; // équipe qui défend
  target: string; // nœud de la topologie
  technique?: string; // Txxxx
  startedAt: string;
  detectedAt: string | null;
}

/** Contre l'IA : chaîne d'attaque du scénario et avancement de chaque équipe. */
export interface ChainStep { tactic: string; label: string }
export interface StepReached { team: string; step: number; at: string } // step : index dans la chaîne (0 = première étape)

export type Severity = "faible" | "moyenne" | "haute" | "critique";
export interface Alert { id: string; at: string; severity: Severity; title: string; target?: string; technique?: string; public: boolean }

export interface NetNode { id: string; label: string; x?: number; y?: number; status: "sain" | "attaque" | "compromis" | "hors-ligne" }
export interface NetLink { from: string; to: string }

export interface StanleyState {
  version: number;
  serverTime: string;
  display: { proposition: Proposition };
  exercise: Exercise & { meta: Meta };
  teams: { items: Team[]; meta: Meta };
  challenges: { items: Challenge[]; meta: Meta };
  solves: { items: Solve[]; meta: Meta };
  incidents: { items: Incident[]; meta: Meta };
  chain: { steps: ChainStep[]; reached: StepReached[]; meta: Meta };
  alerts: { items: Alert[]; meta: Meta };
  topology: { nodes: NetNode[]; links: NetLink[]; meta: Meta };
  sponsors: { items: string[]; meta: Meta };
}
