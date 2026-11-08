import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For GitHub Pages the app is served from /<repo-name>/ — set VITE_BASE when building there.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
});
