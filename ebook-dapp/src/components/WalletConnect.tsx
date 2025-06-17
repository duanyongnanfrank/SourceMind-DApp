import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { WalletCards, Loader2, CheckCircle, AlertTriangle, Unplug, Power, Copy, Check } from 'lucide-react';
import '../styles/wallet-connect.css'; // 确保创建这个CSS文件

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

// 确保 declare global 块只存在于一个文件（例如 src/types/global.d.ts）
// 如果这个文件不是唯一的声明，请将其移动到唯一的类型声明文件中
// 否则，保持在这里。
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return "";
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};

const CopyableAddress = ({ className, address }: { className?: string; address: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const truncateAddress = (addr: string) => {
    if (addr.length > 13) {
      return `${addr.slice(0, 5)}...${addr.slice(-5)}`;
    }
    return addr;
  };

  const copyAddress = (addr: string) => {
    // navigator.clipboard.writeText(addr); // navigator.clipboard 可能会在某些iframe环境中受限
    // 兼容性更强的方式 (适用于一些旧浏览器或特定环境)
    const el = document.createElement('textarea');
    el.value = addr;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy'); // 使用 document.execCommand
    document.body.removeChild(el);

    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={`${className} flex items-center space-x-1 font-mono cursor-pointer transition-colors duration-200 ease-in-out ${isCopied ? "text-green-400" : "hover:text-blue-400 hover:underline"}`}
      onClick={() => copyAddress(address)}
    >
      <div>{truncateAddress(address)}</div>
      <div className="transition-transform duration-200 ease-in-out">
        {isCopied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </div>
    </div>
  );
};

function WalletConnect() {
  const { isConnected, address } = useAccount();
  const { connectors, connect, status: wagmiStatus, error: wagmiError } = useConnect();
  const { disconnect } = useDisconnect();

  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "error" | "no_provider">(
    "disconnected"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showConnectorsList, setShowConnectorsList] = useState(false); // 新增状态
  const [activeConnector, setActiveConnector] = useState<string | null>(null);
  
  // 钱包图标映射
  const walletIcons: Record<string, string> = {
    'MetaMask': '/icons/metamask.svg',
    'WalletConnect': '/icons/walletconnect.svg',
    'Coinbase Wallet': '/icons/coinbase.svg',
    'Injected': '/icons/injected.svg'
  };
  
  // 获取钱包图标
  const getWalletIcon = (walletName: string) => {
    return walletIcons[walletName] || '/icons/injected.svg';
  };

  const clearState = () => {
    setErrorMessage(null);
    setStatus(typeof window !== 'undefined' && window.ethereum ? "disconnected" : "no_provider");
  };

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      console.log("User disconnected or locked wallet.");
      clearState();
    } else if (accounts[0] !== address) {
      console.log("Account changed to:", accounts[0]);
      setStatus("connected");
    }
  }, [address]);

  const handleChainChanged = useCallback((chainId: string) => {
    console.log("Network changed to:", chainId);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.ethereum === "undefined") {
      setStatus("no_provider");
      setErrorMessage("No Ethereum provider found. Please install MetaMask or a similar wallet.");
      return;
    }

    const ethereum = window.ethereum;

    const checkInitialConnection = async () => {
      try {
        const accounts = await ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          setStatus("connected");
        } else {
          setStatus("disconnected");
        }
      } catch (error) {
        console.error("Error checking initial connection:", error);
        setStatus("disconnected");
      }
    };

    checkInitialConnection();

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [handleAccountsChanged, handleChainChanged]);

  useEffect(() => {
    if (wagmiStatus === 'pending') {
      setStatus('connecting');
    } else if (isConnected) {
      setStatus('connected');
    } else if (wagmiError) {
      setStatus('error');
      setErrorMessage(wagmiError.message);
    } else {
      setStatus('disconnected');
    }
  }, [wagmiStatus, isConnected, wagmiError]);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === "undefined") {
      setStatus("no_provider");
      setErrorMessage("No Ethereum provider found. Please install MetaMask.");
      return;
    }

    if (status === "connecting") return;
    setStatus("connecting");
    setErrorMessage(null);

    try {
      await connect({ connector: connectors[0] });
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      if (error.code === 4001) {
        setErrorMessage("Connection request rejected by user.");
      } else {
        setErrorMessage(error.message || "Failed to connect wallet.");
      }
      setStatus("error");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    console.log("Attempting to disconnect wallet.");
    clearState();
    console.log("Wallet disconnected from UI.");
  };

  const getButtonContent = () => {
    switch (status) {
      case "no_provider":
        return (
          <>
            <div className="wallet-icon-container">
              <Unplug size={18} className="mr-2 text-yellow-600" />
            </div>
            <span className="font-medium">No Wallet Provider</span>
          </>
        );
      case "connecting":
        return (
          <>
            <div className="wallet-icon-container">
              <Loader2 size={18} className="animate-spin mr-2 text-blue-500" />
            </div>
            <span className="font-medium">Connecting...</span>
          </>
        );
      case "connected":
        return (
          <>
            <div className="flex items-center">
              <div className="connection-status status-connected"></div>
              <CheckCircle size={18} className="mr-2 text-green-600" />
            </div>
            <span className="font-medium">{address ? shortenAddress(address) : "Connected"}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleDisconnect();
              }}
              className="ml-auto p-1 rounded-full cursor-pointer hover:bg-red-100 hover:text-red-600 transition-all duration-200"
              aria-label="Disconnect wallet"
              role="button"
              tabIndex={0}
            >
              <Power size={16} />
            </span>
          </>
        );
      case "error":
        return (
          <>
            <div className="flex items-center">
              <div className="connection-status status-error"></div>
              <AlertTriangle size={18} className="mr-2 text-red-600" />
            </div>
            <span className="font-medium">{errorMessage?.includes("rejected") ? "Connection Rejected" : "Connection Error"}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                connectWallet();
              }}
              className="ml-auto p-1 text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer transition-colors duration-200"
              aria-label="Retry connection"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  connectWallet();
                }
              }}
            >
              Retry
            </span>
          </>
        );
      case "disconnected":
      default:
        return (
          <>
            <div className="wallet-icon-container">
              <WalletCards size={18} className="mr-2 text-blue-600 wallet-icon transition-transform duration-200" />
            </div>
            <span className="font-medium">连接钱包</span>
            <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">+</span>
          </>
        );
    }
  };

  const getButtonClasses = () => {
    let baseClasses = "w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 shadow-md hover:shadow-lg";
    
    switch (status) {
      case "no_provider":
        return `${baseClasses} bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300 cursor-not-allowed`;
      case "connecting":
        return `${baseClasses} bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 cursor-not-allowed`;
      case "connected":
        return `${baseClasses} bg-gradient-to-r from-green-100 to-green-300 text-green-800 border-green-300 hover:from-green-200 hover:to-green-400 focus:ring-green-400`;
      case "error":
        return `${baseClasses} bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 hover:from-red-200 hover:to-red-300 focus:ring-red-400`;
      case "disconnected":
      default:
        return `${baseClasses} bg-gradient-to-r from-blue-100 to-blue-300 text-blue-800 border-blue-300 hover:from-blue-200 hover:to-blue-400 focus:ring-blue-400 cursor-pointer transform hover:scale-105`;
    }
  };

  // 在这里添加日志，打印 getButtonContent() 返回的 JSX
  console.log("WalletConnect status:", status);
  console.log("Button content from getButtonContent():", getButtonContent());

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (status === "disconnected") {
            setShowConnectorsList(true);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`${getButtonClasses()} artistic-bg`}
        disabled={status === "connecting" || status === "no_provider"}
        aria-live="polite"
      >
        {getButtonContent()}
      </button>

      {showConnectorsList && status === "disconnected" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn wallet-modal" 
             onClick={() => setShowConnectorsList(false)}>
          <div 
            className="relative bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-2xl p-8 max-w-sm mx-4 border border-gray-100 animate-scaleIn artistic-bg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowConnectorsList(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-gray-900 text-xl font-semibold mb-6 text-center">选择钱包</h3>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    setActiveConnector(connector.name);
                    connect({ connector });
                    setShowConnectorsList(false);
                  }}
                  onMouseEnter={() => setActiveConnector(connector.name)}
                  onMouseLeave={() => setActiveConnector(null)}
                  type="button"
                  className={`wallet-list-item w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-blue-50 border ${activeConnector === connector.name ? 'border-blue-300 bg-blue-50' : 'border-gray-200'} rounded-lg transition-all duration-200 flex items-center justify-between shadow-sm hover:shadow`}
                >
                  <div className="flex items-center">
                    <img 
                      src={getWalletIcon(connector.name)} 
                      alt={connector.name} 
                      className="w-6 h-6 mr-3" 
                    />
                    <span>{connector.name}</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${activeConnector === connector.name ? 'text-blue-500 translate-x-1' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WalletConnect;
