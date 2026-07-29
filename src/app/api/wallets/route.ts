import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/require-role';

export async function GET() {
  try {
    const { user, supabase } = await requireUser();

    const { data: wallets, error } = await supabase
      .from('user_wallets')
      .select('circle_wallet_id, chain_key, circle_blockchain, address, state')
      .eq('user_id', user.id)
      .eq('wallet_role', 'PAYMENT');

    if (error) throw error;

    return NextResponse.json({
      wallets: (wallets ?? []).map((w) => ({
        id: w.circle_wallet_id,
        address: w.address,
        blockchain: w.circle_blockchain,
        chainKey: w.chain_key,
        state: w.state,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list wallets' },
      { status: 500 },
    );
  }
}
