# TelePort Unified USDC Payments

An EVM multi-chain USDC payment application with email authentication, Circle-managed wallets, and explicit USDC platform fees. Users do not need MetaMask or another browser wallet.

## Current product boundary

- A managed SCA payment wallet and EOA Gateway delegate per verified user on **Ethereum Sepolia, Arbitrum Sepolia, Optimism Sepolia, Avalanche Fuji, Base Sepolia, and Polygon Amoy**.
- One unified USDC balance through Circle Gateway: users can fund on any supported chain and send to any supported destination chain.
- Fees are quoted and charged in USDC using `PAYMENT_FEE_BPS`.
- Payment requests use a client idempotency key and are recorded before Circle is called.
- Circle webhooks are signature-verified and update payment and ledger state.
- Gateway deposits, balance reads, and transfers use an SCA/EOA-delegate pair per chain. CCTP bridge routes remain out of scope.

## Setup

1. Create a Supabase project and run `supabase/schema.sql` once in the SQL editor. The earlier SQL files are retired placeholders.
2. Create a Circle Developer-Controlled Wallets API key and wallet set. Use `scripts/bootstrap-wallet-set.ts` once, then put the entity secret and wallet-set ID in `.env.local`.
3. Copy `.env.example` to `.env.local`, set Supabase and Circle values, set `PLATFORM_FEE_RECIPIENT`, and choose `PAYMENT_FEE_BPS` (for example, `100` for 1%).
4. Configure Circle to POST signed notifications to `/api/webhooks/circle`.
5. Run `npm run dev`.

## Payment lifecycle

1. A confirmed email user visits the app.
2. The app creates an account record and provision claim, then Circle creates a payment SCA and Gateway EOA delegate on each supported chain.
3. The sender funds any payment wallet and deposits USDC into Gateway. It becomes spendable after source-chain finality.
4. The sender enters a recipient, destination chain, and USDC amount. Gateway allocates the unified balance across source chains, then mints to the recipient on the chosen chain.
5. `POST /api/gateway/transfer` creates an idempotent payment intent and a pending balanced journal. A verified Circle webhook settles the mint transaction.

## Before mainnet

This remains a testnet MVP. Add balance/reserve enforcement, deposit indexing and ledger crediting, rate limits, sanctions/KYC/AML workflows appropriate to your launch jurisdictions, operational monitoring, key-recovery procedures, and a reviewed incident/reconciliation runbook before accepting real funds.
