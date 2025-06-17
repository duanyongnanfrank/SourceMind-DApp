import React from 'react';
import { Link } from 'react-router-dom';
import WalletConnect from './WalletConnect'; // 假设存在此组件用于钱包连接

const Header: React.FC = () => {
  return (
    <header className="bg-black text-white shadow-lg p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center">
        <Link to="/" className="text-3xl font-extrabold tracking-tight hover:text-gray-100 transition duration-300 ease-in-out">
          SourceMind
        </Link>
      </div>
      <nav className="hidden md:block">
        <ul className="flex space-x-6">
          <li><Link to="/" className="text-lg font-medium hover:text-gray-400 transition duration-300 ease-in-out">首页</Link></li>
          <li><Link to="/library" className="text-lg font-medium hover:text-gray-400 transition duration-300 ease-in-out">我的文库</Link></li>
          <li><Link to="/create-ebook" className="text-lg font-medium hover:text-gray-400 transition duration-300 ease-in-out">创作者中心</Link></li>
          <li><Link to="/dashboard" className="text-lg font-medium hover:text-gray-400 transition duration-300 ease-in-out">Dashboard</Link></li>
          <li><Link to="/about" className="text-lg font-medium hover:text-gray-400 transition duration-300 ease-in-out">关于我们</Link></li>
        </ul>
      </nav>
      <div className="flex items-center space-x-4">
        <WalletConnect />
      </div>
    </header>
  );
};

export default Header;