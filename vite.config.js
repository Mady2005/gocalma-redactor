import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
    include: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  }
});
