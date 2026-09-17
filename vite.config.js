import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Tailwind runs through the Vite plugin above, so no PostCSS plugins are
  // needed. Declaring an inline config stops PostCSS from searching parent
  // directories, where an unrelated project's postcss.config.mjs would be found.
  css: {
    postcss: { plugins: [] },
  },
})
