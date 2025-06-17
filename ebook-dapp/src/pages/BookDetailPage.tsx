import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, Eye, Star, Twitter, Share2 } from 'lucide-react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import axios from 'axios';
import PurchaseEbook from '@/components/PurchaseEbook';
import EbookNFTABI from '../abi/EbookNFT.json';
import EbookSalesDistributorABI from '../abi/EbookSalesDistributor.json';

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
  isOwned: boolean;
  metadataUrl: string; // 添加 metadataUrl 属性
}

const BookDetailPage: React.FC = () => {
  const { ebookId } = useParams<{ ebookId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  
  const [book, setBook] = useState<EBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  
  // 获取推荐人地址
  const referrerAddress = searchParams.get('ref');
  const [isValidReferrer, setIsValidReferrer] = useState<boolean | null>(null);
  const [referrerValidationLoading, setReferrerValidationLoading] = useState(false);
  
  // 合约地址
  const ebookNFTAddress = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS as `0x${string}`;
  const salesDistributorAddress = import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS as `0x${string}`;
  const ipfsGateway = import.meta.env.VITE_IPFS_GATEWAY;
  const DEFAULT_COVER = '/default-cover.png';

  // 检查用户是否拥有该NFT
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

  // 验证推荐人是否有效
  const validateReferrer = async (referrerAddr: string) => {
    if (!publicClient) return false;
    
    try {
      // 检查推荐人地址是否拥有至少一个NFT（证明是平台用户）
      const referrerBalance = await publicClient.readContract({
        address: ebookNFTAddress,
        abi: EbookNFTABI.abi,
        functionName: 'balanceOf',
        args: [referrerAddr as `0x${string}`]
      }) as bigint;
      
      return referrerBalance > 0n;
    } catch (error) {
      console.error('Error validating referrer:', error);
      return false;
    }
  };

  // 检查用户是否拥有特定电子书的NFT
  const checkOwnership = async (ebookId: string) => {
    if (!address || !publicClient) {
      return false;
    }

    try {
      // 使用hasEbookNFTByEbookId函数检查用户是否拥有该电子书的NFT
      const hasNFT = await publicClient.readContract({
        address: ebookNFTAddress,
        abi: EbookNFTABI.abi,
        functionName: 'hasEbookNFTByEbookId',
        args: [address, BigInt(ebookId)]
      }) as boolean;
      
      return hasNFT;
    } catch (error) {
      console.error('Error checking ownership:', error);
      return false;
    }
  };

  // 获取电子书详情
  const fetchBookDetails = async () => {
    console.log('🔍 [fetchBookDetails] 开始获取电子书详情');
    console.log('📚 [fetchBookDetails] ebookId:', ebookId);
    console.log('🌐 [fetchBookDetails] publicClient:', !!publicClient);
    console.log('📍 [fetchBookDetails] 当前URL:', window.location.href);
    console.log('🔗 [fetchBookDetails] referrerAddress:', referrerAddress);
    
    if (!ebookId || !publicClient) {
      console.error('❌ [fetchBookDetails] 缺少必要参数:', { ebookId, publicClient: !!publicClient });
      setError('无效的电子书ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📞 [fetchBookDetails] 开始调用合约方法');
      
      // 首先需要找到该电子书的一个tokenId来获取tokenURI
      // 由于同一个电子书的所有NFT都有相同的metadata，我们可以找到任意一个tokenId
      let tokenURI = '';
      const totalSupply = await publicClient.readContract({
        address: ebookNFTAddress,
        abi: EbookNFTABI.abi,
        functionName: 'totalSupply',
        args: []
      }) as bigint;
      
      // 遍历所有token找到对应ebookId的tokenId
      for (let i = 1n; i <= totalSupply; i++) {
        try {
          const tokenEbookId = await publicClient.readContract({
            address: ebookNFTAddress,
            abi: EbookNFTABI.abi,
            functionName: 'getEbookIdByTokenId',
            args: [i]
          }) as bigint;
          
          if (tokenEbookId.toString() === ebookId) {
            tokenURI = await publicClient.readContract({
              address: ebookNFTAddress,
              abi: EbookNFTABI.abi,
              functionName: 'tokenURI',
              args: [i]
            }) as string;
            break;
          }
        } catch (error) {
          // Token可能不存在，继续下一个
          continue;
        }
      }
      
      if (!tokenURI) {
        throw new Error('未找到对应的电子书');
      }
      
      console.log('🔗 [fetchBookDetails] tokenURI:', tokenURI);

      if (!tokenURI) {
        console.error('❌ [fetchBookDetails] tokenURI为空');
        throw new Error('电子书不存在');
      }

      console.log('💰 [fetchBookDetails] 开始获取价格信息...');
      // 获取价格信息
      const priceData = await publicClient.readContract({
        address: salesDistributorAddress,
        abi: EbookSalesDistributorABI.abi,
        functionName: 'getEbookPrice',
        args: [BigInt(ebookId)]
      }) as bigint;

      console.log('💰 [fetchBookDetails] 原始价格数据 (wei):', priceData.toString());
      console.log('💰 [fetchBookDetails] 价格数据类型:', typeof priceData);
      console.log('💰 [fetchBookDetails] 价格数据是否为0:', priceData === 0n);

      console.log('👑 [fetchBookDetails] 开始获取版税信息...');
      // 获取版税信息
      const authorShareBPS = await publicClient.readContract({
        address: salesDistributorAddress,
        abi: EbookSalesDistributorABI.abi,
        functionName: 'getEbookAuthorShareBPS',
        args: [BigInt(ebookId)]
      }) as bigint;

      const referrerShareBPS = await publicClient.readContract({
        address: salesDistributorAddress,
        abi: EbookSalesDistributorABI.abi,
        functionName: 'getEbookReferrerShareBPS',
        args: [BigInt(ebookId)]
      }) as bigint;

      console.log('👑 [fetchBookDetails] 作者分成BPS:', authorShareBPS.toString());
      console.log('👑 [fetchBookDetails] 推荐人分成BPS:', referrerShareBPS.toString());

      // 计算各方分成比例（BPS转换为百分比）
      const authorRoyalty = Number(authorShareBPS) / 100;
      const distributorRoyalty = Number(referrerShareBPS) / 100;
      const platformRoyalty = 15; // 固定平台分成15%

      console.log('📊 [fetchBookDetails] 分成比例计算结果:', {
        authorRoyalty,
        distributorRoyalty,
        platformRoyalty
      });

      console.log('📡 [fetchBookDetails] 开始从IPFS获取元数据...');
      // 从IPFS获取元数据
      const metadata = await fetchMetadataFromIPFS(tokenURI);
      
      console.log('📡 [fetchBookDetails] IPFS元数据:', metadata);
      
      if (!metadata) {
        console.error('❌ [fetchBookDetails] 无法获取IPFS元数据');
        throw new Error('无法获取电子书元数据');
      }

      console.log('🔢 [fetchBookDetails] 开始解析价格...');
      // 解析电子书价格
      const bookPrice = parseFloat(formatUnits(priceData, 18));
      console.log('💰 [fetchBookDetails] formatUnits结果:', formatUnits(priceData, 18));
      console.log('💰 [fetchBookDetails] parseFloat结果:', bookPrice);
      console.log('💰 [fetchBookDetails] 最终价格类型:', typeof bookPrice);
      console.log('💰 [fetchBookDetails] 价格是否为NaN:', isNaN(bookPrice));
      console.log('💰 [fetchBookDetails] 价格是否为0:', bookPrice === 0);

      console.log('🔐 [fetchBookDetails] 开始检查用户所有权...');
      // 检查用户是否拥有该NFT
      const isOwned = await checkOwnership(ebookId);
      console.log('🔐 [fetchBookDetails] 用户是否拥有NFT:', isOwned);

      // 构建 metadataUrl
      const metadataUrl = tokenURI.replace('ipfs://', `${ipfsGateway}/ipfs/`);
      console.log('🔗 [fetchBookDetails] 构建的metadataUrl:', metadataUrl);

      console.log('🏗️ [fetchBookDetails] 开始构建bookData对象...');
      const bookData: EBook = {
        id: ebookId,
        title: metadata.name || '未知标题',
        author: metadata.author || '未知作者',
        description: metadata.description || '暂无描述',
        price: bookPrice,
        coverImage: metadata.image ? metadata.image.replace('ipfs://', `${ipfsGateway}/ipfs/`) : DEFAULT_COVER,
        fileType: metadata.attributes?.find((attr: any) => attr.trait_type === '文件类型')?.value || 'PDF',
        category: metadata.attributes?.find((attr: any) => attr.trait_type === '分类')?.value || '其他',
        rating: 4.5, // 默认评分
        reviews: Math.floor(Math.random() * 100) + 10, // 随机评论数
        authorRoyalty: Number(authorRoyalty),
        distributorRoyalty: Number(distributorRoyalty),
        platformRoyalty: Number(platformRoyalty),
        isOwned,
        metadataUrl // 添加 metadataUrl 到 bookData
      };

      console.log('📖 [fetchBookDetails] 最终构建的bookData:', {
        ...bookData,
        // 特别关注价格相关字段
        price: bookData.price,
        priceType: typeof bookData.price,
        isOwned: bookData.isOwned
      });

      console.log('✅ [fetchBookDetails] 设置book状态...');
      setBook(bookData);
      console.log('🎉 [fetchBookDetails] 电子书详情获取成功完成!');
    } catch (err: any) {
      console.error('❌ [fetchBookDetails] 获取电子书详情失败:', err);
      console.error('❌ [fetchBookDetails] 错误堆栈:', err.stack);
      console.error('❌ [fetchBookDetails] 错误消息:', err.message);
      setError(err.message || '获取电子书详情失败');
    } finally {
      console.log('🏁 [fetchBookDetails] 函数执行完成，设置loading为false');
      setLoading(false);
    }
  };

  // 验证推荐人
  useEffect(() => {
    const checkReferrer = async () => {
      if (referrerAddress && publicClient) {
        setReferrerValidationLoading(true);
        try {
          const isValid = await validateReferrer(referrerAddress);
          setIsValidReferrer(isValid);
        } catch (error) {
          console.error('推荐人验证失败:', error);
          setIsValidReferrer(false);
        } finally {
          setReferrerValidationLoading(false);
        }
      } else {
        setIsValidReferrer(null);
      }
    };
    
    checkReferrer();
  }, [referrerAddress, publicClient]);

  useEffect(() => {
    // 始终尝试获取书籍详情，推荐人验证状态不应阻止书籍信息加载
    // 推荐人验证的逻辑主要影响购买时的分账和UI提示

    // 如果是通过推荐链接访问，并且推荐人验证还未完成，可以先获取书籍详情
    // UI上会显示推荐人验证中的状态
    fetchBookDetails();

    // 如果推荐人验证完成且无效，则设置错误信息，但这不应阻止 fetchBookDetails 的初始调用
    // fetchBookDetails 内部的 setLoading(false) 会处理加载状态
    if (referrerAddress && isValidReferrer === false && !referrerValidationLoading) {
      // setError('无效的推荐人地址。购买时将不计入推荐。'); 
      // 这里可以考虑是否设置全局错误，或者仅在推荐人信息部分提示
      // 为了让页面能展示书籍，暂时不在这里设置全局 error 阻断渲染
    }
  }, [ebookId, publicClient, address, userBalance]); // 移除了 isValidReferrer 和 referrerValidationLoading 作为主要阻塞依赖

  // 单独处理推荐人验证失败时的UI提示或错误状态
  useEffect(() => {
    if (referrerAddress && isValidReferrer === false && !referrerValidationLoading) {
      // setError('无效的推荐人地址。通过此链接购买将无法获得推荐奖励。');
      // 或者仅在UI层面提示，不设置全局error状态，以免影响书籍信息展示
      console.warn('无效的推荐人地址，或推荐人验证失败。');
    }
  }, [referrerAddress, isValidReferrer, referrerValidationLoading]);

  // 监听地址变化，立即重新验证权限
  useEffect(() => {
    if (book && address) {
      // 当地址变化时，重新检查所有权
      const revalidateOwnership = async () => {
        try {
          const isOwned = await checkOwnership(ebookId!);
          setBook(prev => prev ? { ...prev, isOwned } : null);
        } catch (error) {
          console.error('重新验证所有权失败:', error);
          setBook(prev => prev ? { ...prev, isOwned: false } : null);
        }
      };
      revalidateOwnership();
    }
  }, [address]); // 只监听地址变化

  // 购买成功后的回调函数
  const handlePurchaseSuccess = () => {
    // 重新获取书籍详情以更新价格和所有权状态
    fetchBookDetails();
  };

  const handlePurchase = () => {
    if (!book) return;

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

    setIsPurchaseModalOpen(true);
  };

  const handleRead = async () => {
    if (!book || !publicClient) return;
    
    try {
      // 需要找到该电子书的一个tokenId来进行阅读
      const totalSupply = await publicClient.readContract({
        address: ebookNFTAddress,
        abi: EbookNFTABI.abi,
        functionName: 'totalSupply',
        args: []
      }) as bigint;
      
      // 遍历找到用户拥有的该电子书的tokenId
      for (let i = 1n; i <= totalSupply; i++) {
        try {
          const tokenEbookId = await publicClient.readContract({
            address: ebookNFTAddress,
            abi: EbookNFTABI.abi,
            functionName: 'getEbookIdByTokenId',
            args: [i]
          }) as bigint;
          
          if (tokenEbookId.toString() === book.id) {
            // 检查用户是否拥有这个token
            const tokenOwner = await publicClient.readContract({
              address: ebookNFTAddress,
              abi: EbookNFTABI.abi,
              functionName: 'ownerOf',
              args: [i]
            }) as string;
            
            if (tokenOwner.toLowerCase() === address?.toLowerCase()) {
              navigate(`/read/${i.toString()}`);
              return;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      alert('未找到您拥有的该电子书NFT');
    } catch (error) {
      console.error('Error finding token for reading:', error);
      alert('获取阅读权限失败');
    }
  };

  // 生成分销链接
  const generateDistributionLink = (ebookId: string) => {
    if (!address) return '';
    return `${window.location.origin}/book/${ebookId}?ref=${address}`;
  };

  // 分享到推特
  const shareToTwitter = () => {
    if (!book || !address) return;
    
    const distributionLink = generateDistributionLink(book.id);
    
    // 构建推文文本，包含封面图片链接以便Twitter自动显示预览
    let tweetText = `我发现了这本很棒的电子书："${book.title}" by ${book.author}！\n\n📚 通过我的推荐链接购买：\n${distributionLink}`;
    
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 max-w-sm mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300 text-center">加载电子书详情中...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 max-w-sm mx-auto text-center">
          <p className="text-red-400 mb-4">{error || '电子书不存在'}</p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-300 hover:text-white hover:bg-gray-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回
        </Button>

        {/* 推荐人信息 */}
        {referrerAddress && (
          <div className={`mb-6 p-4 rounded-lg ${
            referrerValidationLoading 
              ? 'bg-yellow-900/20 border border-yellow-700/50'
              : isValidReferrer 
                ? 'bg-blue-900/20 border border-blue-700/50'
                : 'bg-red-900/20 border border-red-700/50'
          }`}>
            {referrerValidationLoading ? (
              <p className="text-yellow-300 text-sm">
                🔍 正在验证推荐人地址...
              </p>
            ) : isValidReferrer ? (
              <p className="text-blue-300 text-sm">
                📢 此电子书由推荐人分享: <span className="font-mono text-blue-200">{referrerAddress}</span>
              </p>
            ) : (
              <p className="text-red-300 text-sm">
                ❌ 无效的推荐人地址: <span className="font-mono text-red-200">{referrerAddress}</span>
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 电子书封面 */}
          <div className="flex justify-center">
            <Card className="bg-gray-800 border-gray-700 overflow-hidden max-w-md">
              <div className="aspect-[3/4] relative">
                <img 
                  src={book.coverImage} 
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = DEFAULT_COVER;
                  }}
                />
                {book.isOwned && (
                  <Badge className="absolute top-4 right-4 bg-green-600 text-white">
                    已拥有
                  </Badge>
                )}
              </div>
            </Card>
          </div>

          {/* 电子书信息 */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{book.title}</h1>
              <p className="text-xl text-gray-300 mb-4">作者: {book.author}</p>
              
              <div className="flex items-center gap-4 mb-4">
                <Badge className="bg-gray-700 text-gray-300">
                  {book.category}
                </Badge>
                <Badge className="bg-gray-700 text-gray-300">
                  {book.fileType}
                </Badge>
                <div className="flex items-center text-yellow-400">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  <span className="text-sm">{book.rating}</span>
                  <span className="text-gray-400 text-sm ml-1">({book.reviews} 评论)</span>
                </div>
              </div>

              <div className="text-2xl font-bold text-green-400 mb-6">
                {`$${book.price}`}
              </div>
            </div>

            {/* 描述 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">内容简介</h3>
              <p className="text-gray-300 leading-relaxed">{book.description}</p>
            </div>

            {/* 版税信息 */}
            {(book.authorRoyalty || book.distributorRoyalty || book.platformRoyalty) && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">版税分配</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {book.authorRoyalty && (
                    <div className="text-center p-3 bg-gray-800 rounded-lg">
                      <p className="text-gray-400">作者版税</p>
                      <p className="text-white font-semibold">{book.authorRoyalty}%</p>
                    </div>
                  )}
                  {book.distributorRoyalty && (
                    <div className="text-center p-3 bg-gray-800 rounded-lg">
                      <p className="text-gray-400">分销版税</p>
                      <p className="text-white font-semibold">{book.distributorRoyalty}%</p>
                    </div>
                  )}
                  {book.platformRoyalty && (
                    <div className="text-center p-3 bg-gray-800 rounded-lg">
                      <p className="text-gray-400">平台版税</p>
                      <p className="text-white font-semibold">{book.platformRoyalty}%</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="space-y-3">
              {book.isOwned ? (
                <Button 
                  onClick={handleRead}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
                >
                  <Eye className="mr-2 h-5 w-5" />
                  开始阅读
                </Button>
              ) : book.price > 0 ? (
                <Button 
                  onClick={handlePurchase}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  立即购买
                </Button>
              ) : (
                <div className="w-full bg-gray-600 text-gray-300 py-3 text-lg rounded-lg text-center">
                  <span className="text-sm">免费电子书 - 暂不支持获取</span>
                </div>
              )}
              
              {/* 分享功能 */}
              {isConnected && address && (
                <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium text-gray-200">分享推荐链接:</p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 rounded-full hover:bg-gray-600/50"
                      onClick={() => {
                        navigator.clipboard.writeText(generateDistributionLink(book.id));
                        // 可以添加一个复制成功的提示
                      }}
                    >
                      <Share2 className="h-3 w-3 text-gray-400 hover:text-blue-400" />
                    </Button>
                  </div>
                  <p className="text-xs text-blue-400 truncate bg-gray-900/50 p-2 rounded border border-gray-600 mb-3">
                    {generateDistributionLink(book.id)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full bg-gray-800/80 border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-blue-300 text-sm font-medium transition-colors duration-300"
                    onClick={shareToTwitter}
                  >
                    <Twitter className="mr-2 h-4 w-4" />
                    分享到推特
                  </Button>
                </div>
              )}
              
              {!isConnected && (
                <p className="text-yellow-400 text-sm text-center">
                  请先连接钱包以购买或阅读电子书
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 购买模态框 */}
      {book && (
        <PurchaseEbook
          book={book}
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          referrerAddress={isValidReferrer && referrerAddress ? referrerAddress : undefined} // 只有当推荐人有效时才传递
          onPurchaseSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
};

export default BookDetailPage;