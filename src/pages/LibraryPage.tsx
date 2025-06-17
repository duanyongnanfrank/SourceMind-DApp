import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Twitter,
  Search,
  Share2,
  Copy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import axios from 'axios';

// 导入合约ABI
import EbookNFTABI from '../abi/EbookNFT.json';

// 类型定义
interface EBook {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number;
  category: string;
  coverImage: string;
  metadataUrl?: string;
}

interface Transaction {
  id: string;
  bookTitle: string;
  date: string;
  price: number;
  status: 'success' | 'failed';
  hash: string;
} 

const LibraryPage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const [ownedBooks, setOwnedBooks] = useState<EBook[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // 处理阅读功能 - 需要找到ebookId对应的用户拥有的tokenId
  const handleRead = async (ebookId: string) => {
    if (!address || !publicClient) return;
    
    try {
      // 遍历用户拥有的所有NFT，找到对应ebookId的tokenId
      for (let i = 0; i < Number(userBalance || 0); i++) {
        const tokenId = await publicClient.readContract({
          address: ebookNFTAddress,
          abi: EbookNFTABI.abi,
          functionName: 'tokenOfOwnerByIndex',
          args: [address, BigInt(i)]
        }) as bigint;
        
        const tokenEbookId = await publicClient.readContract({
          address: ebookNFTAddress,
          abi: EbookNFTABI.abi,
          functionName: 'getEbookIdByTokenId',
          args: [tokenId]
        }) as bigint;
        
        if (tokenEbookId.toString() === ebookId) {
          navigate(`/read/${tokenId.toString()}`);
          return;
        }
      }
      console.error('未找到对应的tokenId');
    } catch (error) {
      console.error('查找tokenId失败:', error);
    }
  };

  // 合约地址
  const ebookNFTAddress = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS as `0x${string}`;
  const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY;
  const DEFAULT_COVER = '/default-cover.png';

  // 获取用户拥有的NFT数量
  const { data: userBalance } = useReadContract({
    address: ebookNFTAddress,
    abi: EbookNFTABI.abi,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address && isConnected,
    },
  });

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

  const publicClient = usePublicClient();

  // 获取用户拥有的所有电子书
  const fetchOwnedBooks = async () => {
    if (!isConnected || !address || !userBalance || userBalance === 0n || !publicClient) {
      setOwnedBooks([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const books: EBook[] = [];
      
      for (let i = 0; i < Number(userBalance); i++) {
        try {
          // 获取用户拥有的第i个NFT的tokenId
          const tokenId = await publicClient.readContract({
            address: ebookNFTAddress,
            abi: EbookNFTABI.abi,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, BigInt(i)]
          }) as bigint;

          // 获取NFT的URI
          const tokenURI = await publicClient.readContract({
            address: ebookNFTAddress,
            abi: EbookNFTABI.abi,
            functionName: 'tokenURI',
            args: [tokenId]
          }) as string;

          // 获取该tokenId对应的ebookId
          const ebookId = await publicClient.readContract({
            address: ebookNFTAddress,
            abi: EbookNFTABI.abi,
            functionName: 'getEbookIdByTokenId',
            args: [tokenId]
          }) as bigint;

          // 从IPFS获取元数据
          const metadata = await fetchMetadataFromIPFS(tokenURI);
          
          if (metadata) {
            // ✨ 修复：改进价格解析逻辑，避免默认设置为0
            let bookPrice = 0;
            if (metadata.price) {
              const parsedPrice = parseFloat(metadata.price);
              if (!isNaN(parsedPrice) && parsedPrice > 0) {
                bookPrice = parsedPrice;
              } else {
                console.warn(`电子书 ${tokenId} 的价格数据无效: ${metadata.price}`);
                // 对于已拥有的电子书，价格信息不是必需的，可以设置为0
                bookPrice = 0;
              }
            }

            books.push({
              id: ebookId.toString(), // 使用ebookId而不是tokenId
              title: metadata.name || '未知标题',
              author: metadata.author || '未知作者',
              description: metadata.description || '暂无描述',
              price: bookPrice,
              category: metadata.attributes?.find((attr: any) => attr.trait_type === '分类')?.value || '其他',
              coverImage: metadata.image ? metadata.image.replace('ipfs://', `${ipfsGateway}/ipfs/`) : DEFAULT_COVER,
              metadataUrl: tokenURI
            });
          }
        } catch (err) {
          console.error(`Failed to fetch book ${i}:`, err);
        }
      }
      
      setOwnedBooks(books);
    } catch (err) {
      console.error('Failed to fetch owned books:', err);
      setError('获取电子书列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnedBooks();
  }, [isConnected, address, userBalance, publicClient]);

// 生成分销链接的函数
const generateDistributionLink = (ebookId: string) => {
  if (!address) return '';
  return `${window.location.origin}/book/${ebookId}?ref=${address}`;
};

  // 根据搜索词过滤书籍
  const filteredBooks = ownedBooks.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 分页逻辑
  const booksPerPage = 6;
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const startIndex = (currentPage - 1) * booksPerPage;
  const currentBooks = filteredBooks.slice(startIndex, startIndex + booksPerPage);

  const handleShowMore = () => {
    setCurrentPage(prevPage => Math.min(prevPage + 1, totalPages));
  };

  const shareToTwitter = useCallback((book: any) => {
    if (!address) return;
    
    const distributionLink = generateDistributionLink(book.id);
    
    // 构建推文文本，包含封面图片链接以便Twitter自动显示预览
    let tweetText = `我在我的图书馆里找到了这本很棒的电子书：\"${book.title}\" by ${book.author}！\n\n📚 通过我的推荐链接购买：\n${distributionLink}`;
    
    // 如果有封面图片，添加到推文中让Twitter显示预览
    if (book.coverImage) {
      tweetText += `\n\n📖 封面预览：\n${book.coverImage}`;
    }
    
    tweetText += `\n\n#EbookDApp #区块链 #NFT #电子书`;
    
    // 构建Twitter分享URL
    const params = new URLSearchParams({
      text: tweetText
    });
    
    const twitterUrl = `https://twitter.com/intent/tweet?${params.toString()}`;
    window.open(twitterUrl, '_blank');
  }, [address]);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-6">
          <h1 className="text-xl font-bold text-gray-200">我的图书馆</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="搜索我的电子书..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-100 placeholder-gray-400 w-full md:w-64 text-sm"
            />
          </div>
        </div>
        {!isConnected ? (
          <div className="text-center py-12">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-sm mx-auto">
              <BookOpen className="mx-auto h-8 w-8 text-blue-400 mb-3" />
              <h2 className="text-lg font-bold text-gray-100 mb-2">请连接钱包</h2>
              <p className="text-sm text-gray-300">您需要连接钱包才能查看您的电子书收藏</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-100 mb-4">已拥有的书籍</h2>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-sm mx-auto">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-300">加载中...</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-sm mx-auto">
                  <p className="text-red-400 mb-4 text-sm">{error}</p>
                  <Button 
                    onClick={fetchOwnedBooks}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    重试
                  </Button>
                </div>
              </div>
            ) : currentBooks.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-sm mx-auto">
                  <BookOpen className="mx-auto h-8 w-8 text-blue-400 mb-3" />
                  <p className="text-sm text-gray-300">
                    {searchTerm ? '没有找到匹配的电子书' : '您还没有购买任何电子书'}
                  </p>
                </div>
              </div>
        ) : (
        <>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 mb-8">
             {currentBooks.map((book) => (
               <Card key={book.id} className="bg-gray-800/90 border-gray-700 overflow-hidden hover:shadow-lg hover:shadow-blue-900/20 hover:border-blue-500/50 transition-all duration-300 group">
                 <div className="aspect-[2/3] overflow-hidden relative group-hover:brightness-110 transition-all duration-300">
                   <img 
                     src={book.coverImage} 
                     alt={book.title} 
                     className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                     onError={(e) => {
                       const target = e.target as HTMLImageElement;
                       target.src = DEFAULT_COVER;
                     }}
                   />
                   <Badge className="absolute top-2 right-2 bg-green-600/90 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 shadow-sm">
                     已拥有
                   </Badge>
                   <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                 </div>
                 <CardContent className="p-4 relative z-10">
                   <h3 className="font-medium text-gray-100 mb-1 text-sm leading-tight line-clamp-2 group-hover:text-blue-200 transition-colors duration-300">{book.title}</h3>
                   <p className="text-xs text-gray-300 mb-4">作者: {book.author}</p>

                   <div className="space-y-3">
                     <Button 
                       className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                       onClick={() => handleRead(book.id)}
                     >
                       <BookOpen className="mr-2 h-4 w-4" />
                       阅读
                     </Button>

                     {isConnected && address && (
                       <div className="p-3 bg-gray-700/50 backdrop-blur-sm rounded-lg border border-gray-600 hover:border-blue-500/30 transition-colors duration-300">
                         <div className="flex justify-between items-center mb-1.5">
                           <p className="text-xs font-medium text-gray-200">分销链接:</p>
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             className="h-6 w-6 p-0 rounded-full hover:bg-gray-600/50"
                             onClick={() => {
                               navigator.clipboard.writeText(generateDistributionLink(book.id));
                               // 可以添加一个复制成功的提示
                             }}
                           >
                             <Copy className="h-3 w-3 text-gray-400 hover:text-blue-400" />
                           </Button>
                         </div>
                         <p className="text-xs text-blue-400 truncate bg-gray-800/80 p-1.5 rounded border border-gray-600 mb-2">{generateDistributionLink(book.id)}</p>
                         <Button
                           size="sm"
                           variant="outline"
                           className="w-full bg-gray-800/80 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-blue-300 text-xs font-medium transition-colors duration-300"
                           onClick={() => shareToTwitter(book)}
                         >
                           <Twitter className="mr-1.5 h-3 w-3" />
                           分享到推特
                         </Button>
                       </div>
                     )}
                   </div>
                 </CardContent>
               </Card>
             ))}
          </div>
          
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-3 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 disabled:opacity-50 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
                上一页
              </Button>
              
              <span className="text-xs text-gray-300 px-3 py-1 bg-gray-800 rounded border border-gray-600">
                第 {currentPage} 页，共 {totalPages} 页
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700 disabled:opacity-50 text-xs"
              >
                下一页
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
          </>
        )}
         </>
       )}

        {isConnected && (
          <div className="mt-12">
            <h2 className="text-lg font-medium text-gray-100 mb-4">购买记录</h2>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600">
                      <TableHead className="font-medium text-gray-300 text-sm">书名</TableHead>
                      <TableHead className="font-medium text-gray-300 text-sm">时间</TableHead>
                      <TableHead className="font-medium text-gray-300 text-sm">价格</TableHead>
                      <TableHead className="font-medium text-gray-300 text-sm">状态</TableHead>
                      <TableHead className="font-medium text-gray-300 text-sm">交易Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                          <div className="flex flex-col items-center">
                            <BookOpen className="h-8 w-8 text-gray-500 mb-2" />
                            <p className="text-sm">暂无购买记录</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id} className="border-gray-600 hover:bg-gray-700/30">
                          <TableCell className="font-medium text-gray-100 text-sm">{tx.bookTitle}</TableCell>
                          <TableCell className="text-gray-300 text-sm">{tx.date}</TableCell>
                          <TableCell className="font-medium text-green-600 text-sm">{tx.price} BNB</TableCell>
                          <TableCell>
                            <Badge 
                              className={tx.status === 'success' 
                                ? 'bg-green-600 text-white text-xs' 
                                : 'bg-red-600 text-white text-xs'
                              }
                            >
                              {tx.status === 'success' ? '成功' : '失败'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <a 
                              href={`https://bscscan.com/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs font-mono"
                            >
                              {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                            </a>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryPage;