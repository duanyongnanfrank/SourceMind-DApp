import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Bookmark, SkipBack, SkipForward } from 'lucide-react';

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

}

const BookReader: React.FC<{
  book: EBook;
  onClose: () => void;
}> = ({ book, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(120);
  const [fontSize, setFontSize] = useState(16);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  const toggleBookmark = () => {
    setBookmarks(prev => 
      prev.includes(currentPage)
        ? prev.filter(p => p !== currentPage)
        : [...prev, currentPage]
    );
  };

  const themeClasses = {
    light: 'bg-white text-black',
    dark: 'bg-gray-900 text-white',
    sepia: 'bg-amber-50 text-amber-900'
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{book.title}</h1>
            <p className="text-sm text-muted-foreground">{book.author}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleBookmark}
            className={bookmarks.includes(currentPage) ? 'text-yellow-500' : ''}
          >
            <Bookmark className="h-4 w-4" />
          </Button>
          <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="sepia">Sepia</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
            >
              A-
            </Button>
            <span className="text-sm w-8 text-center">{fontSize}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFontSize(Math.min(24, fontSize + 2))}
            >
              A+
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className={`flex-1 p-8 ${themeClasses[theme]}`} style={{ fontSize }}>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Chapter {currentPage}</h2>
            <div className="prose prose-lg max-w-none">
              <p className="mb-4">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim 
                veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea 
                commodo consequat.
              </p>
              <p className="mb-4">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum 
                dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non 
                proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <p className="mb-4">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium 
                doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore 
                veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 border-t bg-background">
        <Button
          variant="ghost"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <SkipBack className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Progress value={(currentPage / totalPages) * 100} className="w-32" />
        </div>

        <Button
          variant="ghost"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
          <SkipForward className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default BookReader;