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
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug', 'console.trace'],
        },
        output: {
          comments: false, // Remove all comments
        },
      },
      // Configure code splitting
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Create vendor chunks based on node_modules
            if (id.includes('node_modules')) {
              // React and core dependencies
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'vendor-react';
              }
              // UI component libraries
              if (id.includes('@headlessui') || id.includes('@radix-ui')) {
                return 'vendor-ui';
              }
              // Data handling and API libraries
              if (id.includes('axios') || id.includes('swr') || id.includes('zustand')) {
                return 'vendor-data';
              }
              // Utilities
              if (id.includes('date-fns') || id.includes('lodash') || id.includes('uuid')) {
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
            if (id.includes('/src/utils/')) {
              return 'app-utils';
            }
            if (id.includes('/src/hooks/')) {
              return 'app-hooks';
            }
            // Default chunk for other app code
            return 'app-core';
          },
          // Ensure chunk size is reasonable
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      // Improve tree-shaking with module mode
      cssCodeSplit: true,
      // Source maps in development, none in production
      sourcemap: mode !== 'production',
      // Create assets manifest
      manifest: true,
      // Chunk naming strategy
      chunkSizeWarningLimit: 1000, // 1MB warning limit
      // Emit the correct CSS sourcemaps in production
      cssMinify: true,
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
