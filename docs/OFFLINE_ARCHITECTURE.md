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

## Fase 4 — Escriptura offline de la ficha 1 (Entrada) amb UUID (completada)

**Què cobreix**: crear una entrada de materia primera funciona sense connexió, amb cua de sincronització i idempotència real contra el backend. **Només Ficha 1** — la resta de fichas (lots en ús, semielaborats, productes, incidències) encara escriuen només en línia; s'estendran a la fase 5 amb el mateix patró.

### Per què només Ficha 1 de moment

El `codi` d'un lot de materia primera és el `lot_proveidor` que teclea la persona (ve de l'albarà) — no el genera el backend, així que dos dispositius creant offline no poden col·lidir. En canvi, semielaborats i productes generen el seu `codi` al servidor (`PREFIX-DDMMYY-NN`, seqüencial) — dos dispositius offline el mateix dia generarien el mateix codi. Aquest cas es resoldrà a la fase 5 (probablement: el codi "definitiu" es confirma en sincronitzar, no en crear).

### Peces

- **Backend** (`app/models/lots.py`, `alembic/versions/0003_add_client_id_to_lot.py`): columna `client_id` (UUID, nullable, unique) a `lot`. `POST /entrades` accepta `client_id` opcional; si ja existeix un lot amb aquest `client_id`, `crear_entrada()` retorna el lot existent en comptes de crear-ne un altre (`app/services/entrades.py`). Verificat en producció (Railway) enviant la mateixa petició dues vegades: mateix `id` retornat, una sola fila a la base de dades.
- **`src/db/queue.js`**: taula `syncQueue` (Dexie, `clientId` com a clau primària). Cada operació pendent té un `gestor` (de moment només `CREATE_ENTRADA`) que sap com enviar-se i com actualitzar la còpia local quan el servidor confirma. Distingeix error de xarxa (es queda `pending`, es torna a intentar) d'error real del servidor (`ApiError` — p. ex. 409/422 — passa a `status: 'error'` i no es reintenta sol, perquè tornar-ho a enviar fallaria igual).
- **`src/views/EntradaView.vue`**: si `api.crearEntrada()` falla per una raó que no és `ApiError` (offline, timeout...), es guarda igualment a `db.lots` amb un **id temporal negatiu** (`-Date.now()`, mai xoca amb un id real del servidor) i s'afegeix a la cua. La llista "El que has apuntat fa poc" marca aquests registres amb una etiqueta "⏳ Pendent".
- **`src/db/sync.js`**: `refrescarTot()` crida `processarCua()` abans de baixar dades (així el pull ja inclou els lots acabats de sincronitzar amb el seu id real), i protegeix els lots encara pendents (id negatiu) perquè el `clear()`+`bulkPut()` del refresc no els esborri si encara no s'han pogut enviar.
- **`src/main.js`**: `refrescarTot()` es crida a l'arrencada (si hi ha xarxa) i cada vegada que el navegador dispara l'event `online`.
- **`App.vue`**: banner taronja "🟠 N canvis pendents de sincronitzar" quan `syncQueue` té elements pendents (via `liveQuery` de Dexie — reactiu de veritat, no per sondeig).

### Verificat

Amb Playwright, contra l'API real de Railway (no un mock): crear una entrada offline → apareix a l'instant amb l'etiqueta "Pendent" → tancar la pestanya i obrir-ne una de nova (mateix IndexedDB), encara offline → **el lot hi continua sent** → reconnectar (`online` event) → la cua es processa sola → IndexedDB queda amb **una sola** fila amb aquest codi i el seu `id` real del servidor → la cua queda buida. Cap duplicat, cap pèrdua.

## Fase 5 — Escriptura offline de la resta de fichas (completada)

**Què cobreix**: lots en ús (obrir i tancar), semielaborats, productes i incidències funcionen sense connexió amb el mateix patró que la fase 4 (UUID, cua, idempotència). Amb això, **les 5 fichas** funcionen completament offline.

### Com es va resoldre el risc del codi seqüencial (semielaborats/productes)

La solució no és calcular el codi al dispositiu (col·lidiria entre dispositius), sinó **no calcular-lo mai localment**: el registre pendent es guarda amb `codi: null` i una etiqueta "codi pendent" a la interfície; `app/services/codis.py` no canvia gens — el codi definitiu (`PREFIX-DDMMYY-NN`) es genera exactament igual que avui, només que en el moment en què la creació arriba de veritat al servidor (en sincronitzar), no en el moment de crear-la al dispositiu. Verificat: un semielaborat creat offline es guarda amb `codi: null` i, en sincronitzar, rep un codi real (`PPE-230926-01`) assignat pel servidor.

### Peces noves

- **Backend**: `client_id` afegit també a `lotenus` i `incidencia` (`alembic/versions/0004_...py`) — `lot` ja el tenia de la fase 4 i cobreix semielaborats/productes perquè comparteixen taula. Idempotència a `obrir_lot_en_us`, `crear_produccio` i `crear_incidencia` (totes retornen l'existent per `client_id` en comptes de repetir efectes secundaris — tancar l'anterior lot en ús, consumir un lot, calcular `traca_endavant` — en un reintent). `tancar_lot_en_us` és idempotent per **estat** (mateix `fi` ja guardat), no per `client_id`, perquè és una transició d'estat, no una creació.
- **`src/db/queue.js`**: gestors nous `CREATE_LOT_EN_US`, `TANCAR_LOT_EN_US`, `CREATE_SEMIELABORAT`, `CREATE_PRODUCTE`, `CREATE_INCIDENCIA`.
- **Bug real trobat i corregit durant la verificació**: la cua processava els elements en l'ordre "natural" de `clientId` (un UUID, sense relació amb quan es va crear), no per `createdAt`. Com que algunes operacions depenen causalment de l'anterior (p. ex. un semielaborat pot necessitar que "obrir lot en ús" ja s'hagi processat), processar-les en l'ordre equivocat produïa errors reals del servidor (409) que no haurien passat si s'haguessin enviat en l'ordre en què la persona les va fer. Corregit ordenant per `createdAt` abans de processar.
- **Referències a entitats encara no sincronitzades**: cap vista permet triar com a referència un registre amb id pendent (negatiu) — `LotSearchField` (incidències, traçabilitat) i el selector de lots de semielaborat a Productes filtren `id > 0`. És una frontera de disseny deliberada per no haver de resoldre encara el remapeig d'ids entre dispositius per a referències creuades (p. ex. crear una incidència sobre un lot que un altre dispositiu encara no ha sincronitzat) — es revisarà si cal a una fase posterior.
- **Límit conegut**: `tancar_lot_en_us` offline actualitza un registre amb id **positiu** (real), no negatiu — a diferència de les creacions, `refrescarTot()` només protegeix explícitament els ids negatius de ser sobreescrits pel pull. Si el dispositiu creu que està en línia però el `processarCua()` d'aquell mateix refresc falla (p. ex. el servidor respon però amb error temporal), el pull posterior podria revertir un tancament fet en local fins que es torni a sincronitzar. Cas límit poc probable (la finestra és molt curta), documentat aquí en comptes de solucionar-lo ara amb un sistema de "registres bruts" més gran.

### Verificat

Amb Playwright, contra l'API real de Railway: obrir un lot en ús offline + crear una incidència offline (referenciant un lot ja sincronitzat) → reconnectar → totes dues sincronitzen amb el seu id real, `afectats_snapshot` calculat pel servidor, cua buida; crear un semielaborat offline amb una recepta que exigeix un ingredient concret sense tenir-lo obert → error real del servidor capturat correctament (`status: 'error'`, no bucle infinit); crear un semielaborat offline sense aquest problema → sincronitza amb un codi real assignat pel servidor. Idempotència de `tancar_lot_en_us` (mateix `fi`) coberta per test de backend (`test_tancar_lot_amb_mateix_fi_es_idempotent`).

## Pendent (properes fases, no implementat encara)

- **Fase 6**: botó "Sincronitzar ara" manual i pantalla d'estat (última sincronització, errors, operacions fallides) — ara mateix la sincronització és automàtica però invisible més enllà del banner de pendents.
- **Fase 7**: sincronització incremental (`updated_since`) en comptes del pull complet actual — no cal encara pel volum d'un sol obrador, però evitaria baixar-ho tot cada vegada.
- **Fase 8**: conflictes reals entre dispositius (dos tablets modificant el mateix registre) — encara no s'ha donat el cas perquè totes les escriptures offline són de creació (o, per a `tancar_lot_en_us`, una transició d'estat idempotent), no edició lliure.
- **Fase 9**: exportació/importació de còpia de seguretat local.

Aquest document s'ampliarà amb una secció per fase a mesura que es completin.
