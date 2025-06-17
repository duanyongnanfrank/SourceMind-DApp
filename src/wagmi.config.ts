import { createConfig, http } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet, metaMask } from 'wagmi/connectors'

// 多个 RPC 节点配置，实现容错
const rpcUrls = [
  import.meta.env.VITE_BSC_TESTNET_RPC, // Alchemy RPC
  "https://data-seed-prebsc-1-s1.binance.org:8545", // Binance 官方节点 1
  "https://data-seed-prebsc-2-s1.binance.org:8545", // Binance 官方节点 2
].filter(Boolean)

export const wagmiConfig = createConfig({
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: http(rpcUrls[0], {
      batch: true,
      retryCount: 3,
      retryDelay: 1000
    })
  },
  connectors: [
    metaMask(), // 明确添加 MetaMask 连接器
    injected(), // 保留注入式钱包，以防万一
    walletConnect({ projectId: '51f37919c717f647502715af16ac982c' }),
    coinbaseWallet({ appName: 'My Wagmi App' })
  ]
})