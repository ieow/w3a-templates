import { defineConfig } from "@solidjs/start/config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  ssr: false,
  server: {
    preset: "cloudflare-pages",
    alias: {
      // For `readable-stream` to properly resolve Cloudflare runtime polyfill
      "process/": "process",
      "buffer/": "buffer",
    },
    esbuild: {
      options: {
        // We need BigInt support (default: 2019)
        target: "esnext",
      },
    },
  },
  vite: {
    define: {
      // For WalletConnect
      // Node.js global to browser globalThis
      global: "globalThis",
    },
    plugins: [
      nodePolyfills({
        // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
        include: ["buffer"],
        // To exclude specific polyfills, add them to this list. Note: if include is provided, this has no effect
        // exclude: [
        //   "http", // Excludes the polyfill for `http` and `node:http`.
        // ],
        // Whether to polyfill specific globals.
        globals: {
          Buffer: true, // can also be 'build', 'dev', or false
        },
      }),
    ],
  },
});
