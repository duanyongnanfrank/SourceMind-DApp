import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygon, bsc } from '@reown/appkit/networks';

// 从环境变量获取项目ID，若无则用官方示例默认ID
const projectId = import.meta.env.VITE_PROJECT_ID || "b56e18d47c72ab683b10814fe9495694";

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [mainnet, sepolia]
});