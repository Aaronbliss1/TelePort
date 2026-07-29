import { getSupabaseRouteClient } from '@/lib/supabase/route-client';
import type { ChainKey } from '@/lib/circle/chains';

export class UnauthorizedError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

/**
 * Confirms someone is logged in at all. Use this for actions that don't
 * touch a specific wallet (e.g. provisioning your own first set of
 * wallets after signup).
 */
export async function requireUser() {
  const supabase = await getSupabaseRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError('Not authenticated', 401);
  }

  return { user, supabase };
}

/**
 * Confirms the logged-in user actually OWNS the given Circle wallet id,
 * per the user_wallets table. This is the critical check for every route
 * that moves funds — without it, a logged-in user could pass ANY wallet
 * id in a request body and move someone else's money, since the admin
 * Supabase client and Circle's API don't know or care whose wallet it is.
 *
 * Call this before touching Circle for any transfer/deposit/bridge
 * action.
 */
export async function requireOwnWallet(walletId: string) {
  const { user, supabase } = await requireUser();

  const { data: wallet, error } = await supabase
    .from('user_wallets')
    .select('id, chain_key, address, circle_wallet_id')
    .eq('user_id', user.id)
    .eq('circle_wallet_id', walletId)
    .single();

  if (error || !wallet) {
    throw new UnauthorizedError('That wallet does not belong to you.', 403);
  }

  return { user, wallet };
}

/**
 * Same idea, but checks ownership by on-chain address instead of wallet
 * id — useful for Gateway/Bridge flows where you're working from an
 * address (which is shared across a user's EVM chains) rather than a
 * specific per-chain Circle wallet id.
 */
export async function requireOwnAddress(address: string, chainKey?: ChainKey) {
  const { user, supabase } = await requireUser();

  let query = supabase
    .from('user_wallets')
    .select('id, chain_key, circle_wallet_id')
    .eq('user_id', user.id)
    .ilike('address', address);

  if (chainKey) query = query.eq('chain_key', chainKey);

  const { data: wallet, error } = await query.limit(1).maybeSingle();

  if (error || !wallet) {
    throw new UnauthorizedError('That address does not belong to you.', 403);
  }

  return { user, wallet };
}
