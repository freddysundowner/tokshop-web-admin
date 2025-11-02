import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/lib/settings-context';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, Play, Star, TrendingUp, Zap, Shield } from 'lucide-react';
import { useEffect } from 'react';

export default function LandingPage() {
  const { settings } = useSettings();
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users to appropriate page
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.admin) {
        setLocation('/admin');
      } else {
        setLocation('/marketplace');
      }
    }
  }, [isAuthenticated, user, setLocation]);

  const categories = [
    { name: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=500&fit=crop' },
    { name: 'Collectibles', image: 'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=400&h=500&fit=crop' },
    { name: 'Sports Cards', image: 'https://images.unsplash.com/photo-1611916656173-875e4277bea6?w=400&h=500&fit=crop' },
    { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=500&fit=crop' },
    { name: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=500&fit=crop' },
    { name: 'Jewelry', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=500&fit=crop' },
  ];

  const brands = [
    { name: 'Nike', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg' },
    { name: 'Adidas', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg' },
    { name: 'Supreme', logo: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=200&h=80&fit=crop' },
    { name: 'Pokémon', logo: 'https://images.unsplash.com/photo-1613771404721-1f92d799e49f?w=200&h=80&fit=crop' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                The Live Shopping Marketplace
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
                Shop, sell, and connect around the things you love. Join thousands of buyers and sellers in real-time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/login">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-semibold rounded-full text-lg px-8 h-12 w-full sm:w-auto" data-testid="button-download-hero">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="rounded-full text-lg px-8 h-12 w-full sm:w-auto" data-testid="button-watch-demo">
                  <Play className="mr-2 h-5 w-5" /> Watch Demo
                </Button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=600&fit=crop"
                  alt="Live shopping experience"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex items-center gap-3 bg-live/90 backdrop-blur-sm rounded-lg px-4 py-3 w-fit">
                    <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white font-bold text-sm">Live Now - 12.5K watching</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join live shows, bid on items you love, and connect with passionate sellers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-6">
                <Play className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Watch Live Shows
              </h3>
              <p className="text-muted-foreground">
                Browse live streams across 250+ categories and discover unique items from trusted sellers
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-6">
                <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Bid & Buy
              </h3>
              <p className="text-muted-foreground">
                Participate in fast-paced auctions, flash sales, and buy-it-now deals in real-time
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-6">
                <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">
                Safe & Secure
              </h3>
              <p className="text-muted-foreground">
                Protected purchases with buyer protection and secure checkout for peace of mind
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Join In the Fun Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop"
                  alt="Auction excitement"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Join In the Fun
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Take part in fast-paced auctions, incredible flash sales, live show giveaways, and so much more.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Star className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Live Auctions</h4>
                    <p className="text-muted-foreground">Bid in real-time and win amazing deals on items you love</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Star className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Flash Sales</h4>
                    <p className="text-muted-foreground">Lightning-fast deals with limited quantities at unbeatable prices</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Star className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Giveaways</h4>
                    <p className="text-muted-foreground">Win free items during live shows from generous sellers</p>
                  </div>
                </li>
              </ul>
              <Link href="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-semibold rounded-full text-lg px-8 h-12" data-testid="button-join-fun">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-16 sm:py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              We've Got It All
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore 250+ categories, including fashion, coins, sports & Pokémon cards, sneakers, and more.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {categories.map((category, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="aspect-[3/4] rounded-xl overflow-hidden shadow-lg mb-3">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-center font-semibold text-foreground">{category.name}</h3>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/login">
              <Button size="lg" variant="outline" className="rounded-full text-lg px-8 h-12" data-testid="button-explore-categories">
                Explore All Categories <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Brands Section */}
      <section id="brands" className="py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Find Incredible Deals on Name Brands
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                From the brands you love, to hard-to-find specialty products. There's a deal on whatever you're looking for.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                {brands.map((brand, index) => (
                  <div key={index} className="bg-card rounded-lg p-6 flex items-center justify-center h-24 hover-elevate">
                    <span className="text-xl font-bold text-foreground">{brand.name}</span>
                  </div>
                ))}
              </div>
              <Link href="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-semibold rounded-full text-lg px-8 h-12" data-testid="button-shop-brands">
                  Start Shopping <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Image */}
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                <img
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop"
                  alt="Brand products"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Ready to Start Shopping?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of buyers and sellers discovering amazing deals every day
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-black font-semibold rounded-full text-lg px-8 h-12" data-testid="button-final-cta">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8">
            {/* Footer Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy-policy" className="hover:text-foreground transition-colors" data-testid="link-privacy-policy">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="hover:text-foreground transition-colors" data-testid="link-terms-of-service">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors" data-testid="link-contact">
                Contact
              </Link>
            </div>

            {/* Bottom */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-black rounded-full flex items-center justify-center p-1">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                  </svg>
                </div>
                <span className="font-semibold text-foreground">{settings.app_name}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2025 {settings.app_name}. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
