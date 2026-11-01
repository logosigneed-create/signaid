import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const nodeRequire = createRequire(import.meta.url);

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

const createProfileApiPlugin = () => ({
  name: 'create-profile-api',
  configureServer(server: any) {
    server.middlewares.use('/api/create-profile', (req: any, res: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { createProfile } = nodeRequire('./scripts/profileCreatorService.cjs');
            const result = await createProfile(data.url);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            console.error('[Vite /api/create-profile] Erreur:', err);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: err?.message || 'Erreur interne' }));
          }
        });
      } else {
        res.statusCode = 405;
        res.end('Method Not Allowed');
      }
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    root: process.cwd(),
    base: '/',
    server: {
      port: 3847,
      strictPort: true,
      cors: true,
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
        '/api/firebase-storage': {
          target: 'https://firebasestorage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/firebase-storage/, ''),
        },
        '/api/gemini-proxy': {
          target: 'https://us-central1-signaid-prod.cloudfunctions.net/generateTryOnImageProxy',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini-proxy/, ''),
        },
        // API locale : create-profile, prospects, health → Express server port 3848
        '/api': {
          target: 'http://127.0.0.1:3848',
          changeOrigin: true,
          // Pas de rewrite : /api/create-profile reste /api/create-profile côté serveur
        },
      },
    },
    preview: {
      port: 3847,
      strictPort: true,
    },
    optimizeDeps: {
      exclude: ['@imgly/background-removal', 'onnxruntime-web'],
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
      syncFunctionsHtmlPlugin(),
      createProfileApiPlugin()
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.VITE_GOOGLE_GENAI_API_KEY': JSON.stringify(env.VITE_GOOGLE_GENAI_API_KEY || env.VITE_GEMINI_API_KEY || '')
    },
    resolve: {
      preserveSymlinks: true,
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        input: path.resolve(process.cwd(), 'index.html'),
        external: [
          'onnxruntime-web',
          'onnxruntime-web/webgpu',
          /^onnxruntime-web(\/.*)?$/
        ],
        onwarn(warning: any, defaultHandler: any) {
          if (warning?.code === 'UNRESOLVED_IMPORT' && warning?.source?.includes('onnxruntime-web')) {
            return;
          }
          defaultHandler(warning);
        },
        output: {
          manualChunks(id) {
            // Customizer & DTF Master (regroupés en un chunk unique pour éliminer la dépendance circulaire)
            if (
              id.includes('dtfMasterService') ||
              id.includes('jspdf') ||
              id.includes('pdf-lib') ||
              id.includes('CustomizerApp') ||
              id.includes('CustomizerView') ||
              id.includes('FlyerEditor') ||
              id.includes('LayoutEditor') ||
              id.includes('LayoutAdjuster') ||
              id.includes('CreationToolbar') ||
              id.includes('DraggableElement') ||
              id.includes('MobileToolBar')
            ) {
              return 'customizer-dtf';
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
