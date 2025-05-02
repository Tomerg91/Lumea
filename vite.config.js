import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import themePlugin from '@replit/vite-plugin-shadcn-theme-json';
import path, { dirname } from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import imagemin from 'vite-plugin-imagemin';
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
        visualizer({
            open: true,
            gzipSize: true,
            brotliSize: true,
        }),
        compression({
            algorithm: 'gzip',
            ext: '.gz',
        }),
        compression({
            algorithm: 'brotliCompress',
            ext: '.br',
        }),
        imagemin({
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
        }),
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
            },
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
                    'utils-vendor': ['date-fns', 'zod'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
        sourcemap: true,
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
});
