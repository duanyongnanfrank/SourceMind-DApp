import { useContractRead } from 'wagmi';
import abi from '../abi/EbookNFT.json';

const contractAddress = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS;

function safeToString(val: unknown) {
  if (typeof val === 'string' || typeof val === 'number') return val.toString();
  if (typeof val === 'bigint') return val.toString();
  if (val && typeof val === 'object' && 'toString' in val) return (val as any).toString();
  return '';
}

export default function NFTInfo() {
  const { data: name } = useContractRead({ address: contractAddress, abi, functionName: 'name' });
  const { data: symbol } = useContractRead({ address: contractAddress, abi, functionName: 'symbol' });
  const { data: owner } = useContractRead({ address: contractAddress, abi, functionName: 'owner' });
  const { data: totalSupply } = useContractRead({ address: contractAddress, abi, functionName: 'totalSupply' });

  return (
    <div>
      <div>合约名称: {safeToString(name)}</div>
      <div>合约符号: {safeToString(symbol)}</div>
      <div>合约拥有者: {safeToString(owner)}</div>
      <div>总发行量: {safeToString(totalSupply)}</div>
    </div>
  );
} 