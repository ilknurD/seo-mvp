import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(() => {
  return {
    base: './',
    build: {
      outDir: 'build',
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    define: {
      'process.env': {},
    },
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(process.cwd(), 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      proxy: {
        // Mevcut /sites proxy kuralı
        '/sites': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false, // Eğer backend HTTP ise
        },
        // Yeni eklenen /keyword-analysis proxy kuralı
        '/keyword-analysis': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false, // Eğer backend HTTP ise
        },
        // Diğer backend rotalarını da buraya eklemen önerilir
        // Örneğin, /auth/* veya /auth
        '/auth': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
        '/gsc_sites': { // Loglarda gördüğün bu rota da eklenebilir
            target: 'http://localhost:5000',
            changeOrigin: true,
            secure: false,
        },
        // GSC ile ilgili başka rotaların varsa onları da ekle:
        // '/gsc_pages': {
        //   target: 'http://localhost:5000',
        //   changeOrigin: true,
        //   secure: false,
        // },
      },
    },
  }
})
