import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars for the current mode so we can reference them in config
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:8080';

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // ── Dev server ──────────────────────────────────────────────────
    server: {
      // Honour PORT env (used by preview/hosting harnesses); default 5173 for local dev.
      port: Number(process.env.PORT) || 5173,
      host: true,
      // Proxy /api requests to the backend during local development.
      // This eliminates CORS preflight errors in dev without changing
      // the production API_BASE_URL logic in api.ts.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          // Strip the browser Origin/Referer so the backend treats the proxied
          // request as same-origin (avoids "Invalid CORS request" when the dev
          // server runs on a non-whitelisted port, e.g. a preview harness).
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
            });
          },
        },
      },
    },

    // ── Preview server (after `vite build`) ─────────────────────────
    preview: {
      port: 5173,
    },

    // ── Build ────────────────────────────────────────────────────────
    build: {
      // No source maps in production builds — don't ship internal code paths
      sourcemap: false,
      // Raise the chunk-size warning threshold a little (default 500 kB)
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // Split vendor dependencies into a separate chunk for better
          // long-term cache hits when only app code changes.
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
          },
        },
      },
    },

    // ── Dep optimisation ────────────────────────────────────────────
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
