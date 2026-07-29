import type { Address } from 'viem';
import { isUnifiedChainKey, UNIFIED_CHAIN_KEYS } from './chains';
import type { GatewayWalletPair } from './gateway';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface UserGatewayWalletPair extends GatewayWalletPair {
  paymentDbId: string;
}

/** Loads matching SCA payment wallets and EOA delegates. Gateway signatures
 * are never requested with an SCA: Circle requires the paired EOA delegate. */
export async function getUserGatewayWalletPairs(userId: string): Promise<UserGatewayWalletPair[]> {
  const admin = getSupabaseServerClient();
  const { data, error } = await admin.from('user_wallets')
    .select('id, circle_wallet_id, chain_key, address, wallet_role')
    .eq('user_id', userId)
    .in('wallet_role', ['PAYMENT', 'GATEWAY_DELEGATE']);
  if (error) throw error;
  const pairs = UNIFIED_CHAIN_KEYS.flatMap((chainKey) => {
    const payment = data?.find((wallet) => wallet.chain_key === chainKey && wallet.wallet_role === 'PAYMENT');
    const delegate = data?.find((wallet) => wallet.chain_key === chainKey && wallet.wallet_role === 'GATEWAY_DELEGATE');
    if (!payment || !delegate || !isUnifiedChainKey(payment.chain_key)) return [];
    return [{
      paymentDbId: payment.id, paymentWalletId: payment.circle_wallet_id, paymentAddress: payment.address as Address,
      delegateWalletId: delegate.circle_wallet_id, delegateAddress: delegate.address as Address, chainKey,
    }];
  });
  if (pairs.length !== UNIFIED_CHAIN_KEYS.length) throw new Error('Your multi-chain wallets are still being provisioned. Please try again shortly.');
  return pairs;
}
