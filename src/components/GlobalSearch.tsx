
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, CreditCard, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSearch } from '@/contexts/SearchContext';

const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { searchQuery, setSearchQuery, searchResults, isSearching, clearSearch } = useSearch();
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: any) => {
    if (result.path) {
      navigate(result.path);
    }
    setIsOpen(false);
    clearSearch();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'member':
        return <Users size={16} className="text-blue-600" />;
      case 'transaction':
        return <CreditCard size={16} className="text-green-600" />;
      case 'navigation':
        return <Navigation size={16} className="text-purple-600" />;
      default:
        return <Search size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="relative flex-1 max-w-md mx-4" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input
          placeholder="Search any page"
          className="pl-10 pr-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => {
              clearSearch();
              setIsOpen(false);
            }}
          >
            <X size={16} />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (searchQuery || searchResults.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {isSearching && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Searching...</span>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="py-4 text-center text-gray-500">
                No results found for "{searchQuery}"
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => handleResultClick(result)}
                  >
                    {getResultIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GlobalSearch;
