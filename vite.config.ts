import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const syncFunctionsHtmlPlugin = () => ({
  name: 'sync-functions-html',
  closeBundle() {
    try {
      const srcHtml = path.resolve(__dirname, 'dist/index.html');
      const destHtml = path.resolve(__dirname, 'functions/index.html');
      if (fs.existsSync(srcHtml)) {
        fs.copyFileSync(srcHtml, destHtml);
        console.log('✅ [Vite Plugin] Synchronisé dist/index.html -> functions/index.html');
      }
    } catch (e) {
      console.warn('⚠️ [Vite Plugin] Erreur sync functions/index.html:', e);
    }
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/functions/**',
          '**/.firebase/**',
          '**/.vite/**',
          '**/backups/**',
          '**/*.py',
          '**/*.log',
          '**/*.cjs',
          '**/*.mjs',
          '**/*.mp4',
          '**/*.pdf',
          '**/*.bak'
        ]
      },
      proxy: {
        '/api/gemini-proxy': {
          target: 'https://us-central1-signaid-prod.cloudfunctions.net/generateTryOnImageProxy',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini-proxy/, ''),
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'lucide-react',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        'firebase/functions'
      ]
    },
    plugins: [
      react(),
      syncFunctionsHtmlPlugin()
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.VITE_GOOGLE_GENAI_API_KEY': JSON.stringify(env.VITE_GOOGLE_GENAI_API_KEY || env.VITE_GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // dtfMasterService et ses dépendances lourdes (PDF, canvas) → chunk isolé, jamais chargé sur landing/profils
            if (id.includes('dtfMasterService') || id.includes('jspdf') || id.includes('pdf-lib')) {
              return 'dtfMaster';
            }
            // CustomizerApp core (hors vendor) → chunk dédié admin/customizer
            if (id.includes('CustomizerApp') || id.includes('CustomizerView') || id.includes('FlyerEditor') || id.includes('LayoutEditor') || id.includes('LayoutAdjuster') || id.includes('CreationToolbar') || id.includes('DraggableElement') || id.includes('MobileToolBar')) {
              return 'customizer';
            }
            // Firebase split par sous-package pour tree-shaking optimal
            if (id.includes('firebase/auth') || id.includes('@firebase/auth')) {
              return 'vendor-firebase-auth';
            }
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) {
              return 'vendor-firebase-firestore';
            }
            if (id.includes('firebase/storage') || id.includes('@firebase/storage')) {
              return 'vendor-firebase-storage';
            }
            if (id.includes('firebase/') || id.includes('@firebase/') || id.includes('firebase-')) {
              return 'vendor-firebase-core';
            }
            // React + router → toujours chargé, un seul chunk
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
              return 'vendor-react';
            }
            // Utilitaires lourds : lucide, canvas, charts, crop
            if (id.includes('lucide-react') || id.includes('html2canvas') || id.includes('react-easy-crop') || id.includes('chart.js') || id.includes('react-chartjs')) {
              return 'vendor-utils';
            }
            // DOMPurify (lib de sécurité HTML) → chunk séparé car souvent lazily requis
            if (id.includes('dompurify') || id.includes('purify')) {
              return 'vendor-purify';
            }
          }
        }
      },
      chunkSizeWarningLimit: 600,
      cssCodeSplit: true,
      minify: 'esbuild'
    }
  };
});
