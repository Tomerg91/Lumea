// @ts-nocheck
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import themePlugin from '@replit/vite-plugin-shadcn-theme-json';
import path, { dirname } from 'path';
// @ts-ignore
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { fileURLToPath } from 'url';
// @ts-ignore
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { viteImagemin } from 'vite-plugin-imagemin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
      ? [await import('@replit/vite-plugin-cartographer').then((m) => m.cartographer())]
      : []),
    // Bundle analyzer - only in production
    ...(process.env.NODE_ENV === 'production' ? [
      visualizer({
        filename: 'dist/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })
    ] : []),
    // Compression plugins for production
    ...(process.env.NODE_ENV === 'production' ? [
      compression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
      // Image optimization
      viteImagemin({
        gifsicle: {
          optimizationLevel: 7,
          interlaced: false,
        },
        optipng: {
          optimizationLevel: 7,
        },
        mozjpeg: {
          quality: 80,
        },
        pngquant: {
          quality: [0.8, 0.9],
          speed: 4,
        },
        svgo: {
          plugins: [
            {
              name: 'removeViewBox',
            },
            {
              name: 'removeEmptyAttrs',
              active: false,
            },
          ],
        },
      })
    ] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },
  root: path.resolve(__dirname, 'client'),
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        remove_unused: true,
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split large libraries into separate chunks for better caching
          if (id.includes('framer-motion')) {
            return 'vendor-animation';
          }
          if (id.includes('react-beautiful-dnd')) {
            return 'vendor-dnd';
          }
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          if (id.includes('socket.io-client')) {
            return 'vendor-socket';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('i18next')) {
            return 'vendor-i18n';
          }
          if (id.includes('react') && id.includes('node_modules')) {
            return 'vendor-react';
          }
          if (id.includes('@radix-ui') || id.includes('@headlessui')) {
            return 'vendor-ui';
          }
          if (id.includes('date-fns') || id.includes('zod')) {
            return 'vendor-utils';
          }
          if (id.includes('@tanstack')) {
            return 'vendor-query';
          }
          // Group remaining node_modules
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
          // Split app code by feature
          if (id.includes('/src/pages/')) {
            return 'app-pages';
          }
          if (id.includes('/src/components/ui/')) {
            return 'app-ui';
          }
          if (id.includes('/src/components/')) {
            return 'app-components';
          }
          if (id.includes('/src/hooks/')) {
            return 'app-hooks';
          }
          if (id.includes('/src/utils/') || id.includes('/src/lib/')) {
            return 'app-utils';
          }
          if (id.includes('/src/services/')) {
            return 'app-services';
          }
        },
        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.(js|ts|tsx)$/, '')
            : 'chunk';
          return `assets/[name]-[hash:8].js`;
        },
        entryFileNames: 'assets/[name]-[hash:8].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1] || '';
          if (/png|jpe?g|gif|svg|ico|webp/.test(ext)) {
            return 'assets/images/[name]-[hash:8].[ext]';
          }
          if (/woff2?|ttf|otf|eot/.test(ext)) {
            return 'assets/fonts/[name]-[hash:8].[ext]';
          }
          if (ext === 'css') {
            return 'assets/styles/[name]-[hash:8].[ext]';
          }
          return 'assets/[name]-[hash:8].[ext]';
        },
      },
      // Enable tree-shaking for better optimization
      treeshake: {
        preset: 'recommended',
        manualPureFunctions: ['console.log', 'console.info', 'console.debug'],
      },
    },
    chunkSizeWarningLimit: 600, // Reduced from 1000 to catch oversized chunks
    sourcemap: false, // Disable sourcemaps in production for smaller files
    cssCodeSplit: true, // Enable CSS code splitting
    reportCompressedSize: false, // Disable gzip reporting for faster builds
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    host: true,
  },
  // Optimize dependency pre-bundling for faster dev server startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      'date-fns',
      'zod',
      'clsx',
      'tailwind-merge',
    ],
    exclude: [
      'framer-motion', // These are heavy and should load on-demand
      'react-beautiful-dnd',
      'recharts',
      'socket.io-client',
    ],
  },
  // CSS optimization
  css: {
    devSourcemap: false,
    postcss: {
      plugins: [
        // Add autoprefixer and cssnano for production
        require('autoprefixer'),
        ...(process.env.NODE_ENV === 'production' 
          ? [require('cssnano')({ preset: 'default' })] 
          : []
        ),
      ],
    },
  },
});
