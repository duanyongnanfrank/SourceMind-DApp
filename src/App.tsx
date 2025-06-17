// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig as config } from './wagmi.config';
import './App.css';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CreateEbookPage from './pages/CreateEbookPage';
import BookDetailPage from './pages/BookDetailPage';
import EbookReader from './components/EbookReader';
import LibraryPage from './pages/LibraryPage';
import DashboardPage from './pages/DashboardPage'; // 确保这个组件存在
import AboutPage from './pages/AboutPage';


function AppContent() {
  const location = useLocation();
  const isAboutPage = location.pathname === '/about';

  return (
    <div className="min-h-screen w-full overflow-hidden">
      {!isAboutPage && <Header />}
      <main className={isAboutPage ? 'w-full' : 'container mx-auto px-4 py-8 w-full'}>
        <Routes>
           <Route path="/" element={<HomePage />} />
           <Route path="/about" element={<AboutPage />} />
           <Route path="/home" element={<HomePage />} />
           {/* 重新启用所有具体页面的路由 */}
           <Route path="/create-ebook" element={<CreateEbookPage />} />
           <Route path="/book/:ebookId" element={<BookDetailPage />} />
           <Route path="/read/:tokenId" element={<EbookReader />} />
           <Route path="/library" element={<LibraryPage />} />
           <Route path="/dashboard" element={<DashboardPage />} />
         </Routes>
      </main>
    </div>
  );
}

function App() {
  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppContent />
        </Router>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
