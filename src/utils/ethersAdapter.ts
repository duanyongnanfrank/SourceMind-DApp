import { type WalletClient } from 'viem';
import { BrowserProvider, JsonRpcSigner } from 'ethers';

/**
 * 将 wagmi (viem) 的 WalletClient 转换为 ethers.js 的 Signer。
 * 这是连接 wagmi 和 ethers.js 库的桥梁。
 * @param walletClient 从 wagmi 的 useWalletClient 钩子获取的 WalletClient 实例。
 * @returns 兼容 ethers.js 的 JsonRpcSigner 实例。
 */
export function walletClientToSigner(walletClient: WalletClient): JsonRpcSigner {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}
