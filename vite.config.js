import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      // "prompt" en comptes de "autoUpdate": no volem substituir el codi
      // en calent mentre algú està omplint un formulari — s'avisa amb un
      // botó (veure src/pwa.js) i s'aplica quan la persona ho decideixi.
      registerType: 'prompt',
      injectRegister: false,
      workbox: {
        // navigateFallback cobreix obrir una ruta directament (p. ex.
        // des de la icona instal·lada, o recarregant /entrades) sense
        // xarxa: sempre es serveix l'index.html cachejat i el router de
        // Vue ja renderitza la vista correcta.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
      manifest: {
        id: '/',
        name: 'Turòn — Traçabilitat',
        short_name: 'Turòn',
        description: "Traçabilitat de l'obrador de Fleca i Pastisseria Turòn",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#faf6ee',
        theme_color: '#ffba00',
        lang: 'ca',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
})
