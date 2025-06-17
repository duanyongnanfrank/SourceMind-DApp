import { useContractRead } from 'wagmi';
import contractABI from '../abi/EbookNFT.json';

const contractAddress = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS;

export default function ContractReader() {
  // 使用正确的泛型参数
  const { data: name } = useContractRead({
    address: contractAddress,
    abi: contractABI,
    functionName: 'name',
  });

  const { data: symbol } = useContractRead({
    address: contractAddress,
    abi: contractABI,
    functionName: 'symbol',
  });

  return (
    <div>
      <h2>合约信息</h2>
      <div>合约地址: {contractAddress}</div>
      <div>名称: {String(name) || '加载中...'}</div>
      <div>符号: {String(symbol) || '加载中...'}</div>
    </div>
  );
}