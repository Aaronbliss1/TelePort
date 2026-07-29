import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

/**
 * Server-only Circle client. Never import this from a Client Component —
 * it holds CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET which must stay on the
 * server. All API routes that touch it live under src/app/api/.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

let cachedClient: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

export function getCircleClient() {
  if (cachedClient) return cachedClient;

  cachedClient = initiateDeveloperControlledWalletsClient({
    apiKey: requireEnv('CIRCLE_API_KEY'),
    entitySecret: requireEnv('CIRCLE_ENTITY_SECRET'),
  });

  return cachedClient;
}

export function getWalletSetId(): string {
  return requireEnv('CIRCLE_WALLET_SET_ID');
}
