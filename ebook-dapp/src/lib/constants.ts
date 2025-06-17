// 合约地址统一从环境变量读取，避免硬编码
export const EBOOK_NFT_CONTRACT_ADDRESS = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS as `0x${string}`;
export const EBOOK_REVENUE_DISTRIBUTION_CONTRACT_ADDRESS = import.meta.env.VITE_APP_REVENUE_CONTRACT_ADDRESS as `0x${string}`;
export const EBOOK_SALES_DISTRIBUTOR_CONTRACT_ADDRESS = import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS as `0x${string}`;