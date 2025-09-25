import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  build: {
    outDir: 'dist/preview-app',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'preview-app': path.resolve(__dirname, 'preview-app.html'),
        'global': path.resolve(__dirname, 'client/global.css'), // 添加全局 CSS 入口
      },
      output: {
        entryFileNames: 'preview-app.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'global.css') return 'assets/global.[ext]';
          return 'assets/[name]-[hash][extname]';
        },
      }
    },
    // 精简打包配置
    minify: true,
    sourcemap: false,
    target: 'es2015'
  },
  base: '/',
  plugins: [
    react(),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client'),
      '~': path.resolve(__dirname, 'src')
    }
  },
  // 只包含必要的依赖
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      // 确保 Tailwind CSS 相关的依赖被优化
      'tailwindcss/tailwind.css',
      'client/global.css',
    ]
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __APP_METADATA__: JSON.stringify({
      version: process.env.npm_package_version,
      buildTime: new Date().toISOString(),
      previewOnly: true,
      CR_RUNTIME_PATH: process.env.VITE_CR_RUNTIME_PATH || '/cr_runtime'
    }),
    // 确保 `process.env.VITE_CR_RUNTIME_PATH` 在运行时可用
    'process.env.VITE_CR_RUNTIME_PATH': JSON.stringify(process.env.VITE_CR_RUNTIME_PATH || '/cr_runtime'),
  }
})
