import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";

function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--text-body)" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 48, color: "var(--text-high)" }}>Page introuvable</h1>
        <Link to="/" style={{ color: "var(--accent)" }}>Retour à l'accueil</Link>
      </div>
    </div>
  );
}

function ErrorPage({ error }: { error: unknown }) {
  console.error(error);
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "var(--text-body)" }}>
      <div style={{ textAlign: "center", maxWidth: 600 }}>
        <h1 style={{ fontSize: 32, color: "var(--text-high)" }}>Cette page n'a pas pu s'afficher</h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{error instanceof Error ? error.message : String(error)}</p>
        <a href="/" style={{ color: "var(--accent)" }}>Retour à l'accueil</a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Stanley · écrans de la tour" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
