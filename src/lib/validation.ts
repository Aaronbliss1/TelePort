import { z } from 'zod';

export const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Enter a valid EVM address.');

/** USDC supports at most six decimal places. */
export const usdcAmountSchema = z
  .string()
  .regex(/^\d+(?:\.\d{1,6})?$/, 'Enter a USDC amount with up to six decimals.')
  .refine((amount) => Number(amount) > 0, 'Amount must be greater than zero.');
