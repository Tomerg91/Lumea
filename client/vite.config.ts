import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// Safely import componentTagger
let componentTaggerPlugin = null;
try {
  const { componentTagger } = require('lovable-tagger');
  componentTaggerPlugin = componentTagger;
} catch (error) {
  console.warn('Warning: lovable-tagger not available. Component tagging will be skipped.');
}

// Safely import compression
let compressionPlugin = null;
try {
  const { compression } = require('vite-plugin-compression2');
  compressionPlugin = compression;
} catch (error) {
  console.warn('Warning: vite-plugin-compression2 not available. Compression will be skipped.');
}

// Safely import visualizer
let visualizerPlugin = null;
try {
  // Dynamic import to avoid build failures if the package is missing
  const visualizerImport = require('rollup-plugin-visualizer');
  visualizerPlugin = visualizerImport.visualizer;
} catch (error) {
  console.warn('Warning: rollup-plugin-visualizer not available. Bundle analysis will be skipped.');
}

// Add this import for vitest types
/// <reference types="vitest" />

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Create safe plugins array with only available plugins
  const plugins = [
    react(),
    // Only include plugins that are available and relevant for the current mode
    mode === 'development' && componentTaggerPlugin && componentTaggerPlugin(),
  ];

  // Add visualizer only if available
  if (mode === 'production' && visualizerPlugin) {
    plugins.push(
      visualizerPlugin({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      })
    );
  }

  // Add compression plugins for production if available
  if (mode === 'production' && compressionPlugin) {
    // Add brotli compression
    plugins.push(
      compressionPlugin({
        algorithm: 'brotliCompress',
        exclude: [/\.(br)$/, /\.(gz)$/, /\.(png|jpe?g|gif|webp)$/i],
        threshold: 1024, // Only compress files larger than 1KB
      })
    );
    
    // Add gzip compression
    plugins.push(
      compressionPlugin({
        algorithm: 'gzip',
        exclude: [/\.(br)$/, /\.(gz)$/, /\.(png|jpe?g|gif|webp)$/i],
        threshold: 1024,
      })
    );
  }

  return {
    plugins: plugins.filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      // Enable minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
          pure_funcs: mode === 'production' ? ['console.log', 'console.debug', 'console.trace'] : [],
          passes: 2, // Multiple passes for better compression
        },
        output: {
          comments: false, // Remove all comments
        },
        mangle: {
          safari10: true, // Fix Safari 10 issues
        },
      },
      // Configure code splitting
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Create vendor chunks based on node_modules
            if (id.includes('node_modules')) {
              // Heavy libraries that should be isolated
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
              
              // React and core dependencies
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              // UI component libraries
              if (id.includes('@radix-ui') || id.includes('@headlessui')) {
                return 'vendor-ui';
              }
              // Data handling and API libraries
              if (id.includes('@tanstack/react-query') || id.includes('axios') || id.includes('zod')) {
                return 'vendor-data';
              }
              // Utilities
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('lucide-react')) {
                return 'vendor-utils';
              }
              // Fallback for other node_modules
              return 'vendor-other';
            }
            
            // Group application code by directory
            if (id.includes('/src/components/')) {
              return 'app-components';
            }
            if (id.includes('/src/pages/')) {
              return 'app-pages';
            }
            if (id.includes('/src/utils/') || id.includes('/src/lib/')) {
              return 'app-utils';
            }
            if (id.includes('/src/hooks/') || id.includes('/src/contexts/')) {
              return 'app-hooks';
            }
            if (id.includes('/src/services/')) {
              return 'app-services';
            }
            // Default chunk for other app code
            return undefined; // Let Vite decide
          },
          // Ensure chunk size is reasonable
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/[name]-[hash].js`;
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name!.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash].[ext]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(ext)) {
              return `assets/fonts/[name]-[hash].[ext]`;
            }
            return `assets/[name]-[hash].[ext]`;
          },
        },
        // External dependencies that should not be bundled
        external: mode === 'production' ? [] : [],
      },
      // Improve tree-shaking with module mode
      cssCodeSplit: true,
      // Source maps in development, none in production for security
      sourcemap: mode === 'development',
      // Create assets manifest for better caching
      manifest: true,
      // Chunk naming strategy
      chunkSizeWarningLimit: 1000, // 1MB warning limit
      // Emit the correct CSS sourcemaps in production
      cssMinify: mode === 'production' ? 'esbuild' : false,
      // Target modern browsers for smaller bundles
      target: mode === 'production' ? 'es2020' : 'esnext',
      // Optimize for production
      reportCompressedSize: mode === 'production',
      // Write bundle info
      write: true,
    },
    server: {
      host: '::',
      port: 8080,
      hmr: {
        overlay: true,
        port: 8081, // Use a different port for HMR to avoid conflicts
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          timeout: 10000, // 10 second timeout
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err.message, 'for', req.url);
            });
            // Only log in development and for non-metrics endpoints to reduce noise
            if (mode === 'development') {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                if (!req.url?.includes('/metrics/')) {
                  console.log('→', req.method, req.url);
                }
              });
            }
          },
        },
      },
      // Improve development server performance
      fs: {
        strict: false,
      },
      // Cache optimizations
      force: false, // Don't force dependency re-optimization on every start
    },
    // Add test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      // Optional: Enable CSS processing if needed for tests
      // css: true,
    },
    // Optimize dependencies prebuilding
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@headlessui/react',
        'axios',
        'date-fns',
      ],
      // Force excluded modules to be fine-grained optimized
      exclude: [],
    },
    // Enable top-level await support
    esbuild: {
      target: ['es2020']
    },
    // CSS optimization
    css: {
      devSourcemap: mode === 'development',
      preprocessorOptions: {
        scss: {
          charset: false,
        },
      },
    },
  };
});
