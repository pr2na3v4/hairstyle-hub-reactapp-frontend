import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [],
      manifest: {
        name: 'HairstyleHub',
        short_name: 'HairstyleHub',
        description: 'Find Your Perfect Haircut',
        theme_color: '#ffffff',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        screenshots: [
          {
            src: '/mobile-screenshot.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: '/desktop-screenshot.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide'
          }
        ],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        // Reduced size of initial precache by focusing on core assets
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        globIgnores: ['**/offline copy.html', '**/mobile-screenshot.png', '**/desktop-screenshot.png'],
        // Increase the size limit for the precache manifest (default is 2MB)
        maximumFileSizeToCacheInBytes: 3000000, 
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst', // Changed from NetworkOnly for better PWA feel
            options: {
              cacheName: 'pages-cache',
              plugins: [
                {
                  handlerDidError: async () => {
                    return await caches.match('/offline.html');
                  },
                },
              ],
            },
          },
          {
            // Cache images from Cloudinary or your backend
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
              },
            },
          },
        ],
      }
    })
  ],
  build: {
    // --- Manual Chunking Strategy ---
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Move core libraries to a 'vendor' chunk
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return '@framework';
            }
            if (id.includes('firebase')) {
              return '@firebase';
            }
            if (id.includes('@tanstack') || id.includes('sweetalert2')) {
              return '@ui-libs';
            }
            return 'vendor'; // everything else from node_modules
          }
        }
      }
    },
    // Helpful to see exactly what is being built
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true, // Ensures CSS is also split per page
  }
});