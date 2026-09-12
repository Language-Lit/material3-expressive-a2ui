import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'playground',
  publicDir: '../public',
  plugins: [react()],
})
