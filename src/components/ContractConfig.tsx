import React from 'react';
import { useAccount } from 'wagmi';

function ContractConfig() {
  const { address } = useAccount();

  return (
    <div className="p-4 bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">合约配置</h2>
      <div className="space-y-2 text-sm text-gray-200">
        <p><strong>平台地址:</strong> <span className="break-all">{import.meta.env.VITE_APP_PLATFORM_ADDRESS}</span></p>
        <p><strong>销售合约地址:</strong> <span className="break-all">{import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS}</span></p>
        <p><strong>收益合约地址:</strong> <span className="break-all">{import.meta.env.VITE_APP_REVENUE_CONTRACT_ADDRESS}</span></p>
        <p><strong>BUSD 代币地址:</strong> <span className="break-all">{import.meta.env.VITE_APP_BUSD_TOKEN_ADDRESS}</span></p>
        <p><strong>Ebook NFT 合约地址:</strong> <span className="break-all">{import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS}</span></p>
        <p><strong>当前账户地址:</strong> <span className="break-all">{address || '未连接'}</span></p>
      </div>
    </div>
  );
}

export default ContractConfig;