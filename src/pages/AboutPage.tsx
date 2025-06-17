import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Shield, Coins, Users, Github, ArrowRight } from 'lucide-react';

const AboutPage: React.FC = () => {

  const features = [
    {
      icon: <BookOpen className="h-8 w-8 text-blue-500" />,
      title: "电子书NFT化",
      description: "将电子书铸造为ERC-721 NFT，确保版权唯一性和所有权证明"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-500" />,
      title: "版权保护",
      description: "基于区块链的不可篡改记录，为创作者提供强有力的版权保护"
    },
    {
      icon: <Coins className="h-8 w-8 text-yellow-500" />,
      title: "透明分成",
      description: "智能合约自动执行收益分配，作者、分销者和平台分成透明公开"
    },
    {
      icon: <Users className="h-8 w-8 text-purple-500" />,
      title: "激励分销",
      description: "推荐分成机制激励用户推广，构建去中心化的内容分发网络"
    }
  ];

  const techStack = [
    "React 19", "TypeScript", "Solidity", "Hardhat", "Wagmi", "Ethers.js", 
    "IPFS", "BSC测试网", "OpenZeppelin", "Tailwind CSS"
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Simplified Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-3">
          {/* Header content can be added here if needed */}
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge className="mb-4 text-xs px-3 py-1 bg-gray-800 text-gray-400 border-0 rounded-md">
            Web3 × 知识产权保护
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-100">
          SourceMind
          </h1>
          <p className="text-base text-gray-400 mb-8 max-w-2xl mx-auto">
            基于区块链技术的电子书知识产权保护与激励分销平台
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => window.location.href = '/home'}
              className="px-6 py-2 bg-gray-800 text-gray-200 hover:bg-gray-700 rounded-lg border border-gray-700"
            >
              进入平台
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="px-6 py-2 border-gray-700 text-gray-400 hover:bg-gray-800 rounded-lg"
              onClick={() => window.open('https://github.com', '_blank')}
            >
              <Github className="mr-2 h-4 w-4" />
              查看源码
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-8 px-4 bg-gray-800/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-gray-200">解决的核心问题</h2>
            <p className="text-sm text-gray-400">传统电子书行业面临的挑战与我们的解决方案</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-gray-800 border border-gray-700 rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-400 text-base font-medium">传统问题</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">版权保护困难，盗版猖獗</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">中心化平台抽成过高</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">分销渠道有限</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border border-gray-700 rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-400 text-base font-medium">我们的解决方案</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">区块链NFT确保版权唯一性</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">去中心化平台，更多收益</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-gray-300 text-sm">激励分销机制</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-gray-200">核心功能特性</h2>
            <p className="text-sm text-gray-400">基于Web3技术构建的完整电子书生态系统</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="text-center bg-gray-800 border border-gray-700 rounded-lg">
                <CardContent className="p-4">
                  <div className="flex justify-center mb-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      {React.cloneElement(feature.icon, { className: "h-5 w-5 text-gray-400" })}
                    </div>
                  </div>
                  <h3 className="text-base font-medium mb-2 text-gray-200">{feature.title}</h3>
                  <p className="text-gray-400 text-xs">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Model */}
      <section className="py-8 px-4 bg-gray-800/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-gray-200">收益分配模式</h2>
            <p className="text-sm text-gray-400">透明公平的智能合约分成机制</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="text-center bg-gray-800 border border-gray-700 rounded-lg">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-400 mb-2">FREE</div>
                <h3 className="text-base font-medium mb-2 text-gray-200">作者分成</h3>
                <p className="text-gray-400 text-xs">创作者获得大部分收益</p>
              </CardContent>
            </Card>
            <Card className="text-center bg-gray-800 border border-gray-700 rounded-lg">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-400 mb-2">FREE</div>
                <h3 className="text-base font-medium mb-2 text-gray-200">分销分成</h3>
                <p className="text-gray-400 text-xs">推荐者获得分成</p>
              </CardContent>
            </Card>
            <Card className="text-center bg-gray-800 border border-gray-700 rounded-lg">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-400 mb-2">15%</div>
                <h3 className="text-base font-medium mb-2 text-gray-200">平台分成</h3>
                <p className="text-gray-400 text-xs">维持平台运营</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 text-gray-200">技术栈</h2>
            <p className="text-sm text-gray-400">基于最新Web3技术构建的去中心化平台</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {techStack.map((tech, index) => (
              <Card key={index} className="text-center bg-gray-800 border border-gray-700 rounded-lg">
                <CardContent className="p-3">
                  <h3 className="text-sm font-medium text-gray-200">{tech}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 px-4 bg-gray-800/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-xl font-bold mb-3 text-gray-200">开始您的Web3阅读之旅</h2>
          <p className="text-sm text-gray-400 mb-6">加入我们的去中心化电子书平台</p>
          <div className="flex gap-3 justify-center">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
              立即开始
            </Button>
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800 px-4 py-2 rounded-lg text-sm">
              了解更多
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;