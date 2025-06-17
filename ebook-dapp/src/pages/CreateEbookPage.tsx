import React from 'react';
import CreateEbookForm from '../components/CreateEbookForm';

function CreateEbookPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-3 text-gray-200">
              创建新电子书
            </h1>
            <p className="text-sm text-gray-400">
              将您的作品铸造为NFT，享受去中心化的版权保护与收益分配
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <CreateEbookForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateEbookPage;