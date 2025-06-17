import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import EbookNFT from '../abi/EbookNFT.json';
import { uploadToPinata } from '../utils/uploadToPinata';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const MintButton = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [metadata, setMetadata] = useState({
    title: '',
    author: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const contractAddress = import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS;
  
  // 检查钱包连接状态
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          setAccount(accounts[0].address);
        }
      }
    };
    
    checkWalletConnection();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('请安装MetaMask钱包');
      return;
    }
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    } catch (error) {
      console.error('钱包连接失败:', error);
      alert('钱包连接失败，请重试');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // 检查文件类型
      if (selectedFile.type === 'application/pdf' ||
          selectedFile.name.endsWith('.epub')) {
        setFile(selectedFile);
        // 使用文件名作为默认标题
        setMetadata(prev => ({
          ...prev,
          title: selectedFile.name.replace(/\.[^/.]+$/, "")
        }));
      } else {
        alert('只支持 PDF 和 EPUB 格式');
      }
    }
  };


  const mintEbook = async () => {
    if (!account) {
      alert('请先连接钱包');
      return;
    }
    
    if (!file) {
      alert('请选择电子书文件');
      return;
    }
    
    if (!window.ethereum) {
      alert('请安装MetaMask钱包');
      return;
    }
    
    try {
      setLoading(true);
      setStatusText('准备上传...');
      
      // 1. 上传文件到IPFS并生成元数据URI
      setStatusText('上传文件到IPFS...');
      
      let metadataUri = '';
      const jwt = import.meta.env.VITE_PINATA_JWT;
      if (!jwt) {
        throw new Error('Pinata JWT not configured');
      }
      
      if (!file) {
        alert('请选择文件');
        return;
      }
      
      try {
        setUploading(true);
        setUploadProgress(0);
        
        // 上传文件到Pinata
        const fileCid = await uploadToPinata(file, jwt, (progress) => {
          if (progress.total) {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percentage);
          }
        });
        
        // 生成元数据
        const metadataJSON = {
          name: metadata.title,
          author: metadata.author,
          description: "电子书NFT",
          file: fileCid,
          attributes: [
            {
              trait_type: "文件类型",
              value: file.type ? file.type :
                file.name.endsWith('.epub') ? 'application/epub+zip' : 'application/pdf'
            },
            { trait_type: "文件大小", value: `${(file.size / 1024).toFixed(2)} KB` }
          ]
        };
        
        // 上传元数据到Pinata
        const metadataBlob = new Blob([JSON.stringify(metadataJSON)], { type: 'application/json' });
        // 将Blob转换为File对象
        const metadataFile = new File([metadataBlob], 'metadata.json', {
          type: 'application/json'
        });
        const metadataCid = await uploadToPinata(metadataFile, jwt);
        
        metadataUri = `ipfs://${metadataCid}`;
      } catch (error) {
        console.error('IPFS上传失败:', error);
        let errorMessage = '未知错误';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        alert(`文件上传失败: ${errorMessage}`);
        return;
      } finally {
        setUploading(false);
      }
      
      if (!metadataUri) {
        alert('上传失败，无法获取元数据URI');
        return;
      }
      
      // 2. 使用 ethers 与合约交互
      setStatusText('铸造NFT...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, EbookNFT, signer);
      
      // 3. 调用 mintEbook 方法
      setStatusText('等待交易确认...');
      const tx = await contract.mintEbook(account, metadataUri);
      await tx.wait();
      
      setStatusText('铸造成功！');
      alert('电子书 NFT 铸造成功！');
      
      // 重置状态
      setFile(null);
      setMetadata({ title: '', author: '' });
      setUploadProgress(0);
      setStatusText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Mint 失败:', error);
      
      let errorMessage = '未知错误';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setStatusText(`错误: ${errorMessage}`);
      alert(`铸造失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mint-section">
      <h3>铸造新电子书</h3>
      {!account ? (
        <button onClick={connectWallet}>连接钱包</button>
      ) : (
        <div className="mint-form">
          <p>已连接钱包: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
          
          <div className="file-upload">
            <label>
              选择电子书 (PDF/EPUB):
              <input
                type="file"
                accept=".pdf,.epub"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={uploading || loading}
              />
            </label>
            {file && (
              <div>
                <p>文件名: {file.name}</p>
                <p>文件类型: {file.type}</p>
              </div>
            )}
          </div>
          
          {file && (
            <div className="metadata-form">
              <label>
                书名:
                <input
                  type="text"
                  value={metadata.title}
                  onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                  disabled={uploading || loading}
                />
              </label>
              <label>
                作者:
                <input
                  type="text"
                  value={metadata.author}
                  onChange={(e) => setMetadata({...metadata, author: e.target.value})}
                  disabled={uploading || loading}
                />
              </label>
            </div>
          )}
          
          {uploading && (
            <div className="upload-progress">
              <p>上传进度: {uploadProgress.toFixed(0)}%</p>
              <progress value={uploadProgress} max="100" />
            </div>
          )}
          
          {statusText && <div className="status-text">{statusText}</div>}
          
          <button
            onClick={mintEbook}
            disabled={loading || uploading || !file}
            className="mint-button"
          >
            {loading ? '铸造中...' : uploading ? '上传中...' : '铸造电子书'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MintButton;
