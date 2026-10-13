// ============================================================================
// STANLEY — serveur de synchronisation des écrans (groupe 8)
// Un état unique, diffusé à tous les écrans par Server-Sent Events.
// Aucune dépendance : node sync-server/server.mjs  (Node 18+)
//
//   PORT=8787         port d'écoute
//   SIMULATE=1        génère des événements factices selon le mode (démo)
//   INGEST_TOKEN=...  exige "Authorization: Bearer ..." sur les écritures
// ============================================================================
import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { hydrate } from "../src/data/hydrate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const SIMULATE = process.env.SIMULATE === "1";
const TOKEN = process.env.INGEST_TOKEN ?? "";
const seed = JSON.parse(readFileSync(join(__dirname, "../src/data/seed.json"), "utf8"));
const iso = (ms = Date.now()) => new Date(ms).toISOString();

let state = hydrate(seed);

// ---------------------------------------------------------------- diffusion
const clients = new Set();
function broadcast() {
  state.version += 1;
  state.serverTime = iso();
  const msg = `event: state\ndata: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(msg);
}
setInterval(() => {
  const msg = `event: ping\ndata: ${JSON.stringify({ serverTime: iso() })}\n\n`;
  for (const res of clients) res.write(msg);
}, 10000);

const real = (block, via) => (state[block].meta = { origin: "reel", via, updatedAt: iso() });

// ---------------------------------------------------------------- CSV
// CSV simple : première ligne = en-têtes, séparateur virgule ou point-virgule, guillemets acceptés.
function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const split = (line) => {
    const out = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === sep && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };
  const head = split(lines[0]);
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const o = {};
    head.forEach((h, i) => {
      let v = cells[i] ?? "";
      if (v === "") return;
      if (["points", "step", "members", "x", "y", "durationSec"].includes(h)) v = Number(v);
      if (h === "public") v = !["false", "0", "non", "no"].includes(v.toLowerCase());
      o[h] = v;
    });
    return o;
  });
}

async function readBody(req) {
  let raw = "";
  for await (const c of req) raw += c;
  const type = (req.headers["content-type"] ?? "").toLowerCase();
  if (type.includes("csv") || (!raw.trim().startsWith("{") && !raw.trim().startsWith("["))) return { rows: parseCsv(raw), fmt: "csv" };
  const j = raw ? JSON.parse(raw) : {};
  return { rows: Array.isArray(j) ? j : j.items ?? [j], obj: j, fmt: "json" };
}

// ---------------------------------------------------------------- événements
function applyEvent(e, via) {
  const at = e.at ?? iso();
  switch (e.type) {
    case "solve": {
      if (!e.team || !e.challenge) throw new Error("solve : team et challenge requis");
      if (state.solves.items.some((s) => s.team === e.team && s.challenge === e.challenge)) return;
      const c = state.challenges.items.find((x) => x.id === e.challenge);
      const firstBlood = !state.solves.items.some((s) => s.challenge === e.challenge);
      state.solves.items.push({ id: `s${Date.now()}${Math.random().toString(36).slice(2, 5)}`, team: e.team, challenge: e.challenge, points: e.points ?? c?.points ?? 0, at, firstBlood });
      real("solves", via);
      return;
    }
    case "alert": {
      if (!e.title) throw new Error("alert : title requis");
      state.alerts.items.unshift({ id: e.id ?? `a${Date.now()}`, at, severity: e.severity ?? "moyenne", title: e.title, target: e.target, technique: e.technique, public: e.public ?? false });
      state.alerts.items = state.alerts.items.slice(0, 100);
      if (e.target) setNode(e.target, "attaque");
      real("alerts", via);
      return;
    }
    case "attack": {
      if (!e.team || !e.target) throw new Error("attack : team et target requis");
      state.incidents.items.push({ id: e.id ?? `i${Date.now()}`, team: e.team, target: e.target, technique: e.technique, startedAt: at, detectedAt: null });
      setNode(e.target, "attaque");
      real("incidents", via);
      return;
    }
    case "detect": {
      const inc = state.incidents.items.find((i) => (e.id ? i.id === e.id : i.team === e.team && i.target === e.target && !i.detectedAt));
      if (!inc) throw new Error("detect : incident introuvable");
      inc.detectedAt = at;
      real("incidents", via);
      return;
    }
    case "step": {
      if (!e.team || e.step == null) throw new Error("step : team et step requis");
      state.chain.reached.push({ team: e.team, step: Number(e.step), at });
      real("chain", via);
      return;
    }
    case "node": {
      setNode(e.id ?? e.target, e.status);
      real("topology", via);
      return;
    }
    case "phase":
      control({ phase: e.phase });
      return;
    default:
      throw new Error(`type inconnu : ${e.type}`);
  }
}

function setNode(id, status) {
  const n = state.topology.nodes.find((x) => x.id === id);
  if (n && status) n.status = status;
}

// ---------------------------------------------------------------- pilotage
function control(c) {
  const ex = state.exercise;
  if (c.reset) {
    const keep = state.display.proposition;
    state = hydrate(seed);
    state.display.proposition = keep;
  }
  if (c.proposition && ["A", "B", "C"].includes(c.proposition)) state.display.proposition = c.proposition;
  if (c.mode && ["ctf", "ad-pvp", "ad-ia"].includes(c.mode)) ex.mode = c.mode;
  if (c.durationSec) ex.durationSec = Number(c.durationSec);
  if (c.phase) {
    const now = Date.now();
    if (c.phase === "avant") ex.startsAt = iso(now + (c.countdownSec ?? 300) * 1000);
    if ((c.phase === "echauffement" || c.phase === "jeu") && ex.phase === "avant") ex.startsAt = iso(now);
    if (c.phase === "derniere-heure") ex.startsAt = iso(now + 3600 * 1000 - ex.durationSec * 1000);
    ex.phase = c.phase;
    ex.endsAt = iso(Date.parse(ex.startsAt) + ex.durationSec * 1000);
    if (c.phase === "termine") ex.endsAt = iso(Math.min(now, Date.parse(ex.endsAt)));
  }
}

// ---------------------------------------------------------------- HTTP
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization" };
const send = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", ...CORS }); res.end(JSON.stringify(body)); };

const routes = {
  "GET /state": (_q, res) => send(res, 200, state),
  "GET /health": (_q, res) => send(res, 200, { ok: true, clients: clients.size, version: state.version, simulate: SIMULATE }),
  "GET /events": (req, res) => {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", ...CORS });
    res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
  },
  "POST /api/events": async (req, res) => {
    const { rows, fmt } = await readBody(req);
    const errors = [];
    rows.forEach((e, i) => { try { applyEvent(e, `POST /api/events (${fmt})`); } catch (err) { errors.push(`ligne ${i + 1} : ${err.message}`); } });
    broadcast();
    send(res, errors.length ? 207 : 201, { ok: errors.length === 0, recus: rows.length, erreurs: errors });
  },
  "PUT /api/teams": async (req, res) => {
    const { rows, fmt } = await readBody(req);
    state.teams.items = rows.map((t) => ({ id: String(t.id), name: t.name, members: Number(t.members ?? 0) }));
    real("teams", `PUT /api/teams (${fmt})`); broadcast(); send(res, 200, { ok: true });
  },
  "PUT /api/challenges": async (req, res) => {
    const { rows, fmt } = await readBody(req);
    state.challenges.items = rows.map((c) => ({ id: String(c.id), name: c.name, tactic: c.tactic, points: Number(c.points ?? 0), status: c.status ?? "ouvert" }));
    real("challenges", `PUT /api/challenges (${fmt})`); broadcast(); send(res, 200, { ok: true });
  },
  "PUT /api/topology": async (req, res) => {
    const { obj, fmt } = await readBody(req);
    if (fmt !== "json" || !Array.isArray(obj.nodes)) return send(res, 400, { error: "JSON { nodes: [], links: [] } attendu" });
    state.topology.nodes = obj.nodes; state.topology.links = obj.links ?? [];
    real("topology", "PUT /api/topology"); broadcast(); send(res, 200, { ok: true });
  },
  "PUT /api/chain": async (req, res) => {
    const { rows, fmt } = await readBody(req);
    state.chain.steps = rows.map((s) => ({ tactic: s.tactic, label: s.label }));
    state.chain.reached = [];
    real("chain", `PUT /api/chain (${fmt})`); broadcast(); send(res, 200, { ok: true });
  },
  "PUT /api/exercise": async (req, res) => {
    const { obj } = await readBody(req);
    const { meta, ...rest } = obj ?? {};
    Object.assign(state.exercise, rest);
    state.exercise.endsAt = iso(Date.parse(state.exercise.startsAt) + state.exercise.durationSec * 1000);
    real("exercise", "PUT /api/exercise"); broadcast(); send(res, 200, { ok: true });
  },
  "POST /api/control": async (req, res) => {
    const { obj } = await readBody(req);
    control(obj ?? {}); broadcast(); send(res, 200, { ok: true, display: state.display, mode: state.exercise.mode, phase: state.exercise.phase });
  },
};

http
  .createServer(async (req, res) => {
    if (req.method === "OPTIONS") return send(res, 204, {});
    const path = new URL(req.url, "http://x").pathname;
    const h = routes[`${req.method} ${path}`];
    if (!h) return send(res, 404, { error: "route inconnue", routes: Object.keys(routes) });
    if (req.method !== "GET" && TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { error: "jeton invalide" });
    try { await h(req, res); } catch (e) { send(res, 400, { error: String(e.message ?? e) }); }
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`[stanley-sync] port ${PORT} · simulation ${SIMULATE ? "ACTIVE" : "inactive"} · jeton ${TOKEN ? "exigé" : "non"}`);
  });

// ---------------------------------------------------------------- simulation
if (SIMULATE) {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const via = "simulation (SIMULATE=1)";
  const sim = (block) => (state[block].meta = { origin: "simule", via, updatedAt: iso() });
  setInterval(() => {
    const ex = state.exercise;
    if (ex.phase === "avant" || ex.phase === "termine") return;
    const team = pick(state.teams.items);
    try {
      if (ex.mode === "ctf") {
        const open = state.challenges.items.filter((c) => c.status === "ouvert" && !state.solves.items.some((s) => s.team === team.id && s.challenge === c.id));
        if (open.length) { applyEvent({ type: "solve", team: team.id, challenge: pick(open).id }, via); sim("solves"); }
      } else if (ex.mode === "ad-pvp") {
        const pending = state.incidents.items.filter((i) => !i.detectedAt);
        if (pending.length && Math.random() < 0.6) { const i = pick(pending); applyEvent({ type: "detect", id: i.id }, via); setNode(i.target, "sain"); }
        else { const n = pick(state.topology.nodes.filter((x) => x.id !== "gw")); applyEvent({ type: "attack", team: team.id, target: n.id, technique: pick(["T1110", "T1021", "T1059", "T1190"]) }, via); applyEvent({ type: "alert", title: `Activité suspecte sur ${n.label}`, target: n.id, severity: pick(["moyenne", "haute", "critique"]), public: true }, via); }
        sim("incidents"); sim("alerts");
      } else {
        const best = Math.max(-1, ...state.chain.reached.filter((r) => r.team === team.id).map((r) => r.step));
        if (best < state.chain.steps.length - 1) { applyEvent({ type: "step", team: team.id, step: best + 1 }, via); sim("chain"); }
      }
      broadcast();
    } catch (e) { console.warn("[simulation]", e.message); }
  }, 15000);
}
