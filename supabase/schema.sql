-- TelePort Arc Payments: baseline schema
-- Run this file once in a new Supabase project. It intentionally replaces
-- the earlier treasury demo schema; do not run the legacy Phase 2/3 files.

create extension if not exists pgcrypto;

create table if not exists accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TelePort creates an SCA payment wallet and an EOA Gateway delegate on every
-- supported EVM testnet. The delegate is allowed to sign Gateway burn intents
-- for its matching SCA, but never holds customer funds.
create table if not exists user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  circle_wallet_id text not null unique,
  chain_key text not null check (chain_key in ('ARC_TESTNET', 'ETH_SEPOLIA', 'ARB_SEPOLIA', 'OP_SEPOLIA', 'AVAX_FUJI', 'BASE_SEPOLIA', 'MATIC_AMOY')),
  circle_blockchain text not null check (circle_blockchain in ('ARC-TESTNET', 'ETH-SEPOLIA', 'ARB-SEPOLIA', 'OP-SEPOLIA', 'AVAX-FUJI', 'BASE-SEPOLIA', 'MATIC-AMOY')),
  address text not null check (address ~* '^0x[0-9a-f]{40}$'),
  account_type text not null check (account_type in ('SCA', 'EOA')),
  wallet_role text not null check (wallet_role in ('PAYMENT', 'GATEWAY_DELEGATE')),
  state text not null default 'LIVE',
  created_at timestamptz not null default now(),
  unique (user_id, chain_key, wallet_role)
);

create table if not exists wallet_provisioning (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null check (status in ('PROVISIONING', 'READY', 'FAILED')),
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  source_wallet_id uuid not null references user_wallets(id) on delete restrict,
  recipient_address text not null check (recipient_address ~* '^0x[0-9a-f]{40}$'),
  asset text not null default 'USDC' check (asset = 'USDC'),
  -- Gateway sources may be spread across multiple chains. chain_key is the
  -- destination chain where USDC is minted to the recipient.
  chain_key text not null check (chain_key in ('ARC_TESTNET', 'ETH_SEPOLIA', 'ARB_SEPOLIA', 'OP_SEPOLIA', 'AVAX_FUJI', 'BASE_SEPOLIA', 'MATIC_AMOY')),
  transfer_kind text not null default 'GATEWAY' check (transfer_kind = 'GATEWAY'),
  amount_atomic numeric(78,0) not null check (amount_atomic > 0),
  fee_atomic numeric(78,0) not null check (fee_atomic >= 0),
  total_atomic numeric(78,0) not null check (total_atomic = amount_atomic + fee_atomic),
  fee_bps integer not null check (fee_bps >= 0 and fee_bps <= 10000),
  idempotency_key uuid not null,
  circle_transaction_id text unique,
  transaction_hash text,
  status text not null default 'CREATED' check (status in ('CREATED', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'CANCELLED')),
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

-- One payment can burn USDC from more than one source chain. Keeping this
-- immutable allocation makes Gateway reconciliation possible without relying
-- on a mutable aggregate balance.
create table if not exists gateway_transfer_sources (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references payment_intents(id) on delete restrict,
  source_wallet_id uuid not null references user_wallets(id) on delete restrict,
  source_chain_key text not null check (source_chain_key in ('ARC_TESTNET', 'ETH_SEPOLIA', 'ARB_SEPOLIA', 'OP_SEPOLIA', 'AVAX_FUJI', 'BASE_SEPOLIA', 'MATIC_AMOY')),
  amount_atomic numeric(78,0) not null check (amount_atomic > 0),
  created_at timestamptz not null default now(),
  unique (payment_intent_id, source_wallet_id)
);

create table if not exists ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null unique references payment_intents(id) on delete restrict,
  status text not null check (status in ('PENDING', 'POSTED', 'VOIDED')),
  created_at timestamptz not null default now(),
  posted_at timestamptz
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  ledger_transaction_id uuid not null references ledger_transactions(id) on delete cascade,
  account_code text not null check (account_code in ('USER_USDC_LIABILITY', 'ONCHAIN_PAYOUT_CLEARING', 'PLATFORM_FEE_REVENUE')),
  direction text not null check (direction in ('DEBIT', 'CREDIT')),
  amount_atomic numeric(78,0) not null check (amount_atomic > 0),
  created_at timestamptz not null default now()
);

create table if not exists circle_webhook_events (
  id uuid primary key default gen_random_uuid(),
  notification_id text unique,
  notification_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists payment_intents_user_created_idx on payment_intents (user_id, created_at desc);
create index if not exists payment_intents_circle_tx_idx on payment_intents (circle_transaction_id);

-- All browser access is scoped to the authenticated owner. The service-role
-- client performs Circle calls only after server-side ownership checks.
alter table accounts enable row level security;
alter table user_wallets enable row level security;
alter table wallet_provisioning enable row level security;
alter table payment_intents enable row level security;
alter table gateway_transfer_sources enable row level security;
alter table ledger_transactions enable row level security;
alter table ledger_entries enable row level security;
alter table circle_webhook_events enable row level security;

create policy "read own account" on accounts for select using (user_id = auth.uid());
create policy "read own wallet" on user_wallets for select using (user_id = auth.uid());
create policy "read own provisioning" on wallet_provisioning for select using (user_id = auth.uid());
create policy "read own payments" on payment_intents for select using (user_id = auth.uid());
create policy "read own Gateway sources" on gateway_transfer_sources for select using (
  payment_intent_id in (select id from payment_intents where user_id = auth.uid())
);
create policy "read own ledger transactions" on ledger_transactions for select using (
  payment_intent_id in (select id from payment_intents where user_id = auth.uid())
);
create policy "read own ledger entries" on ledger_entries for select using (
  ledger_transaction_id in (
    select lt.id from ledger_transactions lt join payment_intents pi on pi.id = lt.payment_intent_id where pi.user_id = auth.uid()
  )
);

-- Called only by the server after it has stored a Circle transaction ID. It
-- creates a balanced pending journal: user balance debited; outgoing amount
-- credited to clearing; fee credited to platform revenue.
create or replace function create_payment_journal(payment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  p payment_intents;
  journal_id uuid;
begin
  select * into p from payment_intents where id = payment_id;
  if not found then raise exception 'payment intent not found'; end if;
  insert into ledger_transactions (payment_intent_id, status) values (p.id, 'PENDING')
  on conflict (payment_intent_id) do nothing returning id into journal_id;
  if journal_id is null then return; end if;
  insert into ledger_entries (ledger_transaction_id, account_code, direction, amount_atomic) values
    (journal_id, 'USER_USDC_LIABILITY', 'DEBIT', p.total_atomic),
    (journal_id, 'ONCHAIN_PAYOUT_CLEARING', 'CREDIT', p.amount_atomic);
  if p.fee_atomic > 0 then
    insert into ledger_entries (ledger_transaction_id, account_code, direction, amount_atomic)
    values (journal_id, 'PLATFORM_FEE_REVENUE', 'CREDIT', p.fee_atomic);
  end if;
end;
$$;
