# Instal·lar Turòn al mòbil o a la tablet

L'aplicació és una PWA (Progressive Web App): s'instal·la des del navegador, sense passar per cap botiga d'aplicacions.

URL: **https://tablet-production-482e.up.railway.app**

## Android (tablet o mòbil)

1. Obre l'URL amb **Chrome**.
2. Apareixerà un avís "Instal·la l'app" a la part de baix de la pantalla d'inici de Turòn — toca'l. Si no apareix, toca els tres puntets de dalt a la dreta de Chrome → **Instal·la l'aplicació**.
3. Confirma. La icona de Turòn (el "T") apareixerà a la pantalla d'inici, com qualsevol altra app.

## iPhone / iPad

Safari no mostra cap avís automàtic — cal fer-ho manualment:

1. Obre l'URL amb **Safari** (no funciona amb Chrome a iOS).
2. Toca la icona de compartir (el quadrat amb la fletxa cap amunt), a la barra inferior (iPhone) o superior (iPad).
3. Baixa fins a **"Afegeix a la pantalla d'inici"** i toca-ho.
4. Confirma el nom (Turòn) i toca **Afegeix**.

## Mac / ordinador (per provar-ho, no és l'ús habitual)

L'app és per a tablet, però es pot instal·lar igual en un ordinador per fer proves:

**Chrome / Edge**: obre l'URL, i a la barra d'adreces (a la dreta) hi apareix una icona d'instal·lar (un requadre amb una fletxa, o un monitor amb un +) — clica-la i confirma. També ho trobaràs al menú de tres puntets → **Instal·la Turòn…**

**Safari** (macOS Sonoma o posterior): obre l'URL → menú **Fitxer → Afegeix al Dock…** → confirma.

⚠️ **El que NO funciona**: arrossegar la icona del web o el text de l'adreça a l'Escriptori/Baixades, o fer "Desa la pàgina com a…". Això només guarda l'HTML en cru (un fitxer d'un parell de KB) i no s'obrirà correctament perquè li falten tots els altres fitxers (JS, CSS, icones) que necessita — no és una instal·lació real, encara que el Finder li posi una icona d'aplicació.

## Un cop instal·lada

- S'obre a pantalla completa, sense la barra d'adreces del navegador.
- Si hi ha una versió nova de l'app, apareixerà un avís a dalt de tot ("🔄 Hi ha una versió nova de l'app") amb un botó per actualitzar — no cal desinstal·lar ni tornar a instal·lar res.
- L'aplicació torna a obrir-se sempre des de la mateixa icona.

## Funciona sense connexió

Un cop instal·lada i oberta almenys un cop amb xarxa (perquè es baixi la còpia local de les dades), l'aplicació funciona sencera sense connexió: consultar i **crear** entrades, lots en ús, semielaborats, productes i incidències. Els canvis fets sense xarxa es guarden en local i es sincronitzen sols quan torna la connexió — es pot veure l'estat a **Configuració → Sincronització**. Detall tècnic complet a `docs/OFFLINE_ARCHITECTURE.md`.

L'única part que sempre necessita xarxa és la traçabilitat (buscar "d'on ve" / "on ha anat" un lot).
