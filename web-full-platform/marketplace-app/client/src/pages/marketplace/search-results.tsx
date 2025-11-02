import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Search, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSettings } from '@/lib/settings-context';
import { usePageTitle } from '@/hooks/use-page-title';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Product {
  _id: string;
  name: string;
  price: number;
  images?: string[];
  description?: string;
  owner?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  };
}

interface Show {
  _id: string;
  title: string;
  thumbnail?: string;
  owner?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    profilePhoto?: string;
  };
}

interface UserResult {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  profilePhoto?: string;
}

interface SearchResults {
  query: string;
  results: {
    products: Product[];
    rooms: Show[];
    users: UserResult[];
  };
}

export default function SearchResults() {
  const { settings } = useSettings();
  const searchParams = useSearch();
  const query = new URLSearchParams(searchParams).get('q') || '';
  usePageTitle(query ? `Search: ${query}` : 'Search');

  const { data, isLoading } = useQuery<SearchResults>({
    queryKey: ['/api/products/search', query],
    queryFn: async () => {
      if (!query.trim()) {
        return { query: '', results: { products: [], rooms: [], users: [] } };
      }
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: query.length > 0,
  });

  const products = data?.results?.products || [];
  const shows = data?.results?.rooms || [];
  const users = data?.results?.users || [];

  const hasResults = products.length > 0 || shows.length > 0 || users.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Query Display */}
        {query && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Search className="h-5 w-5" />
              <span className="text-sm">Search results for</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-search-query">
              {query}
            </h1>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            Searching...
          </div>
        )}

        {/* No Results */}
        {!isLoading && query && !hasResults && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-2">No results found</p>
            <p className="text-muted-foreground">Try different keywords</p>
          </div>
        )}

        {/* Users Section */}
        {users.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">People</h2>
            <div className="space-y-2">
              {users.map((user) => (
                <Link key={user._id} href={`/profile/${user._id}`}>
                  <div
                    className="flex items-center gap-4 p-4 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                    data-testid={`user-result-${user._id}`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.profilePhoto} alt={user.firstName || user.username || 'User'} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground" data-testid={`text-username-${user._id}`}>
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.username || 'Unknown User'}
                      </p>
                      {user.username && user.firstName && (
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Shows Section */}
        {shows.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Shows</h2>
            <div className="space-y-2">
              {shows.map((show) => (
                <Link key={show._id} href={`/show/${show._id}`}>
                  <div
                    className="flex items-center gap-4 p-4 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                    data-testid={`show-result-${show._id}`}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Search className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground" data-testid={`text-show-title-${show._id}`}>
                        {show.title}
                      </p>
                      <p className="text-sm text-muted-foreground">in Shows</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Section */}
        {products.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4">Products</h2>
            <div className="space-y-2">
              {products.map((product) => (
                <Link key={product._id} href={`/product/${product._id}`}>
                  <div
                    className="flex items-center gap-4 p-4 rounded-md hover-elevate active-elevate-2 cursor-pointer"
                    data-testid={`product-result-${product._id}`}
                  >
                    {/* Product Image */}
                    <div className="w-16 h-16 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Search className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate" data-testid={`text-product-name-${product._id}`}>
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {product.description}
                        </p>
                      )}
                      {product.owner && (
                        <p className="text-xs text-muted-foreground">
                          by {product.owner.firstName || product.owner.username || 'Unknown Seller'}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground" data-testid={`text-price-${product._id}`}>
                        US${product.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!query && !isLoading && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-2">Start searching</p>
            <p className="text-muted-foreground">Enter a search term to find products, shows, and people</p>
          </div>
        )}
      </div>
    </div>
  );
}
