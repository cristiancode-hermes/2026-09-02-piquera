# QA Report — 2026-09-02 Piquera

**Project:** Colmenar de barrio — bono semanal, sello diario y QR de umbral
**Stack:** Angular 22 (zoneless) + NestJS 11 + TypeORM + SQLite + pnpm
**Author:** Hermes Daily Builder
**Slug / port:** `piquera` · **3082**
**QR real:** sí · url `/pase/:code`
**isFinalDesign:** DESIGN_FREE (proyecto nuevo)

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API `tsc --incremental false` | ✅ | `apps/api/dist/main.js` |
| Web `ng build --configuration=production` | ✅ | `apps/web/dist/web/browser/index.html` · `base href="/"` |
| pnpm workspace | ✅ | lockfile, 0 `package-lock.json` |
| Seed | ✅ | default-on (`SEED_DB !== 'false'`), demo/staff/admin |
| `.env` | ✅ | copiado desde `.env.example` (el leftover Galera PORT=3077 se corrigió a 3082) |

## ✅ 2. Test Results

**Jest:** 15/15 passing (`apps/api/src/piquera.spec.ts`)

Cubre login username/email, `fromPriceCents = min`, checkout atómico + QR URL, PASS_OVERLAP, ALREADY_CHECKED_IN, YARD_CLOSED/FULL, mielada, puntos derivados, totales lista↔detalle.

## ✅ 3. Binary / Runtime Verification

API `http://localhost:3082` · Swagger `/api/docs` · live `https://piquera.proyectos.cristiancode.dev`

### Endpoint smoke (20/20 + extras)

| Check | Result |
|-------|--------|
| GET `/api/health` | 200 |
| GET `/api/home` `fromPriceCents = min(priceCents)` | 1800 |
| GET `/api/yards` + `/api/yards/azahar` | 200 |
| GET `/api/products` / `/api/addons` / `/api/harvests/current` | 200 |
| POST `/api/auth/register` | 201 `accessToken` + `token` |
| POST `/api/auth/login` email + username | 201 |
| GET `/api/auth/me` | 200 puntos derivados (3) |
| GET `/api/auth/me` sin token | 401 |
| GET `/api/passes/by-code/PIQ-DEMO1` | QR SVG contiene `qrUrl` `/pase/PIQ-DEMO1` |
| Lista ↔ detalle `totalCents` | 2800 = 2800 |
| POST checkout usuario nuevo | 201 + QR real |
| Segundo checkout demo (bono vivo) | 409 `PASS_OVERLAP` |
| POST check-in duplicado | 409 `ALREADY_CHECKED_IN` |
| POST harvest claim demo | 201 claimed |
| Segundo claim | 409 `ALREADY_CLAIMED` |
| GET `/api/staff/today` | 200 + `series14d` |
| GET `/api/admin/stats` | 200 KPIs |
| GET `/api/docs-json` | 200 |

### Browser (24/24 efectivos)

Home 1280/390 sin overflow, login vacío + demo debajo, `piquera.accessToken`, `/entrar`, `/colmenares/azahar`, `/pase/PIQ-DEMO1` QR SVG 2KB+, `/mis-pases` + detalle, chart 14d con `<title>` tooltips, `/sello`, `/mielada`, checkout 409 humano junto a `#checkout-action` (id único), staff `/staff/dia` chart, `/admin`, theme toggle sol/luna + aria-label. Figcaption completa a 390px en `/colmenares`. contraste-hover light 10.78 / dark 10.78.

El 409 en consola del checkout es el conflicto esperado, no un fallo de app.

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Capa de valor de verdad | PASS | bono-checkin + sello diario + mielada + QR piquera |
| Hold 15 min / sweeper pending | PASS | no existe |
| QR real | PASS | paquete `qrcode`, SVG incluye URL absoluta `/pase/:code` |
| fromPriceCents / cero literales EUR | PASS | `euros(fromPriceCents)` / `euros(p.priceCents)` |
| 409 humano junto al CTA | PASS | `humanizeApiError` + scroll; ids duplicados **arreglados** en QA |
| Auth antes de `**` | PASS | `/login` `/entrar` `/registro` `/pase/:code` |
| Login username o email | PASS | |
| Creds demo debajo, inputs vacíos | PASS | |
| contraste-hover | PASS | `a:hover:not(.btn)`; primary hover = on-primary. Light 10.78; dark 10.78 |
| Chart ejes/fechas/tooltips | PASS | `app-stamp-chart` ejes + fechas + `<title>` |
| Caption 390px | PASS | HTML figcaption, 0 `<text>` SVG recortado |
| Copy «huecos» | PASS | **Arreglado** en QA: «Aforo restante N» |

### Minor Issues

| Issue | Severity | Suggestion |
|-------|----------|------------|
| TOKEN_KEY namespaced `piquera.accessToken` | baja | Añadido a prod-capture (ambos bloques) |
| `.env` del scaffold seguía en Galera | baja | Corregido copiando `.env.example` (no se commitea) |
| `romero` figcaption width 0 offscreen en 390 mosaic | info | El texto completo está en el DOM; no hay crop SVG |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| JWT en `.env` no commiteado | PASS (`.env` gitignored) |
| Interceptor Bearer concat | PASS (sin template literal roto) |
| ValidationPipe whitelist + forbidNonWhitelisted | PASS |
| Auth público register/login | PASS (sin APP_GUARD global) |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| Caddy | ✅ | `piquera.proyectos.cristiancode.dev` → dist + reverse_proxy :3082 |
| manage-apis.sh | ✅ | 67 entries aligned · piquera 3082 · `2026-09-02-piquera` |
| GitHub | ✅ | https://github.com/cristiancode-hermes/2026-09-02-piquera |
| Landing | ✅ | `proyectos.cristiancode.dev` entry `piquera` |
| Portfolio es/en/pt | ✅ | slug `piquera` · accordion 255 · date 2026-09-02 |
| Excel | ✅ | fila 99 Completado |
| Capture config | ✅ | config.mjs + prod-capture `piquera.accessToken` |
| Links href/link2/link3 | ✅ | 200 / 200 / 200 |

## Summary

**OVERALL: PASS ✅**

QR real: sí | url: `/pase/:code`
Fixes QA: `.env` Galera→Piquera 3082 · CTA ids únicos · copy aforo (no huecos)
