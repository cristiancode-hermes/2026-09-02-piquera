# Architecture — Piquera

Colmenar B2C Angular 22 + NestJS. Núcleo **bono-checkin**: pase de 7 días civiles (Europe/Madrid), un sello diario por usuario, mielada con tarros.

## Decision Record

- Núcleo B2C: bono-checkin
- Loop hueco+hold+QR: no
- QR real: sí | url: `/pase/:code`
- Login: centered card
- Port: 3082
- pnpm workspaces

## Capas

- `apps/web` zoneless signals, interceptor lee `piquera.accessToken`
- `apps/api` TypeORM better-sqlite3 / Neon postgres
- Mutex in-process `withLock` para checkout, sello y claim
