const USDC_DECIMALS = 6;
const ATOMIC_FACTOR = 10n ** BigInt(USDC_DECIMALS);

export function parseUsdcAtomic(value: string): bigint {
  const atomic = parseUsdcAtomicAllowZero(value);
  if (atomic <= 0n) throw new Error('Amount must be greater than zero.');
  return atomic;
}

export function parseUsdcAtomicAllowZero(value: string): bigint {
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(value);
  if (!match) throw new Error('Enter a USDC amount with up to six decimals.');
  const whole = BigInt(match[1]!);
  const fraction = BigInt((match[2] ?? '').padEnd(USDC_DECIMALS, '0') || '0');
  return whole * ATOMIC_FACTOR + fraction;
}

export function formatUsdcAtomic(value: bigint): string {
  const whole = value / ATOMIC_FACTOR;
  const fraction = (value % ATOMIC_FACTOR).toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function feeForUsdcAtomic(amount: bigint, feeBps: number): bigint {
  return (amount * BigInt(feeBps) + 9_999n) / 10_000n;
}
