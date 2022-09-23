import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: "/modus/",
  plugins: [react()],
  server: {
    open: true
  },
  define: {
    '__APP_VERSION__': JSON.stringify(process.env.npm_package_version)
  }
})
