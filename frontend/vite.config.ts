import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = (env.VITE_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      // The remaining large chunk is the on-demand 360 panorama viewer vendor bundle.
      // It is lazy-loaded and no longer affects the initial app path.
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return undefined;
            }

            if (id.includes('@photo-sphere-viewer/core')) {
              return 'panorama-core-vendor';
            }

            if (id.includes('/three/')) {
              return 'three-vendor';
            }

            if (
              id.includes('react-router-dom') ||
              id.includes('/react-router/') ||
              id.includes('@remix-run/router')
            ) {
              return 'router-vendor';
            }

            if (id.includes('@supabase/supabase-js')) {
              return 'supabase-vendor';
            }

            if (id.includes('qrcode.react') || id.includes('react-qr-code') || id.includes('/qrcode/')) {
              return 'qr-vendor';
            }

            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor';
            }

            return 'vendor';
          },
        },
      },
    },
  };
});
