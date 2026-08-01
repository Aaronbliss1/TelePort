import { createPublicClient, http } from 'viem';

const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9';
const PAYMENT_ADDRESS = '0xb8b284a385bd7ab1f12bbfc70ee0f1032dd7349b';
const DELEGATE_ADDRESS = '0x488cdb8d5fa01614e73c70b5ac9ae5c18da945fd';

const CHAINS = [
  { key: 'ARC_TESTNET', rpcUrl: 'https://rpc.testnet.arc.network', usdc: '0x3600000000000000000000000000000000000000' },
  { key: 'AVAX_FUJI', rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc', usdc: '0x5425890298aed601595a70AB815c96711a31Bc65' },
];

const abi = [{
  type: 'function',
  name: 'isAuthorizedForBalance',
  stateMutability: 'view',
  inputs: [
    { name: 'token', type: 'address' },
    { name: 'depositor', type: 'address' },
    { name: 'addr', type: 'address' },
  ],
  outputs: [{ type: 'bool' }],
}];

for (const chain of CHAINS) {
  const client = createPublicClient({ transport: http(chain.rpcUrl) });
  try {
    const result = await client.readContract({
      address: GATEWAY_WALLET,
      abi,
      functionName: 'isAuthorizedForBalance',
      args: [chain.usdc, PAYMENT_ADDRESS, DELEGATE_ADDRESS],
    });
    console.log(chain.key + ': isAuthorizedForBalance = ' + result);
  } catch (err) {
    console.log(chain.key + ': ERROR - ' + err.message);
  }
}