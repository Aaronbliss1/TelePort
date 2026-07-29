/**
 * One-time setup script. Run with:
 *
 *   npx tsx --env-file=.env.local scripts/bootstrap-wallet-set.ts
 *
 * This does three things you only need to do once per Circle account:
 *   1. Generate an entity secret (if you don't already have one)
 *   2. Register it with Circle (ciphertext registration)
 *   3. Create the "TelePort Treasury" wallet set and print its ID
 *
 * Copy the printed CIRCLE_ENTITY_SECRET and CIRCLE_WALLET_SET_ID into
 * .env.local. Store the recovery file Circle gives you somewhere safe and
 * OFF this repo — losing the entity secret means losing access to every
 * wallet it controls.
 */
import { randomBytes } from 'node:crypto';
import {
  registerEntitySecretCiphertext,
  initiateDeveloperControlledWalletsClient,
} from '@circle-fin/developer-controlled-wallets';

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error('Set CIRCLE_API_KEY in .env.local before running this script.');
  }

  let entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!entitySecret) {
    // NOTE: the SDK's generateEntitySecret() helper prints a secret to
    // stdout but does not return it — generate the 32-byte hex value
    // directly instead of relying on that return value.
    entitySecret = randomBytes(32).toString('hex');
    console.log('\nGenerated a new entity secret. Save this in .env.local as CIRCLE_ENTITY_SECRET:');
    console.log(entitySecret);

    const registration = await registerEntitySecretCiphertext({ apiKey, entitySecret });
    console.log('\nEntity secret registered. Recovery file (store securely, NOT in git):');
    console.log(registration.data?.recoveryFile);
  } else {
    console.log('\nUsing existing CIRCLE_ENTITY_SECRET from environment.');
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  const walletSet = await client.createWalletSet({ name: 'TelePort Treasury' });
  console.log('\nCreated wallet set. Save this in .env.local as CIRCLE_WALLET_SET_ID:');
  console.log(walletSet.data?.walletSet?.id);

  console.log('\nDone. Next: run `npm run dev` and visit /wallets to provision per-chain wallets.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});