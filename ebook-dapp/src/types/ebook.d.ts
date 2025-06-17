interface EBook {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  price: number;
  coverImage: string;
  rating: number;
  reviews: number;

  fileType: 'PDF' | 'EPUB';
  fileUrl?: string;
  createdAt: string;
  authorAddress: string;
  metadataUrl?: string;  // IPFS元数据URL
  authorRoyalty?: number;  // 作者分成比例
  distributorRoyalty?: number;  // 分销者分成比例
  platformRoyalty?: number;  // 平台分成比例
}

export type { EBook };