# Polymarket Clone

A Polymarket-style prediction market app built on Polymarket's public APIs. You can browse every live event, follow live order books, and **place real orders** from your own wallet.

> ⚠️ **Real money.** Orders are signed by your wallet and settle on Polygon with your funds. Polymarket blocks trading from restricted regions, and those orders are rejected. This project does not try to get around geo-restrictions.

## Features

| Area | What it does | Data source |
|---|---|---|
| Markets | Trending, volume, liquidity, newest and ending-soon sorting; category tabs; cursor pagination | Gamma `GET /events/keyset` |
| Search | Full-text event search | Gamma `GET /public-search` |
| Event page | Multi-outcome list, price chart (1H–ALL), rules | Gamma + CLOB `GET /prices-history` |
| Live order book | REST snapshot plus live WebSocket updates with auto-reconnect and ping | CLOB `/book` + `wss://ws-subscriptions-clob…/ws/market` |
| Trading | Market (FOK, slippage-bounded) and limit (GTC) orders; buy and sell; confirm dialog | `@polymarket/client` |
| Login | Wallet connect on Polygon (RainbowKit + wagmi) | — |
| Portfolio | Positions with P&L, open orders with cancel, activity, pUSD cash, portfolio value | Data API **v2** + `@polymarket/client` |
| Profiles | Read-only portfolio of any address at `/profile/0x…` | Data API v2 |

## Quick start

```bash
pnpm install
cp .env.example .env.local   # optional: WalletConnect project ID, Polygon RPC
pnpm dev                     # http://localhost:3000
```

| Command | Purpose |
|---|---|
| `pnpm test` / `pnpm coverage` | Unit and integration tests (Vitest, 80% threshold) |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint |
| `pnpm build` | Production build |

## How trading works

1. **Connect wallet.** The app looks up your Polymarket profile (`/public-profile?address=`).
   - If you signed up on polymarket.com, trading defaults to your **Polymarket proxy wallet**, where your funds and positions live.
   - Without a profile, trading uses your wallet directly as an EOA. You can switch between the two on the Portfolio page.
2. **Enable trading.** You sign one message. `createSecureClient` then derives your CLOB API credentials, which stay **in memory only**. The app always passes `wallet` explicitly, so the SDK never auto-deploys a new deposit wallet.
3. **Approve (one time).** If approvals are missing, the button runs `setupTradingApprovals()`. In EOA mode these are on-chain transactions that need POL for gas.
4. **Trade.** Market orders use FOK with `maxPrice`/`minPrice` taken from the visible book, so they never fill worse than the preview. Limit orders are GTC. Every order shows a confirm dialog before your wallet signs.

**Collateral is pUSD.** Polymarket now settles in pUSD, which is backed 1:1 by USDC. Accounts created on polymarket.com already hold it. A brand-new EOA must first wrap USDC.e into pUSD through Polymarket's CollateralOnramp. The app does not do this step.

## Architecture

```
src/
  app/                 routes: / (markets), /search, /event/[slug], /portfolio, /profile/[address]
    api/pm/[service]/[...path]   read-only allowlisted proxy to gamma/data/clob (GET only)
  components/          event/, markets/, portfolio/, trading/, layout/, ui/ (shadcn)
  hooks/               use-live-books (WebSocket), use-trading-data, use-portfolio
  lib/polymarket/      config, zod normalizers, gamma loaders ('use cache'), order book reducer, Data API v2 parsers
  lib/trading/         order math, ticket builder, order submission, error mapping, profile lookup
```

- **Server data.** Gamma loaders use `'use cache'` with `cacheLife('seconds')` and run at request time inside `<Suspense>`. The build never calls Polymarket.
- **Validation.** All external data goes through lenient zod schemas, so API drift degrades the UI instead of crashing it. Every route param and search param is validated.
- **Proxy.** Exact allowlist of read endpoints, safe-segment check, 10 s timeout, CDN cache headers, and a consistent error envelope. Trading and auth endpoints are never proxied.

## Notes and limits

- `@polymarket/clob-client` is archived and no longer works. This app uses the official successor, `@polymarket/client` (0.13.0).
- Data API v1 routes retire on 2026-10-24. Only `/v2/*` routes are used.
- RainbowKit pulls in `@coinbase/cdp-sdk`, which lazily imports optional `@x402/*` packages. These are stubbed in `next.config.ts` (`turbopack.resolveAlias`).
- Not implemented: USDC.e→pUSD wrapping, redeeming resolved positions, comments, leaderboard.
