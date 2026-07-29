import { NextResponse } from 'next/server';
import { provisionUserWallets } from '@/lib/circle/wallets';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/require-role';

export async function POST() {
  try {
    const { user } = await requireUser();
    const admin = getSupabaseServerClient();

    await admin
      .from('accounts')
      .upsert({ user_id: user.id, email: user.email ?? '' });

    const { data: existing } = await admin
      .from('user_wallets')
      .select('circle_wallet_id, address')
      .eq('user_id', user.id)
      .eq('wallet_role', 'PAYMENT');

    if (existing && existing.length > 0) {
      return NextResponse.json({
        wallets: existing,
        message: 'Wallets already ready.',
      });
    }

    const { data: claim } = await admin
      .from('wallet_provisioning')
      .select('status, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const startedRecently =
      claim?.status === 'PROVISIONING' &&
      Date.now() - new Date(claim.updated_at).getTime() < 5 * 60_000;

    if (startedRecently) {
      return NextResponse.json(
        {
          status: 'PROVISIONING',
          message:
            'Wallet setup is already in progress. Please wait a few minutes.',
        },
        { status: 202 },
      );
    }

    const { error: claimError } = await admin
      .from('wallet_provisioning')
      .upsert({
        user_id: user.id,
        status: 'PROVISIONING',
        last_error: null,
        updated_at: new Date().toISOString(),
      });

    if (claimError) throw claimError;

    try {
      const { payments, delegates, delegateAuthorizations } =
        await provisionUserWallets(user.id);

      const authorizationByChain = new Map(
        delegateAuthorizations.map((authorization) => [
          authorization.chainKey,
          authorization,
        ]),
      );

      const wallets = [...payments, ...delegates].map((wallet) => ({
        user_id: user.id,
        circle_wallet_id: wallet.id,
        chain_key: wallet.chainKey,
        circle_blockchain: wallet.blockchain,
        address: wallet.address,
        account_type: wallet.role === 'PAYMENT' ? 'SCA' : 'EOA',
        wallet_role: wallet.role,
        state:
          wallet.role === 'PAYMENT' &&
          authorizationByChain.get(wallet.chainKey)?.submitted === false
            ? 'DELEGATE_SETUP_FAILED'
            : wallet.state,
      }));

      const { error } = await admin.from('user_wallets').insert(wallets);

      if (error) throw error;

      await admin
        .from('wallet_provisioning')
        .update({
          status: 'READY',
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      const failures = delegateAuthorizations.filter(
        (authorization) => !authorization.submitted,
      );

      return NextResponse.json(
        {
          wallets: payments,
          delegateAuthorizations,
          message: failures.length
            ? 'Wallets are ready, but one or more Gateway delegate authorizations could not be submitted.'
            : 'Wallets are ready. Gateway delegate authorizations are confirming in the background.',
        },
        { status: 201 },
      );
    } catch (error) {
      await admin
        .from('wallet_provisioning')
        .update({
          status: 'FAILED',
          last_error:
            error instanceof Error ? error.message : 'Provisioning failed',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      throw error;
    }
 } catch (error) {
    console.error('PROVISION-FOR-ME ERROR:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Provisioning failed',
      },
      { status: 500 },
    );
  }
}