import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// --- Interface Definitions ---
interface SearchResult {
  type: 'navigation';
  id: string;
  title: string;
  subtitle?: string;
  path?: string;
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

const navigationItems = [
  { title: 'Dashboard', path: '/dashboard' },
  { title: 'Products Store', path: '/products' },
  { title: 'Products Sold', path: '/products-sold' },
  { title: 'Products Restored', path: '/products-restored' },
  { title: 'My Profile', path: '/profile' },
  { title: 'Reports', path: '/reports' },
  { title: 'Trash', path: '/trash' },
  { title: 'Manage Branch', path: '/manage-branch' },
  { title: 'Manage Employees', path: '/manage-employees' },
];

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- Search Logic with Debounce ---
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(() => {
      const results: SearchResult[] = [];
      const query = searchQuery.toLowerCase();

      // Search navigation items
      navigationItems.forEach(item => {
        if (item.title.toLowerCase().includes(query)) {
          results.push({
            type: 'navigation',
            id: `nav-${item.path}`,
            title: item.title,
            subtitle: 'Navigation',
            path: item.path,
          });
        }
      });

      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};