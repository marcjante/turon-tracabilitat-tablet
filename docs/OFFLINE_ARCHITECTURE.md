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

## Fase 3 — IndexedDB + lectures local-first (completada)

**Què cobreix**: totes les dades es poden **consultar** sense connexió (catàlegs, entrades, lots en ús, semielaborats, productes, incidències, cerca de lots, exportació a Excel). **No cobreix** encara escriure sense connexió: crear una entrada, obrir un lot en ús, etc. continua necessitant xarxa — això és la fase 4-5. La traçabilitat (`/traca/endavant`, `/traca/enrere`) continua sent només en línia sempre, perquè és un `WITH RECURSIVE` de Postgres sense equivalent local.

### Peces

- **`src/db/index.js`**: esquema de Dexie amb les entitats reals del backend — `ingredients, proveidors, elaboracions, receptes, lots, lotsEnUs, incidencies` + `meta`. **No hi ha taula `consums`**: el backend no exposa cap endpoint per llistar-los en bloc (només es creen/eliminen sobre un lot concret), i res al frontend els necessita localment encara.
- **`src/db/sync.js`** (`refrescarTot()`): còpia completa (no incremental) de Railway cap a IndexedDB, cridada un cop a l'arrencada (`src/main.js`) si hi ha xarxa. **Detall important**: cap dels tres endpoints de llista de lots (`/entrades`, `/semielaborats`, `/productes`) retorna el camp `tipus` — només ho fan els endpoints d'un sol lot. La primera versió d'aquest fitxer ho oblidava i guardava lots sense `tipus`, cosa que feia que totes les llistes "recents" sortissin buides offline malgrat que les dades hi eren — es va detectar llegint directament IndexedDB amb Playwright, no només mirant la pantalla. També fa un "backfill" dels lots anul·lats referenciats per alguna incidència (les llistes normals els exclouen).
- **`src/db/repo.js`**: totes les lectures de les vistes hi passen (mai directament per `src/api.js`). Reprodueix exactament els mateixos filtres i ordre que el backend (p. ex. `entrades({ingredient_id})`, `elaboracions({tipus, actiu})`) perquè cap vista hagi de canviar de comportament.
- **Escriptures**: continuen anant directes a `src/api.js` (sense canvis), però després de cada creació/modificació amb èxit es fa també `db.<taula>.put(...)` amb la resposta del servidor — així la llista es refresca a l'instant igual que abans, sense esperar la propera sincronització completa. Per a `obrirLotEnUs` es reprodueix a mà la regla de negoci 1 (tancar l'anterior lot en ús del mateix ingredient) sobre la còpia local, perquè el backend no torna aquest segon registre modificat a la resposta.

### Verificat

Amb Playwright: sincronització inicial en línia (comprovat llegint IndexedDB directament, no només la pantalla) → offline → cada vista (`/entrades`, `/lots-en-us`, `/semielaborats`, `/productes`, `/incidencies`) mostra desplegables i llistes "recents" amb dades reals, no buides; exportació a Excel offline (`baixarExcel`) genera un fitxer vàlid amb dades reals sense cap petició de xarxa.

## Pendent (properes fases, no implementat encara)

- **Fase 4-5**: escriptures local-first amb `client_id` (UUID) — crear productes/lots/incidències sense xarxa.
- **Fase 6-7**: cua de sincronització (`sync_queue`) + push/pull contra Railway.
- **Fase 8**: idempotència al backend i resolució del cas límit real d'aquest domini: el `codi` de lot generat offline (`PREFIX-DDMMYY-NN`) pot col·lidir entre dos dispositius — veure l'auditoria original per al detall.
- **Fase 9**: exportació/importació de còpia de seguretat local.

Aquest document s'ampliarà amb una secció per fase a mesura que es completin.
