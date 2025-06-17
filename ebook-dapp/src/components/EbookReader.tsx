import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAccount, useContractRead } from 'wagmi';
import { Document, Page, pdfjs } from 'react-pdf';
import { ReactReader } from "react-reader"; // Corrected package name
import { ethers } from 'ethers';
import EbookNFT from '../abi/EbookNFT.json';

// 配置 pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.js', import.meta.url).toString();

const EbookReader: React.FC = () => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const { address, isConnected } = useAccount();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasValidAccess, setHasValidAccess] = useState(false);
  const [isDualPageMode, setIsDualPageMode] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [pdfScale, setPdfScale] = useState(1); // 新增：PDF 缩放比例状态
  const [inputPageNumber, setInputPageNumber] = useState<string>('1'); // 新增：用于页码输入框的状态

  // 检查用户是否持有该NFT
  const { data: ownerOfData, isError: isOwnerOfError, isLoading: isOwnerOfLoading } = useContractRead({
    address: import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS as `0x${string}`,
    abi: EbookNFT.abi as any,
    functionName: 'ownerOf',
    args: [tokenId ? BigInt(tokenId) : undefined],
    enabled: isConnected && !!tokenId,
  });

  const isOwner = ownerOfData?.toLowerCase() === address?.toLowerCase();

  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      // 在大屏幕上自动启用双页模式
      setIsDualPageMode(width >= 1024);
    };

    handleResize(); // 初始化
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!tokenId) {
        setError('未提供电子书ID。');
        setLoading(false);
        return;
      }

      if (!isConnected || !address) {
        setError('请连接钱包以查看您的电子书。');
        setLoading(false);
        return;
      }

      if (isOwnerOfLoading) {
        // Still loading ownerOf data, wait for it
        return;
      }

      if (isOwnerOfError || !isOwner) {
        setError('您不拥有此电子书。');
        setLoading(false);
        return;
      }

      // 设置访问权限为有效
      setHasValidAccess(true);

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          import.meta.env.VITE_APP_EBOOK_NFT_CONTRACT_ADDRESS,
          EbookNFT.abi,
          signer
        );

        const metadataUri = await contract.tokenURI(tokenId);
        const ipfsHash = metadataUri.replace('ipfs://', '');
        const metadataUrl = `${import.meta.env.VITE_IPFS_GATEWAY}/ipfs/${ipfsHash}`;

        const response = await fetch(metadataUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const metadata = await response.json();

        const fileIpfsHash = metadata.file.replace('ipfs://', '');
        const fullFileUrl = `${import.meta.env.VITE_IPFS_GATEWAY}/ipfs/${fileIpfsHash}`;

        console.log('IPFS文件URL:', fullFileUrl);
        console.log('文件类型:', metadata.attributes?.find((attr: any) => attr.trait_type === "文件类型")?.value);
        console.log('完整元数据:', metadata);
        
        setFileUrl(fullFileUrl);
        setFileType(metadata.attributes?.find((attr: any) => attr.trait_type === "文件类型")?.value || null);
      } catch (err) {
        console.error('获取电子书元数据失败:', err);
        setError(`无法加载电子书: ${err instanceof Error ? err.message : '未知错误'}`);
        setHasValidAccess(false);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [tokenId, address, isConnected, isOwner, isOwnerOfLoading, isOwnerOfError]);



  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF加载成功，总页数:', numPages);
    console.log('当前文件URL:', fileUrl);
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    const step = isDualPageMode ? 2 : 1;
    setPageNumber(prevPageNumber => Math.max(1, Math.min(prevPageNumber + (offset * step), numPages || 1)));
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  // 缩放功能
  const zoomIn = () => setPdfScale(prevScale => prevScale + 0.1);
  const zoomOut = () => setPdfScale(prevScale => Math.max(0.1, prevScale - 0.1));
  const resetZoom = () => setPdfScale(1);

  // 处理页码输入和跳转
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPageNumber(e.target.value);
  };

  const goToPage = () => {
    const page = parseInt(inputPageNumber, 10);
    if (!isNaN(page) && page >= 1 && page <= (numPages || 1)) {
      setPageNumber(page);
    } else {
      // 如果输入无效，重置输入框为当前页码
      setInputPageNumber(pageNumber.toString());
    }
  };

  // 监听 pageNumber 变化，同步更新 inputPageNumber
  useEffect(() => {
    setInputPageNumber(pageNumber.toString());
  }, [pageNumber]);

  // 切换双页模式
  const toggleDualPageMode = () => {
    setIsDualPageMode(!isDualPageMode);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl text-gray-200">加载中...</p></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl text-red-500">错误: {error}</p></div>;
  }

  if (!fileUrl || !fileType || !hasValidAccess) {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl text-gray-200">无法加载电子书内容或访问权限不足。</p></div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {(fileType === 'pdf' || fileType === 'application/pdf') ? (
        <div className="flex flex-col h-screen">
          {/* 顶部工具栏 */}
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">PDF阅读器</h2>
            <div className="flex items-center space-x-2">
              <button onClick={zoomOut} className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition duration-200">缩小</button>
              <button onClick={resetZoom} className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition duration-200">重置</button>
              <button onClick={zoomIn} className="px-3 py-1 text-sm font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition duration-200">放大</button>
              <span className="text-sm text-gray-600">{Math.round(pdfScale * 100)}%</span>
            </div>
            {/* 页码跳转 */} 
            {numPages && (
              <div className="flex items-center space-x-2">
                <input 
                  type="number" 
                  value={inputPageNumber} 
                  onChange={handlePageInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && goToPage()}
                  className="w-16 px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max={numPages}
                />
                <span className="text-sm text-gray-600">/ {numPages}</span>
                <button onClick={goToPage} className="px-3 py-1 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition duration-200">跳转</button>
              </div>
            )}
            <button
              onClick={toggleDualPageMode}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition duration-200 ${
                isDualPageMode 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isDualPageMode ? '单页模式' : '双页模式'}
            </button>
          </div>
          
          {/* PDF内容区域 */}
          <div className="flex-1 overflow-auto relative" style={{height: 'calc(100vh - 140px)'}}> {/* 添加 relative 定位 */}
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('PDF加载错误:', error);
                setError(`PDF加载失败: ${error.message}`);
              }}
              loading={null}
              error={null}
            >
              {/* 固定翻页按钮 */}
              {numPages && numPages > 1 && (
                <>
                  <button 
                    onClick={previousPage} 
                    disabled={pageNumber <= 1}
                    className="fixed left-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 disabled:opacity-50 transition-opacity duration-200"
                    aria-label="上一页"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button 
                    onClick={nextPage} 
                    disabled={pageNumber >= (numPages || 1) || (isDualPageMode && pageNumber +1 >= (numPages || 1))}
                    className="fixed right-4 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 disabled:opacity-50 transition-opacity duration-200"
                    aria-label="下一页"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </>
              )}
              {isDualPageMode ? (
                <div className="flex justify-center items-start gap-4 p-4">
                  {/* 左页 */}
                  <div className="flex-shrink-0">
                    <Page 
                      pageNumber={pageNumber}
                      width={Math.min(screenWidth * 0.35, 500)}
                      scale={pdfScale} // 应用缩放
                      loading={null}
                      error={null}
                    />
                  </div>
                  {/* 右页 */}
                  {pageNumber < (numPages || 1) && (
                    <div className="flex-shrink-0">
                      <Page 
                        pageNumber={pageNumber + 1}
                      width={Math.min(screenWidth * 0.35, 500)}
                      scale={pdfScale} // 应用缩放
                      loading={null}
                      error={null}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center p-4">
                  <Page 
                    pageNumber={pageNumber}
                    width={Math.min(screenWidth * 0.8, 800)} 
                    scale={pdfScale} // 应用缩放
                    loading={null}
                    error={null}
                  />
                </div>
              )}
            </Document>
          </div>
          
          {/* 翻页控制栏 - 固定在底部 */}
          <div className="bg-white border-t border-gray-300 shadow-lg px-6 py-4 flex justify-center items-center space-x-6 sticky bottom-0">
            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition duration-200 shadow-md"
            >
              ← {isDualPageMode ? '上两页' : '上一页'}
            </button>
            <span className="text-base font-semibold text-gray-800 px-4 py-2 bg-gray-100 rounded-lg border border-gray-200 min-w-[120px] text-center">
              {isDualPageMode ? (
                `${pageNumber}${pageNumber < (numPages || 1) ? `-${Math.min(pageNumber + 1, numPages || 1)}` : ''} / ${numPages || '?'}`
              ) : (
                `${pageNumber} / ${numPages || '?'}`
              )}
            </span>
            <button
              onClick={nextPage}
              disabled={isDualPageMode ? pageNumber >= (numPages || 1) : pageNumber >= (numPages || 1)}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition duration-200 shadow-md"
            >
              {isDualPageMode ? '下两页' : '下一页'} →
            </button>
          </div>
        </div>
      ) : (fileType === 'epub' || fileType === 'application/epub+zip') ? (
        <div className="h-screen w-full">
          <ReactReader
            url={fileUrl}
            locationChanged={(epubcifi: string) => console.log(epubcifi)}
            getRendition={(rendition: any) => {
              rendition.themes.default({
                body: {
                  'font-family': '"Inter", sans-serif !important',
                  'line-height': '1.6 !important',
                  'color': '#333 !important',
                  'background-color': '#ffffff !important',
                  'margin': '0 !important',
                  'padding': '10px !important',
                },
                p: {
                  'font-size': '1.1em !important',
                  'margin-bottom': '1em !important',
                },
                h1: {
                  'font-size': '2em !important',
                  'margin-top': '1.5em !important',
                  'margin-bottom': '0.8em !important',
                },
                a: {
                  'color': '#2563eb !important',
                  'text-decoration': 'none !important',
                },
              });
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex justify-center items-center">
          <div className="text-center text-red-500 text-xl font-semibold">不支持的文件类型: {fileType}</div>
        </div>
      )}
    </div>
  );
};

export default EbookReader;
