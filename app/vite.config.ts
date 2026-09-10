import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = 'es2020';

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.zip'],
  base: '/modus/',
  plugins: [react()],
  resolve: {
    alias: {
      '@treeoftables/lib': '@treeoftables/lib/browser',
    },
  },
  build: {
    target,
    /*
    rollupOptions: {
      external: [ '#file-type', '#fetch', '#event-iterator' ]
    }*/
  },
  optimizeDeps: {
    exclude: ['@modusjs/convert', '@treeoftables/lib', '@treeoftables/lib/browser'],
    esbuildOptions: {
      target,
    },
  },
  esbuild: {
    target,
  },
  server: {
    open: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    'process.env': {} // to avoid "Uncaught ReferenceError: process is not defined"
  },
});