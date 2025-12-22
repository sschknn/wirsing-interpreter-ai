import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      root: '.',
      server: {
        port: 3000,
        host: true,
        strictPort: false,
        hmr: {
          overlay: true,
          port: 24678,
          host: 'localhost'
        },
        fs: {
          strict: false
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: ['@google/genai', 'react', 'react-dom']
      },
      build: {
        target: 'esnext',
        minify: 'terser',
        cssMinify: true,
        sourcemap: mode === 'development',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          },
          output: {
            // Optimize chunk file names
            chunkFileNames: 'js/[name]-[hash].js',
            
            // Optimize entry file names
            entryFileNames: 'js/[name]-[hash].js',
            
            // Optimize asset file names
            assetFileNames: (assetInfo) => {
              const info = assetInfo.name?.split('.') || [];
              const ext = info[info.length - 1];
              if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(ext || '')) {
                return `images/[name]-[hash].${ext}`;
              }
              if (/\.(css)$/i.test(ext || '')) {
                return `css/[name]-[hash].${ext}`;
              }
              return `assets/[name]-[hash].${ext}`;
            },
            
            // Manual chunk splitting for better performance
            manualChunks: (id: string) => {
              // Split large vendor libraries
              if (id.includes('node_modules/@google/genai')) {
                return 'vendor-genai';
              }
              if (id.includes('node_modules/react')) {
                return 'vendor-react';
              }
              if (id.includes('node_modules')) {
                return 'vendor';
              }
              // Split services by functionality
              if (id.includes('services/aiService')) {
                return 'ai-service';
              }
              if (id.includes('services/')) {
                return 'services';
              }
            }
          },
          
          // Enhanced tree shaking
          treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false,
            tryCatchDeoptimization: false,
            unknownGlobalSideEffects: false
          },
          
          // External dependencies (but keep our services internal)
          external: (id: string) => {
            // Keep only external node_modules external
            return id.startsWith('node_modules/') && !id.includes('@google/genai');
          }
        }
      },
      
      // Advanced optimization settings
      esbuild: {
        // Target modern browsers
        target: 'es2020',
        // Drop console in production
        drop: mode === 'production' ? ['console', 'debugger'] : []
      },
      
      // Compression settings
      preview: {
        port: 4173,
        strictPort: true
      }
    };
  });
