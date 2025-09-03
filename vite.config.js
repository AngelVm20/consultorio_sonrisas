import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-migrations',
      closeBundle() {
        const src = resolve(__dirname, 'db/migrations.sql')
        const dest = resolve(__dirname, 'dist/migrations.sql')
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest)
        }
      },
    },
  ],
})
