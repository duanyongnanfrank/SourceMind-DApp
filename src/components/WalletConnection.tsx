import React, { useState } from 'react';
import { Wallet, Loader2, LogOut, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface WalletInfo {
  address: string;
  balance: number;
  connected: boolean;
}

const WalletConnection: React.FC<{
  wallet: WalletInfo;
  onConnect: () => void;
  onDisconnect: () => void;
}> = ({ wallet, onConnect, onDisconnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    onConnect();
    setIsConnecting(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
  };

  if (!wallet.connected) {
    return (
      <Button 
        onClick={handleConnect} 
        disabled={isConnecting}
        className="flex items-center gap-2"
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {wallet.balance.toFixed(2)} BUSD
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDisconnect}
            className="h-8 w-8 p-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WalletConnection;