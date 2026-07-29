import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Use POST /api/payments. The legacy transfer route is disabled.' }, { status: 410 });
}
