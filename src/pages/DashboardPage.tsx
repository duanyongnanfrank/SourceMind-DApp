import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { DollarSign, BookOpen, TrendingUp, Wallet, RefreshCw, ChevronDown, Info } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { toast } from 'sonner';
import EbookRevenueDistributionABI from '../abi/EbookRevenueDistribution.json';
import EbookSalesDistributorABI from '../abi/EbookSalesDistributor.json';
import EbookNFTABI from '../abi/EbookNFT.json';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface RevenueEvent {
  id: string;
  event: string;
  timestamp: string;
  amount: string;
  transactionHash: string;
  ebookId?: string;
  authorShare?: string;
  referrerShare?: string;
  platformShare?: string;
  totalAmount?: string;
  sharePercentage?: string;
}

interface BookStats {
  id: string;
  title: string;
  cover: string;
  salesCount: number;
}

const DashboardPage = () => {
  const { address, isConnected } = useAccount();
  const [revenueEvents, setRevenueEvents] = useState<RevenueEvent[]>([]);
  const [bookStats, setBookStats] = useState<BookStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authorRoyalty, setAuthorRoyalty] = useState(0);
  const [distributorRoyalty, setDistributorRoyalty] = useState(0);
  const [displayCount, setDisplayCount] = useState(20); // 增加初始显示数量
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);

  // 合约地址
  const revenueDistributionAddress = import.meta.env.VITE_APP_REVENUE_CONTRACT_ADDRESS as `0x${string}`;
  const salesDistributorAddress = import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS as `0x${string}`;
  const ebookNFTAddress = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS as `0x${string}`;

  // 获取作者收益余额
  const { data: authorBalance, refetch: refetchAuthorBalance } = useReadContract({
    address: revenueDistributionAddress,
    abi: EbookRevenueDistributionABI.abi,
    functionName: 'authorEarnings',
    args: [address],
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 获取分销者收益余额 - 修正：使用revenueDistributionAddress
  const { data: distributorBalance, refetch: refetchDistributorBalance } = useReadContract({
    address: revenueDistributionAddress,
    abi: EbookRevenueDistributionABI.abi,
    functionName: 'distributorEarnings',
    args: [address],
    query: {
      enabled: !!address && isConnected,
    },
  });

  // 提现合约写入
  const { writeContract: withdrawAuthorEarnings, data: authorWithdrawHash } = useWriteContract();
  const { writeContract: withdrawDistributorEarnings, data: distributorWithdrawHash } = useWriteContract();

  // 等待交易确认
  const { isLoading: isAuthorWithdrawPending } = useWaitForTransactionReceipt({
    hash: authorWithdrawHash,
  });

  const { isLoading: isDistributorWithdrawPending } = useWaitForTransactionReceipt({
    hash: distributorWithdrawHash,
  });

  // 计算总收益
  const totalEarnings = (
    Number(formatUnits(typeof authorBalance === 'bigint' ? authorBalance : 0n, 18)) + 
    Number(formatUnits(typeof distributorBalance === 'bigint' ? distributorBalance : 0n, 18))
  ).toFixed(4);

  // 作者提现
  const handleAuthorWithdraw = async () => {
    if (!authorBalance || authorBalance === 0n) {
      toast.error('没有可提现的作者收益');
      return;
    }

    try {
      await withdrawAuthorEarnings({
        address: revenueDistributionAddress,
        abi: EbookRevenueDistributionABI.abi,
        functionName: 'withdrawAuthorEarnings',
      });
      toast.success('作者收益提现交易已提交');
    } catch (error) {
      console.error('Author withdraw failed:', error);
      toast.error('作者收益提现失败');
    }
  };

  // 分销者提现 - 修正：使用revenueDistributionAddress
  const handleDistributorWithdraw = async () => {
    if (!distributorBalance || distributorBalance === 0n) {
      toast.error('没有可提现的分销收益');
      return;
    }

    try {
      await withdrawDistributorEarnings({
        address: revenueDistributionAddress,
        abi: EbookRevenueDistributionABI.abi,
        functionName: 'withdrawDistributorEarnings',
      });
      toast.success('分销收益提现交易已提交');
    } catch (error) {
      console.error('Distributor withdraw failed:', error);
      toast.error('分销收益提现失败');
    }
  };

  // 刷新数据
  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchAuthorBalance(),
        refetchDistributorBalance(),
        fetchBookStats(),
      ]);
      // 刷新后重新生成收益记录
      generateRevenueEvents();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 根据当前余额生成收益记录
  const generateRevenueEvents = () => {
    const events: RevenueEvent[] = [];
    const currentTime = new Date().toLocaleString('zh-CN');
    
    // 如果有作者收益余额，添加作者收益记录
    if (authorBalance && typeof authorBalance === 'bigint' && authorBalance > 0n) {
      const authorAmount = formatUnits(authorBalance, 18);
      events.push({
        id: `author-balance-${address}`,
        event: '作者收益',
        timestamp: currentTime,
        amount: authorAmount,
        transactionHash: '',
        ebookId: '',
        authorShare: authorAmount,
        referrerShare: '0',
        platformShare: '0',
        totalAmount: authorAmount,
        sharePercentage: '100'
      });
    }
    
    // 如果有分销者收益余额，添加分销收益记录
    if (distributorBalance && typeof distributorBalance === 'bigint' && distributorBalance > 0n) {
      const distributorAmount = formatUnits(distributorBalance, 18);
      events.push({
        id: `distributor-balance-${address}`,
        event: '推荐收益',
        timestamp: currentTime,
        amount: distributorAmount,
        transactionHash: '',
        ebookId: '',
        authorShare: '0',
        referrerShare: distributorAmount,
        platformShare: '0',
        totalAmount: distributorAmount,
        sharePercentage: '100'
      });
    }
    
    setRevenueEvents(events);
    setHasMoreEvents(false);
  };

  // 加载更多收益记录（简化版本）
  const loadMoreEvents = async () => {
    // 由于现在只显示当前余额，不需要加载更多
    setHasMoreEvents(false);
  };

  // 从IPFS获取元数据
  const fetchMetadataFromIPFS = async (tokenURI: string) => {
    try {
      const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY;
      const metadataUrl = tokenURI.replace('ipfs://', `${ipfsGateway}/ipfs/`);
      const response = await fetch(metadataUrl);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch metadata from IPFS:', error);
      return null;
    }
  };

  // 获取我创建的电子书列表
  const fetchBookStats = async () => {
    if (!address || !window.ethereum) return;
    
    try {
      const provider = new (await import('ethers')).ethers.BrowserProvider(window.ethereum);
      
      const salesContract = new (await import('ethers')).ethers.Contract(
        salesDistributorAddress,
        EbookSalesDistributorABI.abi,
        provider
      );
      
      // 创建收益分配合约实例
      const revenueContract = new (await import('ethers')).ethers.Contract(
        revenueDistributionAddress,
        EbookRevenueDistributionABI.abi,
        provider
      );
      
      // 使用与首页相同的方法获取所有可售电子书
      const result = await salesContract.getAllAvailableEbooks();
      const [ebookIds, uris, prices, creators] = result;
      
      if (!ebookIds || ebookIds.length === 0) {
        console.log('No available ebooks found');
        setBookStats([]);
        return;
      }
  
      const bookStatsArray: BookStats[] = [];
      const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY;
      const DEFAULT_COVER = '/default-cover.png';
      
      // 处理每个电子书，只保留当前用户创建的
      for (let i = 0; i < ebookIds.length; i++) {
        try {
          const ebookId = ebookIds[i].toString();
          const uri = uris[i];
          const creator = creators[i];
          
          // 只处理当前用户创建的书籍
          if (creator.toLowerCase() !== address.toLowerCase()) {
            continue;
          }
          
          if (uri) {
            const metadata = await fetchMetadataFromIPFS(uri);
            
            if (metadata) {
              // 统计该书籍的收益分配次数作为销售数量
              let salesCount = 0;
              try {
                // 查询RevenueDistributed事件，统计该书籍的分成次数
                const filter = revenueContract.filters.RevenueDistributed(BigInt(ebookId));
                const events = await revenueContract.queryFilter(filter);
                
                // 每个RevenueDistributed事件代表一次销售分成
                salesCount = events.length;
              } catch (error) {
                console.warn(`获取书籍 ${ebookId} 分成次数失败:`, error);
              }
              
              const book: BookStats = {
                id: ebookId,
                title: metadata.name || `电子书 #${ebookId}`,
                cover: metadata.image ? metadata.image.replace('ipfs://', `${ipfsGateway}/ipfs/`) : DEFAULT_COVER,
                salesCount
              };
              
              bookStatsArray.push(book);
            }
          }
        } catch (error) {
          console.error(`获取电子书 ${ebookIds[i]} 元数据失败:`, error);
        }
      }
      
      // 按书籍ID排序（最新的在前）
      bookStatsArray.sort((a, b) => Number(b.id) - Number(a.id));
      
      setBookStats(bookStatsArray);
      
    } catch (error) {
      console.error('获取书籍列表失败:', error);
      toast.error('获取书籍列表失败');
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchBookStats();
      fetchRoyaltyInfo();
    }
  }, [isConnected, address]);

  // 当余额变化时重新生成收益记录
  useEffect(() => {
    if (isConnected && address && (authorBalance !== undefined || distributorBalance !== undefined)) {
      generateRevenueEvents();
    }
  }, [isConnected, address, authorBalance, distributorBalance]);

  // 获取分成比例
  const fetchRoyaltyInfo = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new (await import('ethers')).ethers.BrowserProvider(window.ethereum);
      const salesContract = new (await import('ethers')).ethers.Contract(
        salesDistributorAddress,
        EbookSalesDistributorABI.abi,
        provider
      );
      // 默认 ebookId = 1，实际可根据业务调整
      const ebookId = 1;
      const authorShareBPS = await salesContract.getEbookAuthorShareBPS(ebookId);
      const referrerShareBPS = await salesContract.getEbookReferrerShareBPS(ebookId);
      setAuthorRoyalty(Number(authorShareBPS) / 100);
      setDistributorRoyalty(Number(referrerShareBPS) / 100);
    } catch (error) {
      console.error('获取分成比例失败:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-sm mx-auto">
          <Wallet className="mx-auto h-8 w-8 text-blue-400 mb-3" />
          <h2 className="text-lg font-bold text-gray-100 mb-2">请连接钱包</h2>
          <p className="text-sm text-gray-300">您需要连接钱包才能查看收益仪表板</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-gray-200">收益仪表板</h1>
          <Button 
            onClick={refreshData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">总收益</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-100 mb-1">{totalEarnings} BUSD</div>
              <p className="text-xs text-gray-400">
                作者收益 + 分销收益
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">作者收益</CardTitle>
              <BookOpen className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-100 mb-3">
                {formatUnits(typeof authorBalance === 'bigint' ? authorBalance : 0n, 18)} BUSD
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm" 
                onClick={handleAuthorWithdraw}
                disabled={!authorBalance || authorBalance === 0n || isAuthorWithdrawPending}
              >
                {isAuthorWithdrawPending ? '提现中...' : '提现'}
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">分销收益</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-100 mb-3">
                {formatUnits(typeof distributorBalance === 'bigint' ? distributorBalance : 0n, 18)} BUSD
              </div>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm" 
                onClick={handleDistributorWithdraw}
                disabled={!distributorBalance || distributorBalance === 0n || isDistributorWithdrawPending}
              >
                {isDistributorWithdrawPending ? '提现中...' : '提现'}
              </Button>
            </CardContent>
          </Card>
        </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-100">
                收益记录 ({revenueEvents.length} 条)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-400">
                  <RefreshCw className="h-8 w-8 text-gray-600 mb-2 animate-spin mx-auto" />
                  <p className="text-sm">加载收益记录中...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-600">
                        <TableHead className="font-medium text-gray-300 text-sm">类型</TableHead>
                        <TableHead className="font-medium text-gray-300 text-sm">时间</TableHead>
                        <TableHead className="font-medium text-gray-300 text-sm">收益金额</TableHead>
                        <TableHead className="font-medium text-gray-300 text-sm">详情</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                            <div className="flex flex-col items-center">
                              <DollarSign className="h-8 w-8 text-gray-600 mb-2" />
                              <p className="text-sm">暂无收益记录</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        revenueEvents.map((event) => (
                          <TableRow key={event.id} className="border-gray-700">
                            <TableCell className="font-medium text-gray-200 text-sm">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                event.event === '作者收益' 
                                  ? 'bg-green-900/20 text-green-400 border border-green-800' 
                                  : 'bg-purple-900/20 text-purple-400 border border-purple-800'
                              }`}>
                                {event.event}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300 text-sm">{event.timestamp}</TableCell>
                            <TableCell className="font-medium text-green-400 text-sm">
                              {event.amount} BUSD
                            </TableCell>
                            <TableCell className="text-gray-300 text-sm">
                              {event.ebookId && (
                                <div className="flex flex-col space-y-1 text-xs">
                                  <span>书籍ID: {event.ebookId}</span>
                                  {event.authorShare && (
                                    <span className="text-green-400">作者: {event.authorShare} BUSD</span>
                                  )}
                                  {event.referrerShare && Number(event.referrerShare) > 0 && (
                                    <span className="text-purple-400">推荐: {event.referrerShare} BUSD</span>
                                  )}
                                  {event.platformShare && (
                                    <span className="text-blue-400">平台: {event.platformShare} BUSD</span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* 加载更多按钮 */}
                  {hasMoreEvents && revenueEvents.length > 0 && (
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={loadMoreEvents}
                        disabled={loadingMore}
                        variant="outline"
                        size="sm"
                        className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            加载中...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            加载更多
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-100 flex items-center justify-between">
                我创建的电子书
                <span className="text-xs text-gray-400 font-normal">({bookStats.length} 本书籍)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bookStats.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <BookOpen className="mx-auto h-8 w-8 text-gray-600 mb-2" />
                    <p className="text-sm">暂无创建的书籍</p>
                  </div>
                ) : (
                  bookStats.map((book) => (
                    <Link to={`/book/${book.id}`} key={book.id} className="block hover:bg-gray-700 transition-colors duration-150 ease-in-out">
                      <div className="p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-16 overflow-hidden rounded shadow-sm flex-shrink-0">
                            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-100 text-sm truncate">{book.title}</h4>
                                <p className="text-xs text-gray-400 mt-1">书籍ID: #{book.id}</p>
                                <p className="text-xs text-green-400 mt-1">分成次数: {book.salesCount}</p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;