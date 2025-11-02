import { Link } from 'wouter';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/lib/settings-context';
import { usePageTitle } from '@/hooks/use-page-title';

export default function FAQ() {
  const { settings } = useSettings();
  usePageTitle('FAQ');

  const faqs = [
    {
      category: 'Account & Registration',
      questions: [
        {
          question: 'How do I create an account?',
          answer: `To create an account, click the "Sign Up" button on the homepage. You can register using your email address or sign up with Google or Facebook. Fill in your details and verify your email to get started.`,
        },
        {
          question: 'How do I become a seller?',
          answer: `To become a seller, log into your account, go to Settings, and enable the "Seller" option. You'll need to provide additional information such as business details, payment information, and agree to the seller terms and conditions.`,
        },
        {
          question: 'I forgot my password. What should I do?',
          answer: `Click on "Forgot Password" on the login page. Enter your email address and we'll send you a link to reset your password. Follow the instructions in the email to create a new password.`,
        },
        {
          question: 'Can I change my username?',
          answer: `Yes, you can change your username in your Account Settings. Go to Profile > Account Settings > Username. Note that you can only change your username once every 30 days.`,
        },
      ],
    },
    {
      category: 'Buying & Orders',
      questions: [
        {
          question: 'How do I place an order?',
          answer: `Browse products on the marketplace or join a live show. When you find an item you want, click "Buy Now" or place a bid during live auctions. Follow the checkout process to complete your purchase.`,
        },
        {
          question: 'What payment methods are accepted?',
          answer: `We accept major credit cards (Visa, Mastercard, American Express, Discover), debit cards, PayPal, and Apple Pay. All payments are processed securely through our payment provider.`,
        },
        {
          question: 'How can I track my order?',
          answer: `Once your order ships, you'll receive a tracking number via email. You can also view your order status and tracking information in your Purchases section.`,
        },
        {
          question: 'What is your return policy?',
          answer: `Returns are accepted within 30 days of delivery for most items. The item must be in its original condition with tags attached. Some items like personalized products may not be eligible for returns. Contact the seller or our support team to initiate a return.`,
        },
        {
          question: 'How do refunds work?',
          answer: `Refunds are processed within 5-7 business days after we receive and inspect the returned item. The refund will be credited to your original payment method. You'll receive an email confirmation once the refund is processed.`,
        },
      ],
    },
    {
      category: 'Selling & Inventory',
      questions: [
        {
          question: 'How do I list a product for sale?',
          answer: `Go to Inventory > Add Product. Upload photos, set your price, add a description, and choose shipping options. Once you publish your listing, it will be visible to buyers on the marketplace.`,
        },
        {
          question: 'What fees do sellers pay?',
          answer: `Sellers pay a small commission on each sale, typically 10-15% of the sale price. Payment processing fees apply separately. There are no listing fees or monthly subscription costs.`,
        },
        {
          question: 'How do I get paid?',
          answer: `Payments are transferred to your linked bank account or PayPal. Payouts are processed weekly, and funds typically arrive within 2-5 business days. You can view your payment history in the Payments section.`,
        },
        {
          question: 'Can I offer discounts or promotions?',
          answer: `Yes! You can create discount codes, run limited-time sales, and offer bundle deals. Go to your Seller Settings to set up promotions.`,
        },
        {
          question: 'How do I ship my items?',
          answer: `You can purchase shipping labels directly through ${settings.app_name} or use your own shipping method. We integrate with major carriers to provide discounted rates. Print labels from the Orders page and ship within 2 business days of receiving an order.`,
        },
      ],
    },
    {
      category: 'Live Shows',
      questions: [
        {
          question: 'What are live shows?',
          answer: `Live shows are interactive streaming sessions where sellers showcase products in real-time. You can bid on items, participate in auctions, enter giveaways, and chat with the host and other viewers.`,
        },
        {
          question: 'How do I join a live show?',
          answer: `Browse upcoming shows on the homepage or follow your favorite sellers. Click on a show to join the live stream. You can participate in the chat and place bids during the show.`,
        },
        {
          question: 'How do I host a live show as a seller?',
          answer: `Schedule a show in your Seller Dashboard by selecting a date, time, and products to feature. You'll need a stable internet connection and a camera. We recommend testing your setup before going live.`,
        },
        {
          question: 'What happens if I win an auction?',
          answer: `If you win an auction, you'll be notified immediately and receive a checkout link. Complete payment within 24 hours to secure your item. Unpaid wins may result in account restrictions.`,
        },
      ],
    },
    {
      category: 'Technical & Support',
      questions: [
        {
          question: 'The app is not working properly. What should I do?',
          answer: `Try refreshing the page or clearing your browser cache. Make sure you're using the latest version of your browser. If problems persist, contact support with details about the issue.`,
        },
        {
          question: 'Is my personal information secure?',
          answer: `Yes, we use industry-standard encryption to protect your data. We never share your personal information with third parties without your consent. Read our Privacy Policy for more details.`,
        },
        {
          question: 'How do I delete my account?',
          answer: `To delete your account, go to Account Settings > Privacy > Delete Account. Note that this action is permanent and cannot be undone. All your data will be removed within 30 days.`,
        },
        {
          question: 'How can I contact customer support?',
          answer: `You can contact us via email at ${settings.support_email} or use the contact form on our Contact Us page. We typically respond within 24-48 hours.`,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-faq-title">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Find answers to common questions about {settings.app_name}. If you can't find what you're looking for, feel free to{' '}
            <Link href="/contact" data-testid="link-contact">
              <span className="text-primary hover:underline cursor-pointer">
                contact us
              </span>
            </Link>
            .
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h2 className="text-xl sm:text-2xl font-bold mb-4" data-testid={`category-${categoryIndex}`}>
                {category.category}
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, faqIndex) => (
                      <AccordionItem
                        key={faqIndex}
                        value={`item-${categoryIndex}-${faqIndex}`}
                        className="border-b last:border-b-0"
                      >
                        <AccordionTrigger
                          className="px-4 sm:px-6 py-4 text-left hover:no-underline hover-elevate"
                          data-testid={`faq-question-${categoryIndex}-${faqIndex}`}
                        >
                          <span className="font-medium text-sm sm:text-base pr-4">
                            {faq.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 sm:px-6 pb-4 text-sm sm:text-base text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Still have questions section */}
        <Card className="mt-12 border-primary/20 bg-primary/5">
          <CardContent className="p-6 sm:p-8 text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Still have questions?</h3>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              Our support team is here to help. Reach out and we'll get back to you as soon as possible.
            </p>
            <Link href="/contact">
              <Button data-testid="button-contact-us">
                Contact Support
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
