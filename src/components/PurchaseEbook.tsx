import React, { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { X } from 'lucide-react';

interface EBook {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number;
  coverImage: string;
  fileType: string;
  category: string;
  rating: number;
  reviews: number;

  metadataUrl: string; // 添加 metadataUrl 字段
}

interface PurchaseEbookProps {
  book: EBook | null;
  onClose: () => void;
  isOpen: boolean;
  onPurchaseSuccess?: (tokenId: number) => void; // 修改购买成功回调，传递tokenId
  referrerAddress?: string; // 添加推荐人地址参数
}

const PurchaseEbook: React.FC<PurchaseEbookProps> = ({ book, onClose, isOpen, onPurchaseSuccess, referrerAddress }) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen || !book) {
    return null;
  }
  
  const handlePurchase = async () => {
    if (!address) {
      setMessage('请先连接钱包');
      return;
    }

    // ✨ 修复：添加购买前验证
    if (!book) {
      setMessage('电子书信息无效');
      return;
    }

    if (book.price <= 0) {
      setMessage('该电子书价格无效，无法购买');
      return;
    }
    
    try {
      setIsPurchasing(true);
      setMessage('正在处理购买...');
      
      if (!walletClient) {
        throw new Error('无法获取钱包连接');
      }
      
      // 创建 provider 和 signer
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      
      // 1. 授权BUSD代币给销售合约
      setMessage('正在授权 BUSD 代币...');
      const busdAbi = [
        "function approve(address spender, uint256 amount) public returns (bool)"
      ];
      const busdContract = new ethers.Contract(
        import.meta.env.VITE_APP_TBUSD_TOKEN_ADDRESS,
        busdAbi,
        signer
      );
      
      const amountToApprove = ethers.parseUnits(book.price.toString(), 18); // 使用电子书价格
      const approveTx = await busdContract.approve(
        import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS,
        amountToApprove
      );
      await approveTx.wait();
      setMessage('BUSD 代币授权成功！');
      
      // 2. 调用购买函数
      setMessage('正在执行购买交易...');
      const salesDistributorAbi = [
        "function purchaseEbook(uint256 _ebookId, address _referrer, bool _isExclusivePurchase) external"
      ];
      const salesDistributorContract = new ethers.Contract(
        import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS,
        salesDistributorAbi,
        signer
      );
      
      const purchaseTx = await salesDistributorContract.purchaseEbook(
        parseInt(book.id), // 转换为 uint256
        referrerAddress || ethers.ZeroAddress, // 推荐人地址
        false // 非独占购买
      );
      await purchaseTx.wait();
      
      setMessage('购买成功！');
      // 调用购买成功回调来更新状态
      if (onPurchaseSuccess) {
        onPurchaseSuccess(parseInt(book.id));
      }
      // 不在这里关闭对话框，由父组件处理
    } catch (error: any) {
      console.error('购买失败:', error);
      setMessage(`购买失败: ${error.reason || error.message}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-center pr-8">购买电子书</h2>
          <h3 className="text-lg font-medium mb-4 text-center text-gray-200">{book.title}</h3>
          
          <div className="flex justify-center mb-4">
            <img src={book.coverImage} alt={book.title} className="w-32 h-48 object-cover rounded-md shadow-sm" />
          </div>
          
          <p className="text-center text-xl font-semibold mb-6">价格: <span className="text-blue-600">{book.price} BUSD</span></p>
          
          <button
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 text-lg font-medium transition-colors"
            onClick={handlePurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? '处理中...' : `确认购买 ${book.price} BUSD`}
          </button>
          
          {message && (
            <p className="mt-4 text-center text-sm font-medium text-gray-600">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseEbook;