// Lance tout ce qu'il faut pour la tour, depuis un seul ordinateur (Windows, macOS, Linux).
//   node scripts/tour.mjs --build      construit l'application (une fois, avec Internet)
//   node scripts/tour.mjs              lance les écrans (port 3000) + le serveur de synchro (8787)
//   node scripts/tour.mjs --no-sim     sans données simulées
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.includes("--build")) {
  const r = spawnSync(process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "build"], { cwd: root, stdio: "inherit", env: { ...process.env, NITRO_PRESET: "node-server" } });
  process.exit(r.status ?? 1);
}

const app = join(root, ".output/server/index.mjs");
if (!existsSync(app)) {
  console.error("Application non construite. Lancez d'abord : node scripts/tour.mjs --build");
  process.exit(1);
}

const free = (port) => new Promise((ok) => {
  const t = net.createServer().once("error", () => ok(false)).once("listening", () => t.close(() => ok(true))).listen(port, "0.0.0.0");
});
for (const port of [3000, 8787]) {
  if (!(await free(port))) {
    console.error(`Le port ${port} est déjà utilisé : une autre instance tourne sans doute encore. Fermez-la puis relancez.`);
    process.exit(1);
  }
}

const sim = !args.includes("--no-sim");
const children = [];
const stopAll = (code = 0) => { children.forEach((c) => c.kill()); process.exit(code); };
process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
const run = (name, file, env) => {
  const p = spawn(process.execPath, [file], { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  p.stdout.on("data", (d) => process.stdout.write(`[${name}] ${d}`));
  p.stderr.on("data", (d) => process.stderr.write(`[${name}] ${d}`));
  p.on("exit", (c) => { console.log(`[${name}] arrêté (${c})`); stopAll(c ?? 1); });
  children.push(p);
  return p;
};
run("synchro", join(root, "sync-server/server.mjs"), { PORT: "8787", ...(sim ? { SIMULATE: "1" } : {}) });
run("ecrans", app, { PORT: "3000", HOST: "0.0.0.0" });

const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
setTimeout(() => {
  console.log("\n=== STANLEY · tour prête ===");
  console.log(`Simulation : ${sim ? "oui" : "non"}`);
  for (const ip of ips.length ? ips : ["<IP de ce PC>"]) {
    console.log(`\nDepuis le réseau, adresse ${ip} :`);
    console.log(`  Démo / pilotage : http://${ip}:3000/demo`);
    for (let n = 1; n <= 8; n++) console.log(`  Pi ${n} (rangée ${Math.ceil(n / 2)} ${n % 2 ? "gauche" : "droite"}) : http://${ip}:3000/pos/${n}`);
  }
  console.log("\nCtrl+C pour arrêter.\n");
}, 1500);
