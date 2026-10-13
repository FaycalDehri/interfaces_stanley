import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Build pour un serveur Node (node .output/server/index.mjs). Autre cible : NITRO_PRESET=<preset>.
export default defineConfig({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart(),
    nitro({ preset: process.env.NITRO_PRESET ?? "node-server" }),
    viteReact(),
  ],
});
