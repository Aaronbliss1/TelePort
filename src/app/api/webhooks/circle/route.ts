import { createPublicKey, verify } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
const keyCache = new Map<string, { key: ReturnType<typeof createPublicKey>; expiresAt: number }>();
const asString = (value: unknown) => typeof value === 'string' ? value : undefined;

async function circleKey(keyId: string) {
  const cached = keyCache.get(keyId);
  if (cached && cached.expiresAt > Date.now()) return cached.key;
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) throw new Error('CIRCLE_API_KEY is required to verify Circle webhooks.');
  const response = await fetch(`https://api.circle.com/v2/notifications/publicKey/${encodeURIComponent(keyId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  const json = await response.json() as { data?: { algorithm?: string; publicKey?: string } };
  if (!response.ok || json.data?.algorithm !== 'ECDSA_SHA_256' || !json.data.publicKey) throw new Error('Could not load Circle webhook key.');
  const lines = json.data.publicKey.match(/.{1,64}/g)?.join('\n');
  if (!lines) throw new Error('Circle webhook key is invalid.');
  const key = createPublicKey(`-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`);
  keyCache.set(keyId, { key, expiresAt: Date.now() + 3_600_000 });
  return key;
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  try {
    const signature = request.headers.get('x-circle-signature');
    const keyId = request.headers.get('x-circle-key-id');
    if (!signature || !keyId || !verify('sha256', Buffer.from(raw), await circleKey(keyId), Buffer.from(signature, 'base64'))) return NextResponse.json({ error: 'Invalid Circle webhook signature' }, { status: 401 });
    const payload = JSON.parse(raw) as { notificationId?: string; notificationType?: string; notification?: Record<string, unknown> };
    if (!payload.notificationId) return NextResponse.json({ error: 'Circle notification is missing notificationId' }, { status: 400 });
    const admin = getSupabaseServerClient();
    const { error: eventError } = await admin.from('circle_webhook_events').upsert({ notification_id: payload.notificationId, notification_type: payload.notificationType ?? 'unknown', payload }, { onConflict: 'notification_id', ignoreDuplicates: true });
    if (eventError) throw eventError;
    const notice = payload.notification ?? {};
    const transactionId = asString(notice.id) ?? asString(notice.transactionId);
    const state = asString(notice.state) ?? asString(notice.status);
    if (transactionId && state) {
      const status = state === 'COMPLETE' ? 'CONFIRMED' : ['FAILED', 'DENIED'].includes(state) ? 'FAILED' : 'SUBMITTED';
      const { data: payment } = await admin.from('payment_intents').update({ status, transaction_hash: asString(notice.txHash) ?? asString(notice.transactionHash), failure_reason: status === 'FAILED' ? state : null, updated_at: new Date().toISOString() }).eq('circle_transaction_id', transactionId).select('id').maybeSingle();
      if (payment) {
        await admin.rpc('create_payment_journal', { payment_id: payment.id });
        await admin.from('ledger_transactions').update({ status: status === 'CONFIRMED' ? 'POSTED' : status === 'FAILED' ? 'VOIDED' : 'PENDING', posted_at: status === 'CONFIRMED' ? new Date().toISOString() : null }).eq('payment_intent_id', payment.id);
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Circle webhook processing failed', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
