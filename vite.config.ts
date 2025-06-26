import { defineConfig } from "vite";

export default defineConfig({
  base: "/synth-emulator/",
  build: {
    outDir: "dist",
    sourcemap: true,
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          tone: ["tone"],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
