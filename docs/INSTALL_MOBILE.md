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

## Un cop instal·lada

- S'obre a pantalla completa, sense la barra d'adreces del navegador.
- Si hi ha una versió nova de l'app, apareixerà un avís a dalt de tot ("🔄 Hi ha una versió nova de l'app") amb un botó per actualitzar — no cal desinstal·lar ni tornar a instal·lar res.
- L'aplicació torna a obrir-se sempre des de la mateixa icona.

## Estat actual (es completarà a mesura que avancin les properes fases)

Ara mateix, un cop instal·lada, l'aplicació **obre correctament sense connexió** (el disseny, els formularis i la navegació funcionen), però encara necessita connexió per carregar o guardar dades (ingredients, lots, entrades...). Això canviarà quan es completi la capa de base de dades local (IndexedDB) prevista a les properes fases — ho recull `docs/OFFLINE_ARCHITECTURE.md`.
