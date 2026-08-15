import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'analyze' &&
      visualizer({
        open: true,
        filename: 'dist/bundle-report.html',
        gzipSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    // Array format guarantees ordering: most-specific aliases are checked first,
    // so they win over the catch-all '@' entry at the bottom.
    alias: [
      // ── Specific module aliases ──────────────────────────────────────────
      { find: '@/app', replacement: path.resolve(__dirname, './src/app') },
      { find: '@/modules', replacement: path.resolve(__dirname, './src/modules') },
      { find: '@/core', replacement: path.resolve(__dirname, './src/core') },
      { find: '@/shared', replacement: path.resolve(__dirname, './src/shared') },
      { find: '@/features', replacement: path.resolve(__dirname, './src/features') },
      { find: '@/lib', replacement: path.resolve(__dirname, './src/lib') },
      { find: '@/assets', replacement: path.resolve(__dirname, './src/assets') },
      // ── Backward-compat (old paths → new locations) ──────────────────────
      { find: '@/context', replacement: path.resolve(__dirname, './src/core/context') },
      { find: '@/hooks', replacement: path.resolve(__dirname, './src/shared/hooks') },
      { find: '@/layouts', replacement: path.resolve(__dirname, './src/app/layouts') },
      { find: '@/services', replacement: path.resolve(__dirname, './src/core/api') },
      // ── Catch-all (must be last) ─────────────────────────────────────────
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
  build: {
    chunkSizeWarningLimit: 500,
    // Do NOT set minify: 'esbuild' — this project uses rolldown-vite, which
    // no longer bundles esbuild. Forcing esbuild minify crashes Netlify builds
    // with: "Cannot find package 'esbuild'". Default minify (oxc) is correct.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/scheduler') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-table';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Split PDF stack: html2canvas is large; keeping it separate avoids one 600kB+ chunk.
          if (id.includes('node_modules/html2canvas')) {
            return 'vendor-html2canvas';
          }
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-jspdf';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
        },
      },
    },
  },
}));
