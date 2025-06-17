import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ShoppingCart, Eye } from 'lucide-react';
import { ethers } from 'ethers';
import EbookNFT from '../abi/EbookNFT.json';

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
  authorRoyalty?: number;
  distributorRoyalty?: number;
  platformRoyalty?: number;
}

interface BookPreviewModalProps {
  book: EBook | null;
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (book: EBook) => void;
  owned?: boolean;
}

const BookPreviewModal: React.FC<BookPreviewModalProps> = ({
  book,
  isOpen,
  onClose,
  onPurchase,
  owned = false
}) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetailedMetadata = async () => {
      if (!book || !isOpen) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS,
          EbookNFT.abi,
          provider
        );

        const metadataUri = await contract.tokenURI(book.id);
        const ipfsHash = metadataUri.replace('ipfs://', '');
        const metadataUrl = `${import.meta.env.VITE_IPFS_GATEWAY}/ipfs/${ipfsHash}`;

        const response = await fetch(metadataUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fullMetadata = await response.json();
        setMetadata(fullMetadata);
      } catch (err) {
        console.error('获取详细元数据失败:', err);
        setError('无法加载详细信息');
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedMetadata();
  }, [book, isOpen]);

  if (!book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-800 border border-gray-700">
        <DialogHeader className="border-b border-gray-700 pb-3">
          <DialogTitle className="text-lg font-medium text-white flex items-center justify-between">
            电子书预览
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 rounded-full hover:bg-gray-700 text-gray-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* 封面和基本信息 */}
          <div className="flex gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={book.coverImage}
                alt={book.title}
                className="w-24 h-32 object-cover rounded-md"
              />
              {owned && (
                <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-medium text-white mb-1 line-clamp-2">{book.title}</h1>
              <p className="text-gray-400 text-sm mb-2">{book.author}</p>
              
              <div className="flex items-center gap-3 mb-2">
                <Badge className="bg-gray-700 text-gray-300 border-0 text-xs">
                  {book.category}
                </Badge>
                <span className="text-sm font-medium text-white">
                  {book.price > 0 ? `$${book.price}` : '免费'}
                </span>
              </div>
              

            </div>
          </div>

          {/* 描述 */}
          <div className="bg-gray-800/50 rounded-md p-3 border border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-2">内容简介</h3>
            <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
              {book.description || '暂无描述'}
            </p>
          </div>

          {/* 详细信息 */}
          {loading ? (
            <div className="bg-gray-800/50 rounded-md p-3 border border-gray-700">
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                <span className="text-gray-400 text-sm">加载中...</span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-gray-800/50 rounded-md p-3 border border-gray-700">
              <div className="text-center py-4 text-red-400 text-sm">
                {error}
              </div>
            </div>
          ) : metadata ? (
            <div className="bg-gray-800/50 rounded-md p-3 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-3">详细信息</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">文件类型</span>
                  <p className="text-gray-300">{book.fileType?.toUpperCase() || '未知'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Token ID</span>
                  <p className="text-gray-300 font-mono">{book.id}</p>
                </div>
                {book.authorRoyalty && (
                  <div>
                    <span className="text-gray-500">作者版税</span>
                    <p className="text-gray-300">{book.authorRoyalty}%</p>
                  </div>
                )}
                {book.distributorRoyalty && (
                  <div>
                    <span className="text-gray-500">分销版税</span>
                    <p className="text-gray-300">{book.distributorRoyalty}%</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2">
            {!owned ? (
              <Button
                onClick={() => onPurchase(book)}
                className="flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                购买
              </Button>
            ) : (
              <Button
                onClick={() => window.open(`/read/${book.id}`, '_blank')}
                className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md"
              >
                <Eye className="w-4 h-4 mr-1" />
                阅读
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 text-sm rounded-md"
            >
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookPreviewModal;