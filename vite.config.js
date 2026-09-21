import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: keep '/' for Cloudflare Pages. For a GitHub Pages project site
// (username.github.io/handbook-app), change base to '/handbook-app/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
