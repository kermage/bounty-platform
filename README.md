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
