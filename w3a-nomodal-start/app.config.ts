import { defineConfig } from "@solidjs/start/config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  ssr: false,
  server: {
    preset: "cloudflare-pages",
    alias: { "process/": "process" },
    esbuild: {
      options: {
        // We need BigInt support (default: 2019)
        target: "esnext",
      },
    },
  },
  vite: {
    plugins: [
      nodePolyfills({ globals: { Buffer: true, global: true, process: true } }),
    ],
    define: {
      global: "globalThis",
    },
    optimizeDeps: {
      include: ["@web3auth/*"],
    },
    ssr: {
      noExternal: [/^(web3auth|@web3auth\/.*)$/],
    },
    // ssr: {
    // noExternal: [/@web3auth/, /toruslabs/, /events/],
    // optimizeDeps: {
    //   include: ["@web3auth/*", "toruslabs/*", "events"],
    // },
    // },
  },
});
