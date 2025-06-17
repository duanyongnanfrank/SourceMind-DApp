import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BookPreviewModal from '@/components/BookPreviewModal';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import BookCard from '@/components/BookCard';
import PurchaseEbook from '@/components/PurchaseEbook';
import { useReadContract, useAccount, usePublicClient } from 'wagmi';
import { ethers } from 'ethers';
import { encodeFunctionData, decodeFunctionResult } from 'viem';
import ebookNFTAbi from '@/abi/EbookNFT.json';
import salesDistributorAbi from '@/abi/EbookSalesDistributor.json';
import axios from 'axios';
import { Search } from 'lucide-react';

interface EBook {
  id: string;
  tokenId: number;
  title: string;
  author: string;
  description: string;
  price: number;
  coverImage: string;
  fileType: string;
  category: string;
  rating: number;
  reviews: number;

  metadataUrl: string;
  createdAt: number;
  isOwned: boolean;
  authorRoyalty?: number;
  distributorRoyalty?: number;
  platformRoyalty?: number;
}

const HomePage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [selectedBook, setSelectedBook] = useState<EBook | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [allBooks, setAllBooks] = useState<EBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // latest, price-low, price-high
  const [selectedPriceRange, setSelectedPriceRange] = useState(''); // 新增：选择的价格区间
  const [showFilters, setShowFilters] = useState(false);
  
  // 分类选项
  const categories = [
    '小说',  
    '艺术', 
    '科学', 
    '历史',
    '金融科技',
    '区块链',
    '人工智能',
    '数据科学',
    '编程开发',
    '产品设计',
    '市场营销',
    '创业投资',
    '心理学',
    '哲学',
    '医学健康',
    '法律',
    '经济学',
    '管理学',
    '其他'
  ];

  // 合约地址
  const ebookNFTAddress = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS as `0x${string}`;
  const salesDistributorAddress = import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS as `0x${string}`;
  const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY;
  const DEFAULT_COVER = '/default-cover.png';

  // 从IPFS获取元数据
  const fetchMetadataFromIPFS = async (tokenURI: string) => {
    try {
      const metadataUrl = tokenURI.replace('ipfs://', `${ipfsGateway}/ipfs/`);
      const response = await axios.get(metadataUrl);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch metadata from IPFS:', error);
      return null;
    }
  };

  // 获取NFT总供应量
  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: ebookNFTAddress,
    abi: ebookNFTAbi.abi,
    functionName: 'totalSupply',
    chainId: 97, // BSC Testnet
  });
  
  console.log('Contract address:', ebookNFTAddress);
  console.log('Total supply from contract:', totalSupply);

  // 获取用户拥有的NFT数量
  const { data: userBalance } = useReadContract({
    address: ebookNFTAddress,
    abi: ebookNFTAbi.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 97, // BSC Testnet
  });



  // 防止重复调用的标志
  const fetchingRef = useRef(false);

  // ✨ 修改：获取所有可售电子书模板数据
  const fetchAllBooks = async () => {
    console.log('fetchAllBooks called - fetching available ebooks from contract');
    if (!publicClient) return;
    if (fetchingRef.current) return; // 防止重复调用
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // ✨ 调用新的getAllAvailableEbooks接口获取电子书模板
      const result = await publicClient.readContract({
        address: salesDistributorAddress,
        abi: salesDistributorAbi.abi,
        functionName: 'getAllAvailableEbooks'
      }) as [bigint[], string[], bigint[], `0x${string}`[]];

      const [ebookIds, uris, prices, creators] = result;
      
      if (!ebookIds || ebookIds.length === 0) {
        console.log('No available ebooks found');
        setAllBooks([]);
        setFilteredBooks([]);
        setLoading(false);
        return;
      }

      const books: EBook[] = [];
      const userOwnedEbooks = new Set<number>();

      // 如果用户已连接，检查用户拥有哪些电子书的NFT
      if (isConnected && address) {
        for (const ebookId of ebookIds) {
          try {
            const hasNFT = await publicClient.readContract({
              address: ebookNFTAddress,
              abi: ebookNFTAbi.abi,
              functionName: 'hasEbookNFTByEbookId',
              args: [address, ebookId]
            }) as boolean;
            
            if (hasNFT) {
              userOwnedEbooks.add(Number(ebookId));
            }
          } catch (error) {
            console.error(`检查用户是否拥有电子书 ${ebookId} 失败:`, error);
          }
        }
      }

      // 处理每个电子书模板
      for (let i = 0; i < ebookIds.length; i++) {
        try {
          const ebookId = Number(ebookIds[i]);
          const uri = uris[i];
          const price = Number(prices[i]);
          const creator = creators[i];

          console.log('[fetchAllBooks] ebookId:', ebookId, 'uri:', uri, 'price:', price);

          if (uri) {
            const metadata = await fetchMetadataFromIPFS(uri);
            console.log('[fetchAllBooks] metadata for ebookId', ebookId, ':', metadata);

            if (metadata) {
              // 获取分销比例信息
              let authorRoyalty = 0;
              let distributorRoyalty = 0;
              const platformRoyalty = 15; // 固定平台分成15%
              
              try {
                // 获取作者分成比例 (BPS格式，需要除以100)
                const authorShareBPS = await publicClient.readContract({
                  address: salesDistributorAddress,
                  abi: salesDistributorAbi.abi,
                  functionName: 'getEbookAuthorShareBPS',
                  args: [BigInt(ebookId)]
                }) as bigint;
                authorRoyalty = Number(authorShareBPS) / 100;
                console.log('[fetchAllBooks] authorShareBPS:', authorShareBPS.toString(), 'authorRoyalty:', authorRoyalty);

                // 获取分销者分成比例 (BPS格式，需要除以100)
                const referrerShareBPS = await publicClient.readContract({
                  address: salesDistributorAddress,
                  abi: salesDistributorAbi.abi,
                  functionName: 'getEbookReferrerShareBPS',
                  args: [BigInt(ebookId)]
                }) as bigint;
                distributorRoyalty = Number(referrerShareBPS) / 100;
                console.log('[fetchAllBooks] referrerShareBPS:', referrerShareBPS.toString(), 'distributorRoyalty:', distributorRoyalty);
              } catch (error) {
                console.error(`获取分销比例失败 ebookId ${ebookId}:`, error);
              }

              // 转换价格为ETH单位
              const bookPrice = price / 1e18;

              const book: EBook = {
                id: ebookId.toString(),
                tokenId: ebookId, // 使用ebookId作为tokenId
                title: metadata.name || '未知标题',
                author: metadata.attributes?.find((attr: any) => attr.trait_type === '作者')?.value || '未知作者',
                description: metadata.description || '暂无描述',
                price: bookPrice,
                coverImage: metadata.image ? metadata.image.replace('ipfs://', `${ipfsGateway}/ipfs/`) : DEFAULT_COVER,
                fileType: metadata.attributes?.find((attr: any) => attr.trait_type === '文件类型')?.value || 'PDF',
                category: metadata.attributes?.find((attr: any) => attr.trait_type === '分类')?.value || '其他',
                rating: 4.5, // 默认评分
                reviews: Math.floor(Math.random() * 100) + 10, // 随机评论数

                metadataUrl: uri,
                createdAt: Date.now() - (ebookId * 24 * 60 * 60 * 1000), // 模拟创建时间
                isOwned: userOwnedEbooks.has(ebookId), // 检查用户是否拥有该电子书的NFT
                authorRoyalty: authorRoyalty > 0 ? authorRoyalty : undefined,
                distributorRoyalty: distributorRoyalty > 0 ? distributorRoyalty : undefined,
                platformRoyalty: platformRoyalty
              };

              books.push(book);
            }
          }
        } catch (error) {
          console.error(`获取电子书 ${ebookIds[i]} 元数据失败:`, error);
        }
      }

      setAllBooks(books);
    } catch (error) {
      console.error('获取电子书数据失败:', error);
      setError('获取电子书数据失败，请稍后重试');
    } finally {
      setLoading(false);
      fetchingRef.current = false; // 重置标志
    }
  };

  // 筛选和排序逻辑
  const filterAndSortBooks = () => {
    let filtered = [...allBooks];

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query)
      );
    }

    // 分类筛选
    if (selectedCategory && selectedCategory !== '') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }

    // 价格区间筛选
    if (selectedPriceRange) {
      const [min, max] = getPriceRangeValues(selectedPriceRange);
      filtered = filtered.filter(book => {
        if (max === Infinity) {
          return book.price >= min;
        }
        return book.price >= min && book.price <= max;
      });
    }

    // 排序
    switch (sortBy) {

      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'latest':
      default:
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    setFilteredBooks(filtered);
  };

  // 重置筛选
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('latest');
    setSelectedPriceRange('');
  };

  // 获取价格区间的数值范围
  const getPriceRangeValues = (range: string): [number, number] => {
    switch (range) {
      case '0-20':
        return [0, 20];
      case '20-50':
        return [20, 50];
      case '50-100':
        return [50, 100];
      case '100+':
        return [100, Infinity];
      default:
        return [0, Infinity];
    }
  };

  // 价格区间选项
  const priceRangeOptions = [
    { value: '0-20', label: '$0 - $20' },
    { value: '20-50', label: '$20 - $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100+', label: '$100+' }
  ];

  // ✨ 修改：不再依赖totalSupply，直接获取可售电子书
  useEffect(() => {
    if (publicClient && salesDistributorAddress) {
      fetchAllBooks();
    }
  }, [publicClient, salesDistributorAddress]);

  // ✨ 修改：当用户连接状态改变时，更新拥有状态
  useEffect(() => {
    const updateOwnershipStatus = async () => {
      if (!isConnected || !address || !publicClient || allBooks.length === 0) {
        // 如果用户断开连接，将所有书籍标记为未拥有
        if (!isConnected && allBooks.length > 0) {
          setAllBooks(prevBooks => 
            prevBooks.map(book => ({ ...book, isOwned: false }))
          );
        }
        return;
      }

      try {
        const userOwnedEbooks = new Set<number>();
        
        // ✨ 修改：使用hasEbookNFTByEbookId检查用户是否拥有电子书NFT
        for (const book of allBooks) {
          try {
            const hasNFT = await publicClient.readContract({
              address: ebookNFTAddress,
              abi: ebookNFTAbi.abi,
              functionName: 'hasEbookNFTByEbookId',
              args: [address, BigInt(book.tokenId)]
            }) as boolean;
            
            if (hasNFT) {
              userOwnedEbooks.add(book.tokenId);
            }
          } catch (error) {
            console.error(`检查用户是否拥有电子书 ${book.tokenId} 失败:`, error);
          }
        }

        // 更新书籍的拥有状态
        setAllBooks(prevBooks => 
          prevBooks.map(book => ({
            ...book,
            isOwned: userOwnedEbooks.has(book.tokenId)
          }))
        );
      } catch (error) {
        console.error('更新拥有状态失败:', error);
      }
    };

    updateOwnershipStatus();
  }, [address, isConnected, allBooks.length, publicClient, ebookNFTAddress]);

  // 当筛选条件改变时，重新筛选书籍
  useEffect(() => {
    filterAndSortBooks();
  }, [allBooks, searchQuery, selectedCategory, sortBy, selectedPriceRange]);

  // 获取所有分类
  const getAllCategories = () => {
    // 返回预定义的分类列表，而不是从书籍数据中动态提取
    return categories.filter(category => category !== 'all');
  };

  // 获取价格范围 - 固定为0-1000 BUSD
  const getPriceRange = () => {
    return [0, 1000];
  };

  const handlePurchaseClick = (book: EBook) => {
    // ✨ 修复：加强重复购买检查
    if (!isConnected) {
      alert('请先连接钱包！');
      return;
    }

    // 检查用户是否已经拥有该NFT
    if (book.isOwned) {
      alert('您已经拥有这本电子书了！无法重复购买。');
      return;
    }

    // 检查电子书价格是否有效
    if (book.price <= 0) {
      alert('该电子书价格无效，无法购买。');
      return;
    }

    setSelectedBook(book);
    setIsPurchaseModalOpen(true);
  };

  // 购买成功后的回调函数
  const handlePurchaseSuccess = (tokenId: number) => {
    console.log('Purchase success for tokenId:', tokenId);
    
    // 更新对应书籍的拥有状态，避免重复显示
    if (selectedBook) {
      setAllBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === selectedBook.id 
            ? { ...book, isOwned: true }
            : book
        )
      );
    }
    
    // 关闭购买对话框
    setIsPurchaseModalOpen(false);
    setSelectedBook(null);
  };

  const handleViewClick = (book: EBook) => {
    // 检查用户是否拥有该书
    if (book.isOwned) {
      // 如果已拥有，直接进入阅读页面
      navigate(`/read/${book.id}`);
    } else {
      // 如果未拥有，打开预览模态框
      setSelectedBook(book);
      setIsPreviewModalOpen(true);
    }
  };

  const handlePreviewClose = () => {
    setIsPreviewModalOpen(false);
    setSelectedBook(null);
  };

  const handlePreviewPurchase = (book: EBook) => {
    setIsPreviewModalOpen(false);
    handlePurchaseClick(book);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 顶部区域 - 搜索栏和标题 */}
      <div className="bg-gray-800/80 backdrop-blur-md border-b border-gray-700 sticky top-0 z-40 mb-4">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium text-white">探索电子书</h1>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="搜索电子书..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-1.5 text-sm bg-gray-700 border-gray-600 text-white placeholder-gray-400 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="container mx-auto px-4">
        {/* 筛选器区域 - 水平排列 */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32 h-8 rounded-md bg-gray-800 border-gray-700 text-white text-sm">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border border-gray-700 shadow-md rounded-md z-50">
              {getAllCategories().map(category => (
                <SelectItem key={category} value={category} className="text-white hover:bg-gray-700 text-sm">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-8 rounded-md bg-gray-800 border-gray-700 text-white text-sm">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border border-gray-700 shadow-md rounded-md z-50">
              <SelectItem value="latest" className="text-white hover:bg-gray-700 text-sm">
                最新发布
              </SelectItem>

              <SelectItem value="price-low" className="text-white hover:bg-gray-700 text-sm">价格: 低到高</SelectItem>
              <SelectItem value="price-high" className="text-white hover:bg-gray-700 text-sm">价格: 高到低</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
            <SelectTrigger className="w-32 h-8 rounded-md bg-gray-800 border-gray-700 text-white text-sm">
              <SelectValue placeholder="价格区间" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border border-gray-700 shadow-md rounded-md z-50">
              {priceRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value} className="text-white hover:bg-gray-700 text-sm">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white text-sm"
          >
            重置
          </Button>

          {/* 结果计数 */}
          <div className="ml-auto text-sm text-gray-400">
            共 <span className="text-blue-400 font-medium">{filteredBooks.length}</span> 本
          </div>
        </div>



        {/* 应用的筛选标签 */}
        {(searchQuery || selectedCategory || selectedPriceRange) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {searchQuery && (
              <Badge variant="secondary" className="bg-gray-800 text-gray-300 border-gray-700 text-xs">
                {searchQuery}
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary" className="bg-gray-800 text-gray-300 border-gray-700 text-xs">
                {selectedCategory}
              </Badge>
            )}
            {selectedPriceRange && (
              <Badge variant="secondary" className="bg-gray-800 text-gray-300 border-gray-700 text-xs">
                {priceRangeOptions.find(option => option.value === selectedPriceRange)?.label}
              </Badge>
            )}
          </div>
        )}

        {/* 书籍列表 */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-400 text-sm">正在加载...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-900/20 border border-red-700 rounded-md p-6 max-w-md mx-auto">
              <div className="text-red-400 text-sm mb-3">{error}</div>
              <Button onClick={fetchAllBooks} variant="outline" className="rounded-md bg-gray-800 border-gray-700 text-white hover:bg-gray-700 text-sm">
                重新加载
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                viewMode="grid"
                onPurchase={handlePurchaseClick}
                onView={handleViewClick}
                owned={book.isOwned}
              />
            ))}
          </div>
        )}
        
        {/* 空状态 */}
        {!loading && !error && filteredBooks.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-800 rounded-md p-8 max-w-md mx-auto border border-gray-700">
              <h3 className="text-lg font-medium text-gray-300 mb-2">暂无相关电子书</h3>
              <p className="text-gray-400 mb-4 text-sm">尝试调整搜索条件或浏览其他分类</p>
              <Button onClick={resetFilters} variant="outline" className="rounded-md bg-gray-800 border-gray-700 text-white hover:bg-gray-700 text-sm">
                重置筛选条件
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      <PurchaseEbook
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        book={selectedBook}
        onPurchaseSuccess={handlePurchaseSuccess}
      />

      {/* Preview Modal */}
      <BookPreviewModal
        book={selectedBook}
        isOpen={isPreviewModalOpen}
        onClose={handlePreviewClose}
        onPurchase={handlePreviewPurchase}
        owned={false}
      />
    </div>
  );
};

export default HomePage;