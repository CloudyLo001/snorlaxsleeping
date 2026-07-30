import { defineConfig } from "vite";

// GitHub Pages serves this project under /snorlaxsleeping/, while Vercel serves
// it at the domain root. The Pages workflow sets GITHUB_PAGES so a single build
// config works for both; without it the asset URLs would 404 on one or other.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/snorlaxsleeping/" : "/",
});
