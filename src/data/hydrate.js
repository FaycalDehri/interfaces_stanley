// Transforme le jeu d'essai (heures relatives) en état complet.
// Module partagé : utilisé par le serveur de synchro ET par les écrans hors ligne.
const iso = (ms) => new Date(ms).toISOString();

export function hydrate(seed, now = Date.now(), via = "jeu d'essai") {
  const meta = { origin: "simule", via, updatedAt: iso(now) };
  const m = () => ({ ...meta });
  const pts = Object.fromEntries(seed.challenges.map((c) => [c.id, c.points]));
  const seen = new Set();
  const solves = [...seed.solves]
    .sort((a, b) => a.offsetSec - b.offsetSec)
    .map((s, i) => {
      const firstBlood = !seen.has(s.challenge);
      seen.add(s.challenge);
      return { id: `s${i + 1}`, team: s.team, challenge: s.challenge, points: pts[s.challenge] ?? 0, at: iso(now + s.offsetSec * 1000), firstBlood };
    });
  const { startOffsetSec, ...ex } = seed.exercise;
  const startsAt = now + startOffsetSec * 1000;
  return {
    version: 1,
    serverTime: iso(now),
    display: { proposition: "B" },
    exercise: { ...ex, startsAt: iso(startsAt), endsAt: iso(startsAt + ex.durationSec * 1000), meta: m() },
    teams: { items: seed.teams, meta: m() },
    challenges: { items: seed.challenges, meta: m() },
    solves: { items: solves, meta: m() },
    incidents: {
      items: seed.incidents.map(({ startOffsetSec: so, detectOffsetSec: d, ...x }) => ({ ...x, startedAt: iso(now + so * 1000), detectedAt: d == null ? null : iso(now + d * 1000) })),
      meta: m(),
    },
    chain: { steps: seed.chain.steps, reached: seed.chain.reached.map(({ offsetSec, ...r }) => ({ ...r, at: iso(now + offsetSec * 1000) })), meta: m() },
    alerts: { items: seed.alerts.map(({ offsetSec, ...a }) => ({ ...a, at: iso(now + offsetSec * 1000) })), meta: m() },
    topology: { nodes: seed.topology.nodes, links: seed.topology.links, meta: m() },
    sponsors: { items: seed.sponsors, meta: { ...meta, origin: "reel" } },
  };
}
