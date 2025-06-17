import React, { useState, useEffect, useCallback } from 'react'
import { useAccount, useReadContract, usePublicClient } from 'wagmi'
import EbookNFT from '../abi/EbookNFT.json'
import BookCard from './BookCard' // 导入 BookCard 组件
import { useNavigate } from 'react-router-dom' // 导入 useNavigate

interface Ebook {
  tokenId: string;
  title: string;
  author: string;
  coverImage: string;
  description: string; // 添加 description 字段
  price: number; // 添加 price 字段
  fileType: string; // 添加 fileType 字段
  category: string; // 添加 category 字段
  rating: number; // 添加 rating 字段
  reviews: number; // 添加 reviews 字段

  metadataUrl: string; // 添加 metadataUrl 字段
}

const DEFAULT_COVER = 'https://via.placeholder.com/150x200?text=No+Cover';

interface UserEbooksProps {
  refreshTrigger?: number; // 用于触发刷新的属性
}

const UserEbooks: React.FC<UserEbooksProps> = ({ refreshTrigger }) => {
  const { address, isConnected } = useAccount()
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null); // 添加 error 状态
  const navigate = useNavigate(); // 初始化 useNavigate
  const publicClient = usePublicClient();
  
  const ebookNFTAddress = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS as `0x${string}`;
  
  // 获取用户拥有的NFT数量
  const { data: balance } = useReadContract({
    address: ebookNFTAddress,
    abi: EbookNFT.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  
  // 获取用户拥有的电子书详情
  const fetchEbooks = useCallback(async () => {
    if (!isConnected || !address || !balance || !publicClient) return;
    if (balance <= 0n) return;
    
    setLoading(true);
    setError(null); // 重置错误状态
    try {
      const fetchedEbooks: Ebook[] = [];
      
      for (let i = 0; i < Number(balance); i++) {
        try {
          // 使用 publicClient 获取 tokenId
          const tokenId = await publicClient.readContract({
            address: ebookNFTAddress,
            abi: EbookNFT.abi,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, BigInt(i)]
          }) as bigint;
          
          const tokenIdStr = tokenId.toString();
          
          // 获取 tokenURI
          const metadataUri = await publicClient.readContract({
            address: ebookNFTAddress,
            abi: EbookNFT.abi,
            functionName: 'tokenURI',
            args: [tokenId]
          }) as string;
          
          const ipfsHash = metadataUri.replace('ipfs://', '');
          const metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
          
          try {
            const response = await fetch(metadataUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const metadata = await response.json();
            
            fetchedEbooks.push({
              tokenId: tokenIdStr,
              title: metadata.name,
              author: metadata.author || "未知作者",
              coverImage: metadata.image || DEFAULT_COVER,
              description: metadata.description || "",
              price: parseFloat(metadata.price) || 0, // 假设元数据中有price字段
              fileType: metadata.attributes?.find((attr: any) => attr.trait_type === "文件类型")?.value || "",
              category: metadata.attributes?.find((attr: any) => attr.trait_type === "分类")?.value || "",
              rating: metadata.rating || 0,
              reviews: metadata.reviews || 0,
      
              metadataUrl: metadataUrl // 保存完整的 metadataUrl
            });
          } catch (error) {
            console.error(`获取元数据失败 (token ${tokenIdStr}):`, error);
            fetchedEbooks.push({
              tokenId: tokenIdStr,
              title: `电子书 #${tokenIdStr}`,
              author: "未知作者",
              coverImage: DEFAULT_COVER,
              description: "",
              price: 0,
              fileType: "",
              category: "",
              rating: 0,
              reviews: 0,
      
              metadataUrl: metadataUrl // 即使失败也保存metadataUrl
            });
          }
        } catch (error) {
          console.error(`获取第 ${i} 个token失败:`, error);
        }
      }
      
      setEbooks(fetchedEbooks);
    } catch (err) {
      console.error('获取电子书数据失败:', err);
      setError(`获取电子书数据失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [isConnected, balance, address, publicClient, ebookNFTAddress]);

  useEffect(() => {
    fetchEbooks();
  }, [fetchEbooks, refreshTrigger]); // 添加refreshTrigger依赖

  const handleViewEbook = (book: Ebook) => {
    navigate(`/read/${book.tokenId}`);
  };

  return (
    <div className="p-4">
      {isConnected ? (
        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 shadow-md rounded-lg p-6">
          {loading ? (
            <p className="text-center text-gray-600">加载电子书信息中...</p>
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : ebooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {ebooks.map(ebook => (
                <BookCard
                  key={ebook.tokenId}
                  book={{
                    id: ebook.tokenId,
                    title: ebook.title,
                    author: ebook.author,
                    description: ebook.description,
                    price: ebook.price,
                    coverImage: ebook.coverImage,
                    fileType: ebook.fileType,
                    category: ebook.category,
                    rating: ebook.rating,
                    reviews: ebook.reviews,
              
                    metadataUrl: ebook.metadataUrl
                  }}
                  viewMode="grid"
                  onPurchase={() => { /* 用户已拥有，无需购买 */ }}
                  onView={handleViewEbook}
                  owned={true}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600">未找到电子书信息。请确保您已连接钱包并拥有电子书 NFT。</p>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500">请连接钱包查看您的电子书。</p>
      )}
    </div>
  );
};

export default UserEbooks;