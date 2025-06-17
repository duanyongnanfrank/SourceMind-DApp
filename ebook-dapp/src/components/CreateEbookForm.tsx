import React, { useState, useEffect } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useAccount, useWalletClient, useReadContract, usePublicClient, useWriteContract, useSimulateContract } from 'wagmi';
import { uploadToIPFS } from '../utils/ipfs';
import { parseUnits, formatUnits, erc20Abi } from 'viem'; // ✨ UPDATED: Added erc20Abi import from viem
import EbookSalesDistributorArtifact from '../abi/EbookSalesDistributor.json';
// import GenericERC20Abi from '../abi/GenericERC20.json'; // ✨ REMOVED: No longer needed
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion, AnimatePresence } from 'framer-motion';
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

  // 字数限制常量
  const MAX_NAME_LENGTH = 50;
  const MAX_AUTHOR_LENGTH = 20;
  const MAX_DESCRIPTION_LENGTH = 500;

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [ebookFile, setEbookFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const navigate = useNavigate();
  const publicClient = usePublicClient();

  const PLATFORM_ROYALTY_PERCENTAGE = 15;
  const [authorRoyalty, setAuthorRoyalty] = useState(70);
  const [distributorRoyalty, setDistributorRoyalty] = useState(15);

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

  const salesDistributorContractAddress = import.meta.env.VITE_APP_SALES_CONTRACT_ADDRESS as `0x${string}`;
  const salesTokenAddress = (import.meta.env.VITE_APP_TBUSD_TOKEN_ADDRESS || "0xaB1a4d4f1D656d2450692D237fdD6C7f9146e814") as `0x${string}`;
  const SALES_TOKEN_SYMBOL = "tBUSD";

  const uploadFeeTokenAddress = (import.meta.env.VITE_APP_UPLOAD_FEE_TOKEN_ADDRESS || "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd") as `0x${string}`;
  const UPLOAD_FEE_TOKEN_SYMBOL = "WBNB";

  const salesDistributorAbi = getAbiForViem(EbookSalesDistributorArtifact);
  // ✨ UPDATED: Directly use viem's erc20Abi for all ERC20 interactions
  const genericERC20Abi = erc20Abi;

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
      select: (data) => data as unknown as bigint,
      refetchInterval: 5000,
    }
  });

  const { data: fetchedAllowance, isLoading: isLoadingAllowance } = useReadContract({
    address: uploadFeeTokenAddress,
    abi: genericERC20Abi, // This will now use erc20Abi
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
    if (uploadFee > 0n && allowance >= uploadFee) {
        console.log("Approve status: APPROVED. Allowance:", formatUnits(allowance, 18), "Upload Fee:", formatUnits(uploadFee, 18));
    } else if (uploadFee > 0n) {
        console.log("Approve status: NOT APPROVED. Allowance:", formatUnits(allowance, 18), "Upload Fee:", formatUnits(uploadFee, 18));
    }
  }, [allowance, uploadFee]);

  const handleAuthorRoyaltyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // 处理前导零的情况，如"05"应该被处理为"5"
    const value = inputValue === '' ? 0 : parseInt(inputValue, 10) || 0;
    if (value >= 0 && value <= 85) { // 最大85%，因为平台固定15%
      setAuthorRoyalty(value);
      // 自动计算分销者分成，确保作者和分销者分成总和为85%
      const newDistributorRoyalty = 85 - value;
      setDistributorRoyalty(newDistributorRoyalty);
    }
  };

  const handleDistributorRoyaltyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // 处理前导零的情况，如"05"应该被处理为"5"
    const value = inputValue === '' ? 0 : parseInt(inputValue, 10) || 0;
    if (value >= 0 && value <= 85) { // 最大85%，因为平台固定15%
      setDistributorRoyalty(value);
      // 自动计算作者分成，确保作者和分销者分成总和为85%
      const newAuthorRoyalty = 85 - value;
      setAuthorRoyalty(newAuthorRoyalty);
    }
  };

  const totalRoyalty = authorRoyalty + distributorRoyalty + PLATFORM_ROYALTY_PERCENTAGE;
  const isRoyaltyValid = totalRoyalty === 100;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'ebook') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'cover') {
        setCoverImage(file);
      } else if (type === 'ebook') {
        setEbookFile(file);
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
    abi: genericERC20Abi, // This will now use erc20Abi
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
    setMessage(`正在授权 ${formatUnits(uploadFee, 18)} ${UPLOAD_FEE_TOKEN_SYMBOL} 给合约...`);
    console.log(`正在授权 ${formatUnits(uploadFee, 18)} ${UPLOAD_FEE_TOKEN_SYMBOL} 给合约地址: ${salesDistributorContractAddress}`);

    try {
      writeApproveContract(approveSimulateData.request, {
        onSettled: (hash, error) => {
          if (hash) {
            setMessage('授权交易已发送，等待确认...');
            console.log('授权交易哈希:', hash);
          } else if (error) {
            console.error(`${UPLOAD_FEE_TOKEN_SYMBOL} 授权失败:`, error);
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
            console.error(`${UPLOAD_FEE_TOKEN_SYMBOL} 授权失败 (onError):`, error);
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
      });

    } catch (err: any) {
      console.error(`${UPLOAD_FEE_TOKEN_SYMBOL} 授权失败 (catch block):`, err);
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

    if (!isRoyaltyValid) {
      setMessage(`总分成比例必须为 100%，当前为 ${totalRoyalty}%。请调整创作者或分销商分成。`);
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


      // Check WBNB balance and allowance
      try {
          if (!publicClient) {
            setMessage('公共客户端未初始化');
            setLoading(false);
            return;
          }
          const wbnbBalance = await publicClient.readContract({
              address: uploadFeeTokenAddress,
              abi: genericERC20Abi, // This will now use erc20Abi
              functionName: 'balanceOf',
              args: [address!]
          });
          if (wbnbBalance < uploadFee) {
              setMessage(`WBNB 余额不足。需要 ${formatUnits(uploadFee, 18)} ${UPLOAD_FEE_TOKEN_SYMBOL}，当前余额 ${formatUnits(wbnbBalance, 18)} ${UPLOAD_FEE_TOKEN_SYMBOL}。`);
              setLoading(false);
              return;
          }
      } catch (err: any) {
          setMessage(`无法读取 WBNB 余额: ${err.shortMessage || err.message}`);
          setLoading(false);
          return;
      }

      try {
          if (!publicClient) {
            setMessage('公共客户端未初始化');
            setLoading(false);
            return;
          }
          const currentAllowance = await publicClient.readContract({
              address: uploadFeeTokenAddress,
              abi: genericERC20Abi, // This will now use erc20Abi
              functionName: 'allowance',
              args: [address!, salesDistributorContractAddress]
          });
          if (currentAllowance < uploadFee) {
              setMessage(`授权金额不足。需要授权 ${formatUnits(uploadFee, 18)} ${UPLOAD_FEE_TOKEN_SYMBOL}，当前授权 ${formatUnits(currentAllowance, 18)} ${UPLOAD_FEE_TOKEN_SYMBOL}。请重新授权。`);
              setLoading(false);
              return;
          }
      } catch (err: any) {
          setMessage(`无法读取授权金额: ${err.shortMessage || err.message}`);
          setLoading(false);
          return;
      }


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

      if (!salesDistributorAbi || salesDistributorAbi.length === 0) {
        throw new Error("销售分发合约 ABI 未正确加载。请检查 ABI 文件路径和内容。");
      }

      setMessage('正在定义电子书 (Define Ebook on-chain)...');

      const parsedPriceInWei = price ? parseUnits(price, 18) : 0n;
      const authorShareBPS = BigInt(authorRoyalty * 100);
      const referrerShareBPS = BigInt(distributorRoyalty * 100);

      const contractArgs = [
        metadataIpfsUri as `ipfs://${string}`,
        parsedPriceInWei,
        authorShareBPS,
        referrerShareBPS,
        uploadFee,
      ];



      setMessage("正在模拟交易...");
      let simulateResult;
      try {
        if (!publicClient) {
          setMessage('公共客户端未初始化');
          setLoading(false);
          return;
        }
        simulateResult = await publicClient.simulateContract({
          address: salesDistributorContractAddress,
          abi: salesDistributorAbi,
          functionName: 'defineEbookForSale',
          args: contractArgs,
          account: address,
          gas: 700000n,
        });
      } catch (simulateError: any) {
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
          } else if (error) {
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
            setShowSuccessAnimation(true);
            // 延迟导航，让动画播放完成
            setTimeout(() => {
              navigate('/');
            }, 5000);
        },
        onError: (error) => {
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
    !!coverImage &&
    !!ebookFile &&
    !!category && category.length > 0 &&
    uploadFee > 0n &&
    isRoyaltyValid;

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
        console.log("uploadFee > 0n:", (uploadFee > 0n).toString(), "(Upload Fee:", uploadFee.toString(), ")");
        console.log("isRoyaltyValid:", isRoyaltyValid.toString(), "(Total Royalty:", totalRoyalty, ")");
    }
    console.log("-----------------------------------------");
  }, [loading, approving, isApproved, uploadFee, isLoadingUploadFee, isDefineEbookPending, isFormValid, isConnected, name, author, description, price, coverImage, ebookFile, category, isRoyaltyValid, totalRoyalty]);


  return (
    <div className="container mx-auto p-6 bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-200">
            电子书名称
            <span className="text-xs text-gray-400 ml-2">({name.length}/{MAX_NAME_LENGTH})</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => {
              if (e.target.value.length <= MAX_NAME_LENGTH) {
                setName(e.target.value);
              }
            }}
            maxLength={MAX_NAME_LENGTH}
            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-100 placeholder-gray-400"
            placeholder="请输入电子书名称（最多70字符）"
            required
          />
          {name.length >= MAX_NAME_LENGTH * 0.9 && (
            <p className="text-xs text-yellow-400 mt-1">
              {name.length >= MAX_NAME_LENGTH ? '已达到最大字符数限制' : `还可输入 ${MAX_NAME_LENGTH - name.length} 个字符`}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-200">
            作者 (显示名称)
            <span className="text-xs text-gray-400 ml-2">({author.length}/{MAX_AUTHOR_LENGTH})</span>
          </label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={(e) => {
              if (e.target.value.length <= MAX_AUTHOR_LENGTH) {
                setAuthor(e.target.value);
              }
            }}
            maxLength={MAX_AUTHOR_LENGTH}
            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-100 placeholder-gray-400"
            placeholder="请输入作者名称（最多20字符）"
            required
          />
          {author.length >= MAX_AUTHOR_LENGTH * 0.9 && (
            <p className="text-xs text-yellow-400 mt-1">
              {author.length >= MAX_AUTHOR_LENGTH ? '已达到最大字符数限制' : `还可输入 ${MAX_AUTHOR_LENGTH - author.length} 个字符`}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-200">
            描述
            <span className="text-xs text-gray-400 ml-2">({description.length}/{MAX_DESCRIPTION_LENGTH})</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => {
              if (e.target.value.length <= MAX_DESCRIPTION_LENGTH) {
                setDescription(e.target.value);
              }
            }}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-100 placeholder-gray-400"
            placeholder="请输入电子书描述（最多500字符）"
            required
          ></textarea>
          {description.length >= MAX_DESCRIPTION_LENGTH * 0.9 && (
            <p className="text-xs text-yellow-400 mt-1">
              {description.length >= MAX_DESCRIPTION_LENGTH ? '已达到最大字符数限制' : `还可输入 ${MAX_DESCRIPTION_LENGTH - description.length} 个字符`}
            </p>
          )}
        </div>
        <div className="mb-4">
              <label htmlFor="price" className="block text-sm font-medium text-gray-200">电子书售价 ({SALES_TOKEN_SYMBOL})</label>
              <input
                type="text"
                id="price"
                value={price}
                onChange={handlePriceChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-100 placeholder-gray-400"
                placeholder="请输入销售价格"
                required
              />
            </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-200">分类</label>
          <div className="relative">
            <Select onValueChange={setCategory} value={category}>
              <SelectTrigger className="mt-1 block w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-100">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent className="z-[9999] absolute w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg top-full mt-1">
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-gray-100 bg-gray-700 hover:bg-gray-600">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label htmlFor="coverImage" className="block text-sm font-medium text-gray-200">封面图片 (JPG, PNG, GIF)</label>
          <input
            type="file"
            id="coverImage"
            accept="image/jpeg,image/png,image/gif"
            onChange={(e) => handleFileChange(e, 'cover')}
            className="mt-1 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-blue-100 hover:file:bg-blue-700"
            required
          />
        </div>
        <div>
          <label htmlFor="ebookFile" className="block text-sm font-medium text-gray-200">电子书文件 (PDF, EPUB)</label>
          <input
            type="file"
            id="ebookFile"
            accept="application/pdf,application/epub+zip"
            onChange={(e) => handleFileChange(e, 'ebook')}
            className="mt-1 block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-blue-100 hover:file:bg-blue-700"
            required
          />
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-100">版税分成设置</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="author-royalty" className="block text-sm font-medium text-gray-200 mb-2">
                创作者分成 (%)
              </label>
              <input
                type="number"
                id="author-royalty"
                min="0"
                max="100"
                value={authorRoyalty.toString()}
                onChange={handleAuthorRoyaltyChange}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-100 placeholder-gray-400"
                placeholder="输入创作者分成比例"
              />
            </div>
            
            <div>
              <label htmlFor="distributor-royalty" className="block text-sm font-medium text-gray-200 mb-2">
                分销者分成 (%)
              </label>
              <input
                type="number"
                id="distributor-royalty"
                min="0"
                max="100"
                value={distributorRoyalty.toString()}
                onChange={handleDistributorRoyaltyChange}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base text-gray-100 placeholder-gray-400"
                placeholder="输入分销者分成比例"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                平台分成 (固定)
              </label>
              <div className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-600 text-base text-gray-300">
                {PLATFORM_ROYALTY_PERCENTAGE}%
              </div>
            </div>
          </div>
          
          <div className={`p-3 rounded-md ${isRoyaltyValid ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
            <p className={`text-sm font-medium ${isRoyaltyValid ? 'text-green-300' : 'text-red-300'}`}>
              总分成比例: {totalRoyalty}% 
              {isRoyaltyValid ? '✅ 正确' : '❌ 必须等于100%'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              创作者分成 ({authorRoyalty}%) + 分销者分成 ({distributorRoyalty}%) + 平台分成 ({PLATFORM_ROYALTY_PERCENTAGE}%) = {totalRoyalty}%
            </p>
          </div>
        </div>

        {/* 上传费用显示和授权按钮 */}
        {(uploadFee > 0n || isLoadingUploadFee) && (
          <div className="mt-6 p-4 border border-blue-600 rounded-lg bg-blue-900/30">
            <p className="text-lg font-bold text-blue-300 flex items-center">
              <span className="mr-2">💰</span> 上传费用:
              <span className="ml-2 text-blue-200">
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
              <p className="mt-2 text-green-300 font-semibold">✅ {UPLOAD_FEE_TOKEN_SYMBOL} 已授权，可以创建电子书。</p>
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
        <p className="mt-4 text-center text-sm font-medium text-gray-300">{message}</p>
      )}
      
      {/* 书籍打开成功动画 */}
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50"
          >
            <div className="relative">
              {/* 书籍封面 */}
              <motion.div
                initial={{ rotateY: 0 }}
                animate={{ rotateY: -25 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeInOut" }}
                className="relative w-48 h-64 bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg shadow-2xl"
                style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
              >
                {/* 书籍封面内容 */}
                <div className="absolute inset-0 p-4 flex flex-col justify-between text-white" style={{ transform: "rotateY(0deg)" }}>
                  <div>
                    <div className="text-lg font-bold mb-2">📚</div>
                    <div className="text-sm font-semibold">电子书</div>
                  </div>
                  <div className="text-xs opacity-80">NFT</div>
                </div>
                
                {/* 书籍侧面 */}
                <div 
                  className="absolute top-0 left-0 w-4 h-64 bg-gradient-to-b from-blue-800 to-purple-900 rounded-l-lg"
                  style={{ transform: "rotateY(90deg) translateZ(-2px)" }}
                />
              </motion.div>
              
              {/* 书页效果 */}
              <motion.div
                initial={{ rotateY: 0, x: 0 }}
                animate={{ rotateY: -160, x: 20 }}
                transition={{ delay: 0.6, duration: 0.6, ease: "easeInOut" }}
                className="absolute top-0 left-0 w-48 h-64 bg-white rounded-lg shadow-lg"
                style={{ transformStyle: "preserve-3d", transformOrigin: "left center", zIndex: -1 }}
              >
                <div className="p-6 text-gray-800" style={{ transform: "rotateY(0deg)" }}>
                  <div className="text-center mb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.2, duration: 0.4 }}
                      className="text-4xl mb-2"
                    >
                      ✨
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4, duration: 0.4 }}
                      className="text-xl font-bold text-green-600"
                    >
                      创建成功！
                    </motion.h2>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6, duration: 0.4 }}
                    className="text-sm text-center text-gray-600"
                  >
                    您的电子书已成功
                    <br />
                    上架销售
                  </motion.div>
                </div>
              </motion.div>
              
              {/* 光效 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1.2 }}
                transition={{ delay: 1.0, duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                className="absolute -inset-4 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-full blur-xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
   );
 };

export default CreateEbookForm;
