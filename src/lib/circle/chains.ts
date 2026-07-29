export type ChainKey = 'ARC_TESTNET' | 'ETH_SEPOLIA' | 'BASE_SEPOLIA' | 'AVAX_FUJI' | 'ARB_SEPOLIA' | 'OP_SEPOLIA' | 'MATIC_AMOY';
export interface ChainConfig { key: ChainKey; label: string; chainId: number; circleBlockchain: string; gatewayDomain: number; rpcUrl: string; explorerUrl: string; usdcAddress: `0x${string}`; }
export const CHAINS: Record<ChainKey, ChainConfig> = {
  ARC_TESTNET: { key: 'ARC_TESTNET', label: 'Arc Testnet', chainId: 5042002, circleBlockchain: 'ARC-TESTNET', gatewayDomain: 26, rpcUrl: 'https://rpc.testnet.arc.network', explorerUrl: 'https://testnet.arcscan.app', usdcAddress: '0x3600000000000000000000000000000000000000' },
  ETH_SEPOLIA: { key: 'ETH_SEPOLIA', label: 'Ethereum Sepolia', chainId: 11155111, circleBlockchain: 'ETH-SEPOLIA', gatewayDomain: 0, rpcUrl: 'https://rpc.sepolia.org', explorerUrl: 'https://sepolia.etherscan.io', usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
  BASE_SEPOLIA: { key: 'BASE_SEPOLIA', label: 'Base Sepolia', chainId: 84532, circleBlockchain: 'BASE-SEPOLIA', gatewayDomain: 6, rpcUrl: 'https://sepolia.base.org', explorerUrl: 'https://sepolia.basescan.org', usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' },
  AVAX_FUJI: { key: 'AVAX_FUJI', label: 'Avalanche Fuji', chainId: 43113, circleBlockchain: 'AVAX-FUJI', gatewayDomain: 1, rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc', explorerUrl: 'https://testnet.snowscan.xyz', usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65' },
  ARB_SEPOLIA: { key: 'ARB_SEPOLIA', label: 'Arbitrum Sepolia', chainId: 421614, circleBlockchain: 'ARB-SEPOLIA', gatewayDomain: 3, rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc', explorerUrl: 'https://sepolia.arbiscan.io', usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' },
  OP_SEPOLIA: { key: 'OP_SEPOLIA', label: 'OP Sepolia', chainId: 11155420, circleBlockchain: 'OP-SEPOLIA', gatewayDomain: 2, rpcUrl: 'https://sepolia.optimism.io', explorerUrl: 'https://sepolia-optimism.etherscan.io', usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' },
  MATIC_AMOY: { key: 'MATIC_AMOY', label: 'Polygon Amoy', chainId: 80002, circleBlockchain: 'MATIC-AMOY', gatewayDomain: 7, rpcUrl: 'https://rpc-amoy.polygon.technology', explorerUrl: 'https://amoy.polygonscan.com', usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' },
};
export const CHAIN_LIST = Object.values(CHAINS);
/** Networks exposed by TelePort's unified-balance product. Arc is retained in
 * the configuration for legacy data, but it is not a payment rail. */

export const UNIFIED_CHAIN_KEYS = [
  'ARC_TESTNET',
  'ETH_SEPOLIA',
  'ARB_SEPOLIA',
  'OP_SEPOLIA',
  'AVAX_FUJI',
  'BASE_SEPOLIA',
  'MATIC_AMOY',
] as const satisfies readonly ChainKey[];
export const UNIFIED_CHAIN_LIST = UNIFIED_CHAIN_KEYS.map((key) => CHAINS[key]);
export type UnifiedChainKey = (typeof UNIFIED_CHAIN_KEYS)[number];

export function isUnifiedChainKey(value: string): value is UnifiedChainKey {
  return (UNIFIED_CHAIN_KEYS as readonly string[]).includes(value);
}
export const GATEWAY_API_BASE_URL = process.env.GATEWAY_API_BASE_URL ?? 'https://gateway-api-testnet.circle.com/v1';
export const GATEWAY_CONTRACTS_TESTNET = {
  wallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as `0x${string}`,
  minter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as `0x${string}`,
};