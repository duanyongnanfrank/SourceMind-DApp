import React, { useState, useCallback, useEffect } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useAccount, useWalletClient, useReadContract, usePublicClient, useWriteContract, useSimulateContract } from 'wagmi';
import { uploadToIPFS } from '../utils/ipfs';
import { parseUnits, formatUnits } from 'viem';
import EbookSalesDistributorArtifact from '../abi/EbookSalesDistributor.json';
import GenericERC20Abi from '../abi/GenericERC20.json';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import axios from 'axios';

interface EbookMetadata {
  name: string;
  description: string;
  image: string;
  file: string;
  attributes: Array<{ trait_type: string; value: string }>;
}

const getAbiForViem = (artifact: any): any[] => {
  if (Array.isArray(artifact)) {
    return artifact;
  }
  if (artifact.abi && Array.isArray(artifact.abi)) {
    return artifact.abi;
  }
  if (artifact.interface && Array.isArray(artifact.interface.fragments)) {
    return artifact.interface.fragments;
  }
  console.error("getAbiForViem: ABI extraction failed: Unknown Artifact structure", artifact);
  return [];
};

const CreateEbookForm: React.FC = () => {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [ebookFile, setEbookFile] = useState<File | null>(null); // This is the state we need to verify

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const navigate = useNavigate();
  const publicClient = usePublicClient();

  const PLATFORM_ROYALTY_PERCENTAGE = 15;
  const [authorRoyalty, setAuthorRoyalty] = useState<number[]>([70]);

  const categories = ['金融', '科技', '技术', '娱乐', '医学', '生物', '健康', '其他'];

  const salesDistributorContractAddress = import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS as `0x${string}`;
  const salesTokenAddress = (import.meta.env.VITE_APP_TBUSD_TOKEN_ADDRESS || "0xaB1a4d4f1D656d2450692D237fdD6C7f9146e814") as `0x${string}`;
  const SALES_TOKEN_SYMBOL = "tBUSD";

  const uploadFeeTokenAddress = (import.meta.env.VITE_APP_UPLOAD_FEE_TOKEN_ADDRESS || "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd") as `0x${string}`;
  const UPLOAD_FEE_TOKEN_SYMBOL = "WBNB";

  const salesDistributorAbi = getAbiForViem(EbookSalesDistributorArtifact);
  const genericERC20Abi = getAbiForViem(GenericERC20Abi);

  const [uploadFee, setUploadFee] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isApproved, setIsApproved] = useState(false);
  const [approving, setApproving] = useState(false);

  const { data: fetchedUploadFee, isLoading: isLoadingUploadFee } = useReadContract({
    address: salesDistributorContractAddress,
    abi: salesDistributorAbi,
    functionName: 'UPLOAD_FEE',
    query: {
      enabled: !!salesDistributorContractAddress && salesDistributorAbi.length > 0,
      select: (data) => data as bigint,
      refetchInterval: 5000,
    }
  });

  const { data: fetchedAllowance, isLoading: isLoadingAllowance } = useReadContract({
    address: uploadFeeTokenAddress,
    abi: genericERC20Abi,
    functionName: 'allowance',
    args: [address!, salesDistributorContractAddress],
    query: {
      enabled: !!uploadFeeTokenAddress && genericERC20Abi.length > 0 && !!address && !!salesDistributorContractAddress,
      select: (data) => data as bigint,
      refetchInterval: 5000,
    }
  });

  useEffect(() => {
    if (fetchedUploadFee !== undefined && fetchedUploadFee !== null) {
      setUploadFee(fetchedUploadFee);
    }
    if (fetchedAllowance !== undefined && fetchedAllowance !== null) {
      setAllowance(fetchedAllowance);
    }
  }, [fetchedUploadFee, fetchedAllowance]);

  useEffect(() => {
    setIsApproved(allowance >= uploadFee && uploadFee > 0n);
  }, [allowance, uploadFee]);

  const handleAuthorRoyaltyChange = useCallback((value: number[]) => {
    const newAuthorRoyalty = value[0];
    const maxAuthorRoyaltyLimit = 100 - PLATFORM_ROYALTY_PERCENTAGE;
    if (newAuthorRoyalty < 0) return;
    if (newAuthorRoyalty > maxAuthorRoyaltyLimit) {
      setAuthorRoyalty([maxAuthorRoyaltyLimit]);
    } else {
      setAuthorRoyalty(value);
    }
  }, []);

  // 确保分销者分成不为负数，且总分成为100%
  const maxAuthorRoyalty = 100 - PLATFORM_ROYALTY_PERCENTAGE; // 最大85%
  const actualAuthorRoyalty = Math.min(authorRoyalty[0], maxAuthorRoyalty);
  const distributorRoyalty = maxAuthorRoyalty - actualAuthorRoyalty;
  const safeDistributorRoyalty = Math.max(0, distributorRoyalty);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'ebook') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (type === 'cover') {
        setCoverImage(file);
      } else {
        setEbookFile(file);
      }
    } else {
      if (type === 'cover') {
        setCoverImage(null);
      } else {
        setEbookFile(null);
      }
    }
  };


  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    if (value.startsWith('.') && value.length > 1) {
      value = '0' + value;
    } else if (value === '.') {
      value = '0.';
    }
    if (value.includes('.')) {
      const [integerPart, decimalPart] = value.split('.');
      if (decimalPart && decimalPart.length > 2) {
        value = integerPart + '.' + decimalPart.substring(0, 2);
      }
    }
    const [integerPart, decimalPart] = value.split('.');
    if (integerPart.length > 7) {
      value = integerPart.substring(0, 7) + (decimalPart ? '.' + decimalPart : '');
    }
    setPrice(value);
  };

  const { data: approveSimulateData } = useSimulateContract({
    address: uploadFeeTokenAddress,
    abi: genericERC20Abi,
    functionName: 'approve',
    args: [salesDistributorContractAddress, uploadFee],
    query: {
      enabled: isConnected && !!uploadFeeTokenAddress && !!salesDistributorContractAddress && uploadFee > 0n && !isApproved,
    }
  });

  const { writeContract: writeApproveContract, isPending: isApprovePending } = useWriteContract();

  const handleApprove = async () => {
    if (!isConnected || !address || !uploadFeeTokenAddress || !approveSimulateData?.request) {
      setMessage('请连接钱包并等待授权信息加载。');
      return;
    }
    if (uploadFee === 0n) {
      setMessage('上传费用未加载或为零，无法授权。');
      return;
    }

    setApproving(true);
    setMessage('正在授权...');

    try {
      writeApproveContract(approveSimulateData.request, {
        onSettled: (hash, error) => {
          if (hash) {
            setMessage('授权交易已发送，等待确认...');
          } else if (error) {
            let errorMessage = '授权失败';
            if ((error as any).cause?.shortMessage) {
              errorMessage = (error as any).cause.shortMessage;
            } else if ((error as any).shortMessage) {
              errorMessage = (error as any).shortMessage;
            } else if ((error as any).message) {
              errorMessage = (error as any).message;
            }
            setMessage(`授权失败: ${errorMessage}`);
            setApproving(false);
          }
        },
        onSuccess: (hash) => {
          setMessage(`${UPLOAD_FEE_TOKEN_SYMBOL} 已成功授权！现在可以创建电子书。交易哈希: ${hash}`);
          setApproving(false);
        },
        onError: (error) => {
          let errorMessage = '授权失败';
          if ((error as any).cause?.shortMessage) {
            errorMessage = (error as any).cause.shortMessage;
          } else if ((error as any).shortMessage) {
            errorMessage = (error as any).shortMessage;
          } else if ((error as any).message) {
            errorMessage = (error as any).message;
          }
          setMessage(`授权失败: ${errorMessage}`);
          setApproving(false);
        },
      });
    } catch (err: any) {
      let errorMessage = '授权失败';
      if (err.code === 'ACTION_REJECTED') {
        errorMessage = '授权交易已被用户拒绝。';
      } else if (err.shortMessage) {
        errorMessage = err.shortMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setMessage(`授权失败: ${errorMessage}`);
      setApproving(false);
    }
  };


  const { writeContract: writeDefineEbookContract, isPending: isDefineEbookPending } = useWriteContract();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address || !walletClient) {
      setMessage('请连接钱包。');
      return;
    }
    if (!isApproved) {
      setMessage(`请先授权 ${UPLOAD_FEE_TOKEN_SYMBOL} 支付上传费用。`);
      return;
    }
    if (uploadFee === 0n || isLoadingUploadFee) {
      setMessage('上传费用未加载，请稍后再试。');
      return;
    }

    if (!name || !author || !description || !price || !coverImage || !ebookFile || !category) {
      setMessage('请填写所有字段并上传文件。');
      return;
    }

    if (actualAuthorRoyalty === 0) {
      setMessage('创作者分成比例不能为0。');
      return;
    }
    const totalPercentage = actualAuthorRoyalty + safeDistributorRoyalty + PLATFORM_ROYALTY_PERCENTAGE;
    if (totalPercentage > 100) {
        setMessage(`总分成比例超过 100% (${totalPercentage}%)。请调整创作者或分销商分成。`);
        return;
    }
    if (actualAuthorRoyalty < 0 || actualAuthorRoyalty > 100) {
      setMessage('创作者分成比例必须在 0-100% 之间。');
      return;
    }
    if (safeDistributorRoyalty < 0 || safeDistributorRoyalty > 100) {
      setMessage('分销商分成比例必须在 0-100% 之间。');
      return;
    }

    const parsedPriceValue = parseFloat(price);
    if (isNaN(parsedPriceValue) || parsedPriceValue <= 0) {
        setMessage('请输入一个有效且大于零的价格。');
        return;
    }

    setLoading(true);
    setMessage('正在上传文件和元数据到IPFS...');

    try {
      const coverIpfsUri = await uploadToIPFS(coverImage);
      setMessage(`封面图片已上传: ${coverIpfsUri}`);

      const ebookIpfsUri = await uploadToIPFS(ebookFile);
      setMessage(`电子书文件已上传: ${ebookIpfsUri}`);


      const metadata: EbookMetadata = {
        name,
        description,
        image: coverIpfsUri,
        file: ebookIpfsUri,
        attributes: [
          { trait_type: '作者', value: author },
          { trait_type: '价格', value: price },
          { trait_type: '文件类型', value: ebookFile.type },
          { trait_type: '文件大小', value: (ebookFile.size / (1024 * 1024)).toFixed(2) + ' MB' },
          { trait_type: '分类', value: category },
        ],
      };

      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json', { type: 'application/json' });
      const metadataIpfsUri = await uploadToIPFS(metadataFile);
      setMessage(`元数据已上传: ${metadataIpfsUri}`);
      console.log("DEBUG: 元数据 IPFS URI:", metadataIpfsUri);

      if (!salesDistributorAbi || salesDistributorAbi.length === 0) {
        console.error("DEBUG: 销售分发合约 ABI 未正确加载 (值为 null/undefined 或为空数组)。");
        throw new Error("销售分发合约 ABI 未正确加载。请检查 ABI 文件路径和内容。");
      }
      console.log("DEBUG: 销售分发合约 ABI 已加载。");


      setMessage('正在定义电子书 (Define Ebook on-chain)...');
      console.log("DEBUG: 开始构建交易数据...");

      const parsedPriceInWei = parseUnits(price, 18);
      const authorShareBPS = BigInt(actualAuthorRoyalty * 100);
      const referrerShareBPS = BigInt(safeDistributorRoyalty * 100);

      const contractArgs = [
        metadataIpfsUri as `ipfs://${string}`,
        parsedPriceInWei,
        authorShareBPS,
        referrerShareBPS,
        uploadFee,
      ];

      console.log("DEBUG: 交易参数 (用于模拟):");
      console.log("  DEBUG - metadataIpfsUri:", contractArgs[0]);
      console.log("  DEBUG - parsedPriceInWei (tBUSD wei):", contractArgs[1].toString());
      console.log("  DEBUG - authorShareBPS:", contractArgs[2].toString());
      console.log("  DEBUG - referrerShareBPS:", contractArgs[3].toString());
      console.log("  DEBUG - _uploadFee (WBNB wei):", contractArgs[4].toString());

      setMessage("正在模拟交易...");
      let simulateResult;
      try {
        simulateResult = await publicClient.simulateContract({
          address: salesDistributorContractAddress,
          abi: salesDistributorAbi,
          functionName: 'defineEbookForSale',
          args: contractArgs,
          account: address,
          gas: 700000n,
        });
        console.log("DEBUG: 交易模拟成功。", simulateResult.request);
      } catch (simulateError: any) {
          console.error("DEBUG: 交易模拟失败:", simulateError);
          let errorMessage = '交易模拟失败';
          if (simulateError.cause?.shortMessage) {
            errorMessage = simulateError.cause.shortMessage;
          } else if (simulateError.shortMessage) {
            errorMessage = simulateError.shortMessage;
          } else if (simulateError.message) {
            errorMessage = simulateError.message;
          }
          setMessage(`定义失败：交易模拟被拒绝。原因：${errorMessage}`);
          setLoading(false);
          return;
      }

      if (!simulateResult?.request) {
          setMessage("定义失败：交易模拟数据缺失或请求未生成。");
          setLoading(false);
          return;
      }

      setMessage('交易发送中，请在钱包中确认...');
      writeDefineEbookContract(simulateResult.request, {
        onSettled: (hashResult, error) => {
          if (hashResult) {
            setMessage('交易已发送，等待确认...');
            console.log("DEBUG: 交易发送成功，交易哈希:", hashResult);
          } else if (error) {
            console.error('DEBUG: 定义电子书失败 (onSettled error):', error);
            let errorMessage = '定义失败';
            if ((error as any).cause?.shortMessage) {
              errorMessage = (error as any).cause.shortMessage;
            } else if ((error as any).shortMessage) {
              errorMessage = (error as any).shortMessage;
            } else if ((error as any).message) {
              errorMessage = (error as any).message;
            }
            setMessage(`定义失败: ${errorMessage}`);
            setLoading(false);
          }
        },
        onSuccess: (hashResult) => {
            setMessage(`电子书已成功定义并上架销售！交易哈希: ${hashResult}`);
            console.log("DEBUG: 交易已确认，收据:", hashResult);
            navigate('/my-ebooks');
        },
        onError: (error) => {
            console.error('DEBUG: 定义电子书失败 (onError):', error);
            let errorMessage = '定义失败';
            if ((error as any).cause?.shortMessage) {
              errorMessage = (error as any).cause.shortMessage;
            } else if ((error as any).shortMessage) {
              errorMessage = (error as any).shortMessage;
            } else if ((error as any).message) {
              errorMessage = (error as any).message;
            }
            setMessage(`定义失败: ${errorMessage}`);
            setLoading(false);
        }
      });


    } catch (err: any) {
      console.error('DEBUG: 定义电子书失败 (主 catch 块):', err);
      let errorMessage = '未知错误';
      if (axios.isAxiosError(err)) {
        if (err.response) {
          errorMessage = `IPFS上传失败：${err.response.status} ${err.response.statusText} - ${JSON.stringify(err.response.data)}`;
          console.error("Axios Response Error Data:", err.response.data);
        } else if (err.request) {
          errorMessage = "IPFS上传请求无响应，可能是网络问题或CORS。";
        } else {
          errorMessage = `IPFS上传错误: ${err.message}`;
        }
      }
      else if (err.code === 'ACTION_REJECTED') {
        errorMessage = '交易已被用户拒绝。';
      } else if (err.shortMessage) {
        errorMessage = err.shortMessage;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        errorMessage = JSON.stringify(err, Object.getOwnPropertyNames(err));
      }
      setMessage(`定义失败: ${errorMessage}`);
    } finally {
      setLoading(false);
      console.log("---------------------------------------");
    }
  };

  const isFormValid =
    isConnected &&
    !!name && name.length > 0 &&
    !!author && author.length > 0 &&
    !!description && description.length > 0 &&
    !!price && parseFloat(price) > 0 &&
    !!coverImage && // Check if coverImage is truly an object
    !!ebookFile && // Check if ebookFile is truly an object
    !!category && category.length > 0 &&
    uploadFee > 0n &&
    actualAuthorRoyalty > 0;

  // DEBUG LOG: Check why the button is disabled (LIVE in console via useEffect)
  useEffect(() => {
    console.log("--- Button Disabled Conditions Check (LIVE) ---");
    console.log("loading:", loading);
    console.log("approving:", approving);
    console.log("!isApproved:", !isApproved);
    console.log("uploadFee === 0n:", uploadFee === 0n);
    console.log("isLoadingUploadFee:", isLoadingUploadFee);
    console.log("isDefineEbookPending:", isDefineEbookPending);
    console.log("!isFormValid (Overall Form Validity):", !isFormValid);

    if (!isFormValid) {
        console.log("--- isFormValid detailed breakdown ---");
        console.log("isConnected:", isConnected);
        console.log("!!name && name.length > 0:", !!name && name.length > 0, "(Name:", name, ")");
        console.log("!!author && author.length > 0:", !!author && author.length > 0, "(Author:", author, ")");
        console.log("!!description && description.length > 0:", !!description && description.length > 0, "(Description:", description, ")");
        console.log("!!price && parseFloat(price) > 0:", !!price && parseFloat(price) > 0, "(Price:", price, ")");
        console.log("!!coverImage:", !!coverImage, "(Cover Image:", coverImage?.name || 'N/A', ")");
        console.log("!!ebookFile:", !!ebookFile, "(Ebook File:", ebookFile?.name || 'N/A', ")");
        console.log("!!category && category.length > 0:", !!category && category.length > 0, "(Category:", category, ")");
        console.log("uploadFee > 0n:", (uploadFee > 0n).toString(), "(Upload Fee:", uploadFee.toString(), ")"); // Fixed here
        console.log("actualAuthorRoyalty > 0:", (actualAuthorRoyalty > 0).toString(), "(Author Royalty:", actualAuthorRoyalty, ")"); // Fixed here
    }
    console.log("-----------------------------------------");
  }, [loading, approving, isApproved, uploadFee, isLoadingUploadFee, isDefineEbookPending, isFormValid, isConnected, name, author, description, price, coverImage, ebookFile, category, authorRoyalty, actualAuthorRoyalty]);


  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">电子书名称</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900"
            required
          />
        </div>
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700">作者 (显示名称)</label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">描述</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900"
            required
          ></textarea>
        </div>
        <div className="mb-4">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">电子书售价 ({SALES_TOKEN_SYMBOL})</label>
              <input
                type="text"
                id="price"
                value={price}
                onChange={handlePriceChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-black"
                placeholder="请输入销售价格"
                required
              />
            </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">分类</label>
          <Select onValueChange={setCategory} value={category} className="relative">
            <SelectTrigger className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent className="z-[9999] absolute w-full bg-white border border-gray-300 rounded-md shadow-lg top-full mt-1">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700">封面图片 (JPG, PNG, GIF)</label>
          <input
            type="file"
            id="coverImage"
            accept="image/jpeg,image/png,image/gif"
            onChange={(e) => handleFileChange(e, 'cover')}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
        </div>
        <div>
          <label htmlFor="ebookFile" className="block text-sm font-medium text-gray-700">电子书文件 (PDF, EPUB)</label>
          <input
            type="file"
            id="ebookFile"
            accept="application/pdf,application/epub+zip"
            onChange={(e) => handleFileChange(e, 'ebook')}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900">版税分成</h3>

          <div className="relative w-full">
            <div className="flex justify-between items-end mb-2 relative z-10">
                <div className="text-left" style={{ flexBasis: `${actualAuthorRoyalty}%`, maxWidth: `${actualAuthorRoyalty}%` }}>
                    <label htmlFor="author-royalty-text" className="block text-sm font-medium text-gray-700">
                        创作者分成 ({actualAuthorRoyalty}%)
                    </label>
                </div>
                <div className="text-center" style={{ flexBasis: `${safeDistributorRoyalty}%`, maxWidth: `${safeDistributorRoyalty}%` }}>
                    <label htmlFor="distributor-royalty-text" className="block text-sm font-medium text-gray-700">
                        分销者分成 ({safeDistributorRoyalty}%)
                    </label>
                </div>
                <div className="text-right" style={{ flexBasis: `${PLATFORM_ROYALTY_PERCENTAGE}%`, maxWidth: `${PLATFORM_ROYALTY_PERCENTAGE}%` }}>
                    <label htmlFor="platform-royalty-text" className="block text-sm font-medium text-gray-700">
                        平台分成 ({PLATFORM_ROYALTY_PERCENTAGE}%)
                    </label>
                </div>
            </div>

            <div className="relative w-full h-[3px] bg-gray-300 rounded-full">
                <Slider.Root
                    id="author-royalty"
                    min={0}
                    max={100 - PLATFORM_ROYALTY_PERCENTAGE}
                    step={1}
                    value={authorRoyalty}
                    onValueChange={handleAuthorRoyaltyChange}
                    className="absolute left-0 top-0 h-full w-[85%] touch-none select-none flex items-center"
                >
                    <Slider.Track className="relative grow rounded-full h-full bg-transparent">
                        <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                      className="block w-5 h-5 bg-white rounded-full shadow-[0_2px_10px] shadow-blackA7 focus:outline-none focus:shadow-[0_0_0_5px] focus:shadow-blackA8"
                      aria-label="Author Royalty"
                    >
                        <div className="absolute inset-0 flex items-center justify-center text-lg">
                            💰
                        </div>
                    </Slider.Thumb>
                </Slider.Root>

                {/* 分销者分成颜色区域 */}
                <div
                    className="absolute bg-green-400 rounded-full h-full"
                    style={{
                        left: `${actualAuthorRoyalty}%`,
                        width: `${safeDistributorRoyalty}%`,
                        maxWidth: `${safeDistributorRoyalty}%`
                    }}
                ></div>

                {/* 固定平台分成颜色区域 */}
                <div
                    className="absolute right-0 top-0 h-full bg-gray-500 rounded-r-full"
                    style={{ width: `${PLATFORM_ROYALTY_PERCENTAGE}%` }}
                ></div>

                {/* 视觉分隔线 */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 bg-gray-400 h-6 w-[2px] z-10"
                    style={{ left: `${100 - PLATFORM_ROYALTY_PERCENTAGE}%` }}
                ></div>
            </div>
          </div>
        </div>

        {/* 上传费用显示和授权按钮 */}
        {(uploadFee > 0n || isLoadingUploadFee) && (
          <div className="mt-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
            <p className="text-lg font-bold text-blue-800 flex items-center">
              <span className="mr-2">💰</span> 上传费用:
              <span className="ml-2 text-blue-900">
                {isLoadingUploadFee ? '加载中...' : `${formatUnits(uploadFee, 18)} ${UPLOAD_FEE_TOKEN_SYMBOL}`}
              </span>
            </p>
            {!isApproved ? (
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving || !isConnected || uploadFee === 0n || isLoadingUploadFee || isLoadingAllowance || isApprovePending || !approveSimulateData?.request}
                className="w-full mt-4 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {approving || isApprovePending ? `正在授权...` : `授权 ${formatUnits(uploadFee, 18)} ${UPLOAD_FEE_TOKEN_SYMBOL}`}
              </button>
            ) : (
              <p className="mt-2 text-green-700 font-semibold">✅ {UPLOAD_FEE_TOKEN_SYMBOL} 已授权，可以创建电子书。</p>
            )}
          </div>
        )}



        <button
          type="submit"
          disabled={loading || approving || !isApproved || uploadFee === 0n || isLoadingUploadFee || isDefineEbookPending || !isFormValid}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading || isDefineEbookPending ? '处理中...' : '创建电子书'}
        </button>
      </form>
      {message && (
        <p className="mt-4 text-center text-sm font-medium text-gray-600">{message}</p>
      )}
    </div>
  );
};

export default CreateEbookForm;
