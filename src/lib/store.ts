// Store client : un seul abonnement SSE partagé par tous les composants d'une page.
// Sans serveur de synchro, la page affiche le jeu d'essai local et le signale.
import { useEffect, useState, useSyncExternalStore } from "react";
import seed from "@/data/seed.json";
import { hydrate } from "@/data/hydrate.js";
import type { StanleyState } from "./contract";

export type Connection = "connexion" | "en-ligne" | "hors-ligne";

/** Adresse du serveur : ?sync=…, sinon VITE_SYNC_URL, sinon même machine que la page, port 8787. */
export function syncUrl(): string {
  if (typeof window === "undefined") return "";
  const q = new URLSearchParams(window.location.search).get("sync");
  if (q) return q.replace(/\/$/, "");
  const env = import.meta.env.VITE_SYNC_URL as string | undefined;
  if (env) return env.replace(/\/$/, "");
  return `${window.location.protocol}//${window.location.hostname}:8787`;
}

let state: StanleyState = hydrate(seed, Date.now(), "jeu d'essai local (hors ligne)");
let connection = "connexion" as Connection;
let offset = 0; // heure serveur − heure locale
let snap = { state, connection };
const listeners = new Set<() => void>();
let started = false;

function emit() {
  snap = { state, connection };
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const fallback = setTimeout(() => {
    if (connection !== "en-ligne") { connection = "hors-ligne"; emit(); }
  }, 3000);
  const es = new EventSource(`${syncUrl()}/events`);
  es.addEventListener("state", (e) => {
    clearTimeout(fallback);
    const next = JSON.parse((e as MessageEvent).data) as StanleyState;
    offset = Date.parse(next.serverTime) - Date.now();
    state = next;
    connection = "en-ligne";
    emit();
  });
  es.addEventListener("ping", (e) => {
    offset = Date.parse(JSON.parse((e as MessageEvent).data).serverTime) - Date.now();
  });
  es.onerror = () => {
    if (connection === "en-ligne") { connection = "hors-ligne"; emit(); }
  };
}

export function useStanley() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); start(); return () => listeners.delete(cb); },
    () => snap,
    () => snap,
  );
}

/** Heure du serveur, identique sur tous les écrans. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now() + offset), ms);
    return () => clearInterval(i);
  }, [ms]);
  return now;
}

/** Envoi vers le serveur (page de démo). */
export async function post(path: string, body: unknown, csv = false) {
  const r = await fetch(`${syncUrl()}${path}`, {
    method: path.startsWith("/api/teams") || path.startsWith("/api/challenges") ? "PUT" : "POST",
    headers: { "Content-Type": csv ? "text/csv" : "application/json" },
    body: csv ? String(body) : JSON.stringify(body),
  });
  return r.json();
}
