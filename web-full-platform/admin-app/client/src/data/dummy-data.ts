// Dummy data for Whatnot-style marketplace

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  verified: boolean;
  totalSales: number;
  rating: number;
}

export interface Giveaway {
  id: string;
  title: string;
  hostId: string;
  hostUsername: string;
  image: string;
  category: string;
  liveCountdown: number; // seconds remaining
  starts: number; // number of starts/entries
  freeShipping?: boolean;
  additionalInfo?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  condition: 'New' | 'Used' | 'Sealed' | 'Like New';
  category: string;
  sellerId: string;
  inStock: boolean;
  views: number;
}

export interface LiveShow {
  id: string;
  title: string;
  hostId: string;
  thumbnail: string;
  status: 'live' | 'upcoming' | 'ended';
  viewers: number;
  category: string;
  scheduledTime?: string;
  products: string[]; // product IDs
  startedAt?: string;
}

export interface Auction {
  id: string;
  productId: string;
  showId: string;
  currentBid: number;
  startingBid: number;
  bidCount: number;
  endsAt: string;
  status: 'active' | 'ending-soon' | 'ended';
  winnerId?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
    title: string;
    image: string;
  }[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  trackingNumber?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// Users
export const users: User[] = [
  {
    id: '1',
    username: 'sneakerking',
    displayName: 'Sneaker King',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sneakerking',
    bio: 'Premium sneakers & streetwear collector. 10+ years in the game. Authentic only!',
    followers: 15420,
    following: 342,
    verified: true,
    totalSales: 2840,
    rating: 4.9,
  },
  {
    id: '2',
    username: 'cardcollector',
    displayName: 'Card Collector Pro',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cardcollector',
    bio: 'Pokémon, sports cards, and TCG. Live breaks daily at 8PM EST!',
    followers: 8920,
    following: 156,
    verified: true,
    totalSales: 1560,
    rating: 4.8,
  },
  {
    id: '3',
    username: 'vintagefinds',
    displayName: 'Vintage Treasures',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vintagefinds',
    bio: 'Curated vintage clothing, accessories & collectibles from the 80s-90s.',
    followers: 5230,
    following: 89,
    verified: false,
    totalSales: 890,
    rating: 4.7,
  },
  {
    id: '4',
    username: 'techdeals',
    displayName: 'Tech Deals Central',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=techdeals',
    bio: 'Latest electronics, gaming gear, and tech accessories. Best prices guaranteed!',
    followers: 12100,
    following: 203,
    verified: true,
    totalSales: 3240,
    rating: 4.9,
  },
  {
    id: '5',
    username: 'funkopop_vault',
    displayName: 'Funko Vault',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=funkopop',
    bio: 'Rare & exclusive Funko Pops. Chase variants, convention exclusives & more!',
    followers: 6750,
    following: 124,
    verified: true,
    totalSales: 1120,
    rating: 4.8,
  },
  {
    id: '6',
    username: 'blymozzjewelry',
    displayName: 'BlymozzJewelry',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=blymozz',
    bio: 'Fine jewelry and precious metals',
    followers: 3200,
    following: 50,
    verified: true,
    totalSales: 450,
    rating: 4.9,
  },
  {
    id: '7',
    username: 'jaysjewels',
    displayName: 'JaysJewels',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jaysjewels',
    bio: 'Solid gold giveaways',
    followers: 8900,
    following: 120,
    verified: true,
    totalSales: 1200,
    rating: 4.8,
  },
  {
    id: '8',
    username: 'tlimesteals',
    displayName: 'TLimesteals',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tlime',
    bio: 'Mentioned you, you won a giveaway',
    followers: 12000,
    following: 200,
    verified: true,
    totalSales: 2100,
    rating: 4.9,
  },
  {
    id: '9',
    username: 'shellycorn2660',
    displayName: 'ShellyCorn2660',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shelly',
    bio: 'Free jewelry & crystal clear glazed jewelry',
    followers: 5600,
    following: 80,
    verified: false,
    totalSales: 780,
    rating: 4.7,
  },
  {
    id: '10',
    username: 'reneeadams77',
    displayName: 'ReneeAdams77',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=renee',
    bio: 'Vintage sterling silver, gold, native',
    followers: 4300,
    following: 95,
    verified: true,
    totalSales: 620,
    rating: 4.8,
  },
  {
    id: '11',
    username: 'keonikai',
    displayName: 'KeoniKai',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=keoni',
    bio: 'Hawaii homemade recipes',
    followers: 7200,
    following: 110,
    verified: true,
    totalSales: 890,
    rating: 4.9,
  },
  {
    id: '12',
    username: 'cheaperthanaretail',
    displayName: 'CheaperThanARetail',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cheaper',
    bio: 'Great deals on retail items',
    followers: 9800,
    following: 150,
    verified: true,
    totalSales: 1450,
    rating: 4.7,
  },
  {
    id: '13',
    username: 'moissywholeseller',
    displayName: 'MoissyWholeseller',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=moissy',
    bio: 'Wholesale moissanite jewelry',
    followers: 6400,
    following: 75,
    verified: true,
    totalSales: 1100,
    rating: 4.8,
  },
  {
    id: '14',
    username: 'alexslilshob',
    displayName: 'AlexsLilShob',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
    bio: 'Accessories and slim carnival party',
    followers: 3900,
    following: 60,
    verified: false,
    totalSales: 520,
    rating: 4.6,
  },
  {
    id: '15',
    username: 'candiceindevexport',
    displayName: 'CandiceInDevExport',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=candice',
    bio: 'Free shipping',
    followers: 11200,
    following: 180,
    verified: true,
    totalSales: 1980,
    rating: 4.9,
  },
];

// Categories
export const categories: Category[] = [
  { id: '1', name: 'Sneakers', icon: '👟', count: 1240 },
  { id: '2', name: 'Sneakers & Streetwear', icon: '👟', count: 850 },
  { id: '3', name: 'Fine & Precious Metals', icon: '💎', count: 650 },
  { id: '4', name: 'Jewellery', icon: '💍', count: 920 },
  { id: '5', name: 'Electronics', icon: '📱', count: 890 },
  { id: '6', name: 'Films', icon: '🎬', count: 450 },
  { id: '7', name: 'Books & Movies', icon: '📚', count: 560 },
  { id: '8', name: 'Trading Cards', icon: '🃏', count: 2850 },
  { id: '9', name: 'Collectibles', icon: '🎨', count: 1560 },
  { id: '10', name: 'Fashion', icon: '👕', count: 720 },
];

// Products
export const products: Product[] = [
  {
    id: '1',
    title: 'Nike Air Jordan 1 Retro High OG "Chicago"',
    description: 'Brand new, deadstock. Size 10. Original box included.',
    price: 450,
    image: 'https://images.unsplash.com/photo-1556906781-9cba4df2c2dc?w=500',
    condition: 'New',
    category: 'Sneakers',
    sellerId: '1',
    inStock: true,
    views: 1240,
  },
  {
    id: '2',
    title: 'Pokémon Charizard VMAX - Rainbow Rare',
    description: 'PSA 10 Gem Mint. Champions Path set. Perfect centering!',
    price: 380,
    image: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=500',
    condition: 'Sealed',
    category: 'Trading Cards',
    sellerId: '2',
    inStock: true,
    views: 890,
  },
  {
    id: '3',
    title: 'Sony PlayStation 5 Console - Disc Edition',
    description: 'Brand new in box. Never opened. Ships same day!',
    price: 499,
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500',
    condition: 'New',
    category: 'Electronics',
    sellerId: '4',
    inStock: true,
    views: 2340,
  },
  {
    id: '4',
    title: 'Vintage 90s Nike Windbreaker Jacket',
    description: 'Size L. Authentic vintage. Great condition, minimal wear.',
    price: 85,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
    condition: 'Used',
    category: 'Vintage',
    sellerId: '3',
    inStock: true,
    views: 450,
  },
  {
    id: '5',
    title: 'Funko Pop! Spider-Man (Chrome) SDCC Exclusive',
    description: 'San Diego Comic Con 2019 exclusive. Mint condition box.',
    price: 120,
    image: 'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=500',
    condition: 'New',
    category: 'Funko Pops',
    sellerId: '5',
    inStock: true,
    views: 670,
  },
  {
    id: '6',
    title: 'Adidas Yeezy Boost 350 V2 "Zebra"',
    description: 'Size 9.5. Worn once, excellent condition. Comes with box.',
    price: 320,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
    condition: 'Like New',
    category: 'Sneakers',
    sellerId: '1',
    inStock: true,
    views: 1560,
  },
  {
    id: '7',
    title: 'Apple AirPods Pro (2nd Generation)',
    description: 'Sealed in box. Latest model with MagSafe charging case.',
    price: 199,
    image: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=500',
    condition: 'New',
    category: 'Electronics',
    sellerId: '4',
    inStock: true,
    views: 980,
  },
  {
    id: '8',
    title: 'Michael Jordan Rookie Card - Fleer 1986',
    description: 'BGS 8.5. Beautiful card, great investment piece!',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1611329532992-0f6d4f4d3da1?w=500',
    condition: 'Used',
    category: 'Trading Cards',
    sellerId: '2',
    inStock: true,
    views: 2100,
  },
];

// Live Shows
export const liveShows: LiveShow[] = [
  {
    id: '1',
    title: 'MEGA Sneaker Drop! Jordan 1s, Yeezys & More 🔥',
    hostId: '1',
    thumbnail: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800',
    status: 'live',
    viewers: 2340,
    category: 'Sneakers',
    products: ['1', '6'],
    startedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    title: 'Pokémon Card Break - 10 Booster Boxes!',
    hostId: '2',
    thumbnail: 'https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=800',
    status: 'live',
    viewers: 1890,
    category: 'Trading Cards',
    products: ['2', '8'],
    startedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '3',
    title: 'Tech Tuesday - PS5, iPhones, AirPods & Gaming',
    hostId: '4',
    thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
    status: 'live',
    viewers: 3120,
    category: 'Electronics',
    products: ['3', '7'],
    startedAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: '4',
    title: 'Vintage Vibes - 80s & 90s Fashion Finds',
    hostId: '3',
    thumbnail: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800',
    status: 'upcoming',
    viewers: 0,
    category: 'Vintage',
    products: ['4'],
    scheduledTime: new Date(Date.now() + 3600000).toISOString(),
  },
  {
    id: '5',
    title: 'Funko Hunting! Chases & Exclusives Galore',
    hostId: '5',
    thumbnail: 'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=800',
    status: 'upcoming',
    viewers: 0,
    category: 'Funko Pops',
    products: ['5'],
    scheduledTime: new Date(Date.now() + 7200000).toISOString(),
  },
  {
    id: '6',
    title: 'Late Night Sneaker Auction - Heat Only 🔥',
    hostId: '1',
    thumbnail: 'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=800',
    status: 'upcoming',
    viewers: 0,
    category: 'Sneakers',
    products: [],
    scheduledTime: new Date(Date.now() + 10800000).toISOString(),
  },
];

// Auctions
export const auctions: Auction[] = [
  {
    id: '1',
    productId: '1',
    showId: '1',
    currentBid: 450,
    startingBid: 350,
    bidCount: 23,
    endsAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes
    status: 'ending-soon',
  },
  {
    id: '2',
    productId: '2',
    showId: '2',
    currentBid: 380,
    startingBid: 250,
    bidCount: 18,
    endsAt: new Date(Date.now() + 180000).toISOString(), // 3 minutes
    status: 'ending-soon',
  },
  {
    id: '3',
    productId: '6',
    showId: '1',
    currentBid: 320,
    startingBid: 280,
    bidCount: 12,
    endsAt: new Date(Date.now() + 900000).toISOString(), // 15 minutes
    status: 'active',
  },
  {
    id: '4',
    productId: '8',
    showId: '2',
    currentBid: 1200,
    startingBid: 1000,
    bidCount: 34,
    endsAt: new Date(Date.now() + 600000).toISOString(), // 10 minutes
    status: 'active',
  },
];

// Orders
export const orders: Order[] = [
  {
    id: 'ORD-001',
    userId: 'current-user',
    items: [
      {
        productId: '7',
        quantity: 1,
        price: 199,
        title: 'Apple AirPods Pro (2nd Generation)',
        image: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=500',
      },
    ],
    total: 199,
    status: 'delivered',
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    trackingNumber: 'TRK123456789',
  },
  {
    id: 'ORD-002',
    userId: 'current-user',
    items: [
      {
        productId: '5',
        quantity: 1,
        price: 120,
        title: 'Funko Pop! Spider-Man (Chrome) SDCC Exclusive',
        image: 'https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=500',
      },
      {
        productId: '4',
        quantity: 1,
        price: 85,
        title: 'Vintage 90s Nike Windbreaker Jacket',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500',
      },
    ],
    total: 205,
    status: 'shipped',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    trackingNumber: 'TRK987654321',
  },
  {
    id: 'ORD-003',
    userId: 'current-user',
    items: [
      {
        productId: '3',
        quantity: 1,
        price: 499,
        title: 'Sony PlayStation 5 Console - Disc Edition',
        image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500',
      },
    ],
    total: 499,
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Giveaways
export const giveaways: Giveaway[] = [
  {
    id: '1',
    title: '1$ Start @500 giveaway All Moissi',
    hostId: '6',
    hostUsername: 'blymozzjewelry',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    category: 'Fine & Precious Metals',
    liveCountdown: 86,
    starts: 500,
    additionalInfo: 'Sterling, G...',
  },
  {
    id: '2',
    title: 'RESTOCK IS HERE!!!!! STERLING SILVER AND MOISSY 24 HOURS ...',
    hostId: '7',
    hostUsername: 'jaysjewels',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    category: 'Fine & Precious Metals',
    liveCountdown: 1993,
    starts: 0,
    additionalInfo: 'Sterling, G...',
  },
  {
    id: '3',
    title: 'Mentioned You.. You Won A Giveaway! #MASSIVE GIVEYS +...',
    hostId: '8',
    hostUsername: 'tlimesteals',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    category: 'Sneakers',
    liveCountdown: 2210,
    starts: 61,
  },
  {
    id: '4',
    title: 'Free jewelry? ! & Crystal clear glazed jewelry',
    hostId: '9',
    hostUsername: 'shellycorn2660',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800',
    category: 'Fine & Precious Metals',
    liveCountdown: 97,
    starts: 61,
    additionalInfo: '1 Starts, ...',
  },
  {
    id: '5',
    title: 'Vintage sterling silver, gold, native',
    hostId: '10',
    hostUsername: 'reneeadams77',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800',
    category: 'Fine & Precious Metals',
    liveCountdown: 68,
    starts: 0,
    additionalInfo: 'Sterling, G...',
  },
  {
    id: '6',
    title: 'HAWAII HOMEMADE RECIPES',
    hostId: '11',
    hostUsername: 'keonikai',
    image: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800',
    category: 'Films',
    liveCountdown: 345,
    starts: 0,
  },
  {
    id: '7',
    title: 'GIVEAWAY ICY MOISSANITE',
    hostId: '12',
    hostUsername: 'cheaperthanaretail',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800',
    category: 'Jewellery',
    liveCountdown: 543,
    starts: 0,
  },
  {
    id: '8',
    title: 'moissywholeseller',
    hostId: '13',
    hostUsername: 'moissywholeseller',
    image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800',
    category: 'Jewellery',
    liveCountdown: 90,
    starts: 0,
  },
  {
    id: '9',
    title: 'Accessories & Slim Carnival Party',
    hostId: '14',
    hostUsername: 'alexslilshob',
    image: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800',
    category: 'Jewellery',
    liveCountdown: 138,
    starts: 0,
  },
  {
    id: '10',
    title: 'Free shipping',
    hostId: '15',
    hostUsername: 'candiceindevexport',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    category: 'Fashion',
    liveCountdown: 7,
    starts: 0,
    freeShipping: true,
  },
];

// Helper functions
export const getUserById = (id: string) => users.find(u => u.id === id);
export const getProductById = (id: string) => products.find(p => p.id === id);
export const getShowById = (id: string) => liveShows.find(s => s.id === id);
export const getAuctionById = (id: string) => auctions.find(a => a.id === id);
export const getOrderById = (id: string) => orders.find(o => o.id === id);
export const getGiveawayById = (id: string) => giveaways.find(g => g.id === id);

export const getLiveShows = () => liveShows.filter(s => s.status === 'live');
export const getUpcomingShows = () => liveShows.filter(s => s.status === 'upcoming');
export const getProductsByCategory = (category: string) => 
  products.filter(p => p.category === category);
export const getActiveAuctions = () => 
  auctions.filter(a => a.status === 'active' || a.status === 'ending-soon');
