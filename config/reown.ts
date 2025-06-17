import { createConfig, http } from 'wagmi';
import { walletConnect } from 'wagmi/connectors';
import { bscTestnet } from 'wagmi/chains';
import { createAppKit } from '@reown/appkit/react';

// 初始化 Reown AppKit
const appKit = createAppKit({
  projectId: "51f37919c717f647502715af16ac982c",
  networks: [bscTestnet]
});

// 导出组件和方法
const AppKitProvider = appKit.Provider; // 使用正确的 Provider 属性
const useAppKitModal = appKit.useAppKitModal;

// 创建 wagmi 配置
const wagmiConfig = createConfig({
  chains: [bscTestnet],
  connectors: [
    walletConnect({
      projectId: "51f37919c717f647502715af16ac982c",
      metadata: {
        name: 'Ebook DApp',
        description: 'Ebook Distribution DApp',
        url: 'http://localhost:5173',
        icons: []
      }
    })
  ],
  transports: {
    [bscTestnet.id]: http()
  }
});

export { wagmiConfig, AppKitProvider, useAppKitModal };