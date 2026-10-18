import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// Load .env from root workspace if available
const envPath = path.resolve(import.meta.dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key) {
        process.env[key] = val;
      }
    }
  });
}

function localApiPlugin() {
  return {
    name: 'local-api-handler',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/gis/pelanggan' || url === '/api/pelanggan') {
          try {
            const apiModule = await server.ssrLoadModule(path.resolve(import.meta.dirname, '../../api/gis/pelanggan.ts'));
            const handler = apiModule.default || apiModule;
            const customRes = {
              setHeader(k: string, v: string) { res.setHeader(k, v); },
              status(code: number) { res.statusCode = code; return this; },
              json(data: any) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              end() { res.end(); },
            };
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => { body += chunk; });
              req.on('end', () => {
                req.body = body;
                handler(req, customRes);
              });
            } else {
              await handler(req, customRes);
            }
            return;
          } catch (e: any) {
            console.error('Local API error:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e.message }));
            return;
          }
        }

        if (url === '/api/gis/pipa') {
          try {
            const apiModule = await server.ssrLoadModule(path.resolve(import.meta.dirname, '../../api/gis/pipa.ts'));
            const handler = apiModule.default || apiModule;
            const customRes = {
              setHeader(k: string, v: string) { res.setHeader(k, v); },
              status(code: number) { res.statusCode = code; return this; },
              json(data: any) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
              end() { res.end(); },
            };
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => { body += chunk; });
              req.on('end', () => {
                req.body = body;
                handler(req, customRes);
              });
            } else {
              await handler(req, customRes);
            }
            return;
          } catch (e: any) {
            console.error('Local API pipa error:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e.message }));
            return;
          }
        }
        next();
      });
    },
  };
}

const rawPort = process.env.PORT || '5000';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    localApiPlugin(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          runtimeErrorOverlay(),
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
