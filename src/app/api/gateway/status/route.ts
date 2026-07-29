import { NextRequest, NextResponse } from 'next/server';
import { requireUser, UnauthorizedError } from '@/lib/auth/require-role';
import { getCircleClient } from '@/lib/circle/client';

export async function GET(request: NextRequest) {
  const txId = request.nextUrl.searchParams.get('txId');
  if (!txId)
    return NextResponse.json({ error: 'txId is required' }, { status: 400 });
  try {
    await requireUser();
    const client = getCircleClient();
    const res = await client.getTransaction({ id: txId });
    const tx = res.data?.transaction;
    return NextResponse.json({ state: tx?.state ?? 'UNKNOWN', txHash: tx?.txHash ?? null });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Status check failed.' }, { status });
  }
}