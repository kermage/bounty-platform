# Bounty Platform

Monorepo scaffold for a Cardano bounty marketplace.

## Stack
- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Contracts: Aiken
- Database: PostgreSQL
- Network: Cardano Preview testnet

## Packages
- `frontend`
- `backend`
- `contracts`

## Local setup
1. Copy env files as needed.
2. Start infra: `docker compose up -d`
3. Install deps: `pnpm install`
4. Run apps with workspace scripts.

## Docs
- API: `docs/API.md`

## Troubleshooting

`libsodium-wrappers-sumo` ESM Error `Error [ERR_MODULE_NOT_FOUND]` related to `libsodium-sumo.mjs` missing the symlink in `node_modules`:

```bash
ln -s ../../../../../libsodium-sumo@0.7.16/node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs node_modules/.pnpm/libsodium-wrappers-sumo@0.7.16/node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs
```
