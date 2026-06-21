import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

const configPath = path.resolve(__dirname, '../config.json')
let config = { backend_port: 8085, frontend_port: 5173 }
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  } catch (e) {}
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: config.frontend_port,
    open: false,
    strictPort: true
  },
  define: {
    'import.meta.env.VITE_BACKEND_PORT': JSON.stringify(config.backend_port.toString())
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
