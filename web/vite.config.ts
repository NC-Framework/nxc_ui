import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * A NUI is loaded from disk by the game client, not served over HTTP, so every
 * asset path must be relative. An absolute path resolves against the root of a
 * filesystem the client does not have, and the panel renders blank with no error.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Inlined so the resource ships three files rather than a directory of
    // hashed chunks that the manifest would have to enumerate.
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: {
        entryFileNames: 'nxc_ui.js',
        assetFileNames: 'nxc_ui[extname]',
      },
    },
  },
});
