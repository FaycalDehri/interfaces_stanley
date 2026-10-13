import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Proposition, StanleyState } from "./contract";
import { useStanley, type Connection } from "./store";
import { VIEWS } from "./views";
import { VIEW_DATA, VIEW_TITLE, WIDE, slotFor, type ViewId } from "./layouts";

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function query(name: string) {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

// Blocs ignorés selon le mode, pour que le badge ne parle que de ce qui est affiché.
const IGNORED: Record<string, string[]> = { ctf: ["incidents", "chain", "alerts"], "ad-pvp": ["solves", "chain", "challenges"], "ad-ia": ["solves", "incidents", "challenges"] };

function origin(view: ViewId, s: StanleyState, conn: Connection) {
  if (conn === "hors-ligne") return { label: "HORS LIGNE · SIMULÉ", color: "var(--sev-high)" };
  const blocks = VIEW_DATA[view].filter((b) => !IGNORED[s.exercise.mode].includes(b as string));
  const metas = blocks.map((b) => (s[b] as { meta?: { origin: string } }).meta).filter(Boolean) as { origin: string }[];
  if (metas.length && metas.every((m) => m.origin === "reel")) return { label: "RÉEL", color: "var(--flag)" };
  if (metas.some((m) => m.origin === "reel")) return { label: "PARTIEL", color: "var(--sev-medium)" };
  return { label: "SIMULÉ", color: "var(--sev-medium)" };
}

/**
 * Rend une vue à sa taille native (1920×1080 ou 3840×1080) puis la met à
 * l'échelle de son conteneur. Pour une vue large, `half` n'en montre qu'une moitié :
 * chaque Raspberry Pi d'une rangée affiche ainsi sa part de la même vue.
 */
export function ViewCanvas({ view, half }: { view: ViewId; half?: "gauche" | "droite" }) {
  const { state, connection } = useStanley();
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  const wide = WIDE.includes(view);
  const W = wide ? 3840 : 1920;
  const visible = wide && half ? 1920 : W;
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setK(Math.min(e.contentRect.width / visible, e.contentRect.height / 1080)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible]);
  const V = VIEWS[view];
  const o = origin(view, state, connection);
  const showTitle = !half || half === "gauche";
  const showBadge = query("badge") !== "0" && (!half || half === "droite");
  return (
    <div ref={box} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative", background: "var(--bg-base)" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", width: visible, height: 1080, transform: `translate(-50%, -50%) scale(${k})`, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: half === "droite" ? -1920 : 0, width: W, height: 1080, padding: "120px 96px 64px", boxSizing: "border-box" }}>
          {showTitle && (
            <div style={{ position: "absolute", top: 36, left: 96, fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, color: "var(--text-muted)" }}>{VIEW_TITLE[view]}</div>
          )}
          {showBadge && (
            <div style={{ position: "absolute", top: 40, right: 96, fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 700, color: o.color, border: `3px solid ${o.color}`, borderRadius: 8, padding: "4px 16px" }}>{o.label}</div>
          )}
          <div style={{ width: "100%", height: "100%" }}><V /></div>
        </div>
      </div>
    </div>
  );
}

/** Ce qu'affiche le Pi n° `n` (1 à 8) selon la proposition et la phase en cours. */
export function Position({ n, prop }: { n: number; prop?: Proposition | null }) {
  const { state } = useStanley();
  const slot = slotFor(state, n, prop);
  return <ViewCanvas key={`${slot.view}-${slot.half ?? ""}`} view={slot.view} half={slot.half} />;
}

/** Une face complète (2 × 4), avec un liseré entre les écrans comme sur la tour. */
export function Face({ prop }: { prop?: Proposition | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      const w = Math.min(width, (height * 32) / 36); // 2 écrans 16:9 de large, 4 de haut
      setSize({ w, h: (w * 36) / 32 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} style={{ flex: 1, width: "100%", height: "100%", display: "grid", placeItems: "center", minHeight: 0 }}>
      <div style={{ width: size.w, height: size.h, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "repeat(4, 1fr)", gap: 8, background: "#000", padding: 8, boxSizing: "border-box" }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{ position: "relative", minHeight: 0, minWidth: 0 }}>
            <Position n={i + 1} prop={prop} />
            <span style={{ position: "absolute", left: 6, bottom: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "#777" }}>Pi {i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
