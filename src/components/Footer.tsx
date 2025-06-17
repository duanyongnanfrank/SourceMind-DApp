import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 text-gray-200 p-6 text-center mt-12 shadow-inner">
      <div className="container mx-auto">
        <p className="text-lg font-light">&copy; {new Date().getFullYear()} Ebook DApp. All rights reserved.</p>
        <p className="text-sm mt-2">去中心化电子书平台</p>
      </div>
    </footer>
  );
};

export default Footer;