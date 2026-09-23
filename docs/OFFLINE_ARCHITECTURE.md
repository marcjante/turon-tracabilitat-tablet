# Arquitectura offline de Turòn

Document viu: s'amplia a mesura que avancen les fases. Reflecteix únicament el que **ja existeix** al codi, no el disseny final complet (això evita documentar coses que encara no funcionen).

## Per què

Turòn s'utilitza des d'una tablet a l'obrador. Avui (abans d'aquest treball) depenia 100% de tenir xarxa fins a Railway: si no hi havia connexió, l'aplicació no es podia fer servir en absolut. L'objectiu és que el dispositiu pugui treballar de manera autònoma, amb Railway com a servidor de sincronització en segon pla, no com a requisit per obrir l'app.

## Fase 2 — PWA instal·lable + service worker (completada)

**Què cobreix**: que l'aplicació es pugui instal·lar a la pantalla d'inici i que el "shell" (HTML/CSS/JS/icones) es carregui sense xarxa. **No cobreix** encara dades: els formularis carreguen buits si no hi ha connexió, perquè encara no hi ha cap còpia local de les dades — això és la fase 3.

### Peces

- **`vite-plugin-pwa`** (`vite.config.js`), en mode `generateSW`: genera automàticament, a cada build, un service worker (`dist/sw.js`) que precacheja *tots* els fitxers estàtics de `dist/` (JS, CSS, HTML, icones) — inclosos els chunks carregats de manera diferida per vista (`EntradaView`, `IncidenciesView`...). Es va provar primer un service worker escrit a mà amb `stale-while-revalidate` només sobre el que l'usuari havia visitat; **va fallar** en navegar offline a una vista que no s'havia obert encara durant la sessió amb xarxa, perquè el seu chunk JS/CSS mai s'havia arribat a cachejar. `vite-plugin-pwa` ho soluciona generant una llista completa (manifest de precache) en temps de build, no en temps d'execució.
- **`registerType: 'prompt'`**: el service worker nou no substitueix el que està actiu automàticament (podria tallar algú a mig formulari) — s'avisa (`src/pwa.js`, banner a `App.vue`) i s'aplica quan la persona prem "Actualitzar".
- **`navigateFallback: '/index.html'`**: si algú obre una ruta directament (p. ex. `/entrades`, o l'aplicació instal·lada arrenca a `start_url`) sense xarxa, es serveix l'`index.html` cachejat i el router de Vue Router (client-side) renderitza la vista correcta.
- **Manifest** (`vite.config.js`, secció `manifest`): nom, icones (192/512, "any" i "maskable"), `display: standalone`, colors de marca. Les icones (`public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`) es van generar a partir del logotip real de Fleca i Pastisseria Turòn (la "T" decorativa), no d'un disseny genèric.
- **iOS**: Safari no llegeix `beforeinstallprompt` ni instal·la des del manifest sol — calen les metaetiquetes `apple-mobile-web-app-*` i `apple-touch-icon` a `index.html`, i instal·lar-se manualment via "Afegeix a la pantalla d'inici" (`docs/INSTALL_MOBILE.md`).
- **Indicador de connexió** (`src/useOnlineStatus.js`, banner vermell a `App.vue`): reflecteix `navigator.onLine`. És només informatiu ara mateix — encara no bloqueja ni permet treballar sense connexió, perquè no hi ha dades locals.
- **nginx** (`nginx.conf`, servei `tablet` a Railway): `sw.js` i `index.html` es serveixen amb `Cache-Control: no-cache` (si no, un dispositiu es podria quedar indefinidament amb una versió antiga sense saber-ho); els fitxers dins `/assets/` (amb hash de Vite al nom) es cachegen de manera agressiva i immutable.

### Verificat

Amb Playwright, contra el build de producció (`vite preview`, no `vite dev`): primera càrrega amb xarxa → `context.setOffline(true)` → recàrrega completa de `/` → funciona; navegació SPA a `/entrades` offline → funciona; obertura **directa** (no SPA) de `/entrades` offline → funciona, formulari visible. Els únics errors de consola offline són els `fetch` a l'API de Railway fallant (esperat: encara no hi ha capa de dades local).

## Pendent (properes fases, no implementat encara)

- **Fase 3**: IndexedDB (Dexie.js) amb les entitats reals del backend (`ingredients, proveidors, elaboracions, receptes, lots, consums, lotsEnUs, incidencies`) — no un esquema genèric de "productes/stock".
- **Fase 4-5**: cada vista llegint/escrivint contra el repositori local en comptes de `src/api.js` directament.
- **Fase 6-7**: cua de sincronització + `client_id` (UUID) per crear registres offline sense col·lisionar amb els IDs enters del backend.
- **Fase 8**: idempotència al backend i resolució del cas límit real d'aquest domini: el `codi` de lot generat offline (`PREFIX-DDMMYY-NN`) pot col·lidir entre dos dispositius — veure l'auditoria original per al detall.
- **Fase 9**: exportació/importació de còpia de seguretat local.

Aquest document s'ampliarà amb una secció per fase a mesura que es completin.
