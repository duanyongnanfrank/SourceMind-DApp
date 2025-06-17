import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, Eye } from 'lucide-react';

interface EBook {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number;
  coverImage: string;
  fileType: string;
  category: string;
  rating: number;
  reviews: number;
  authorRoyalty?: number;
  distributorRoyalty?: number;
  platformRoyalty?: number;
}

const BookCard: React.FC<{
  book: EBook;
  viewMode: 'grid' | 'list';
  onPurchase: (book: EBook) => void;
  onView: (book: EBook) => void;
  owned?: boolean;
}> = ({ book, viewMode, onPurchase, onView, owned = false }) => {
  if (viewMode === 'list') {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-gray-700 hover:border-blue-400">
        <div className="flex gap-4">
          <div className="relative">
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-16 h-24 object-cover rounded-md shadow-sm"
            />
            {owned && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                ✓
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-medium text-lg text-gray-100 mb-1">{book.title}</h3>
                <p className="text-gray-400 text-sm">{book.author}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-gray-700 text-gray-300 border-0 text-xs">
                    {book.category}
                  </Badge>
                  {owned && (
                    <Badge className="bg-green-900/50 text-green-300 border-0 text-xs">
                      已拥有
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg font-medium text-white">
                  {book.price > 0 ? `$${book.price}` : '免费'}
                </div>
                <div className="text-xs text-gray-400 mt-1">
  
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {owned ? (
                <Button onClick={() => onView(book)} className="h-8 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm px-3">
                  阅读
                </Button>
              ) : (
                <Button onClick={() => onPurchase(book)} className="h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm px-3">
                  购买
                </Button>
              )}
              {!owned && (
                <Button variant="outline" onClick={() => onView(book)} className="h-8 rounded-md bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 text-sm px-3">
                  预览
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-700 hover:border-blue-400">
      <div className="aspect-[2/3] relative overflow-hidden">
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-full h-full object-cover"
        />
        {owned && (
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
            ✓
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-base mb-1 line-clamp-1 text-gray-100">
          {book.title}
        </h3>
        <p className="text-gray-400 text-xs mb-2">
          {book.author}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-white">
            {book.price > 0 ? `$${book.price}` : '免费'}
          </div>
          <Badge className="bg-gray-700 text-gray-300 border-0 text-xs">
            {book.category}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          {owned ? (
            <Button onClick={() => onView(book)} className="flex-1 h-8 rounded-md bg-gray-700 hover:bg-gray-600 text-white text-sm">
              阅读
            </Button>
          ) : (
            <Button onClick={() => onPurchase(book)} className="flex-1 h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm">
              购买
            </Button>
          )}
          {!owned && (
            <Button variant="outline" onClick={() => onView(book)} className="h-8 rounded-md bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 text-sm px-3">
              预览
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;