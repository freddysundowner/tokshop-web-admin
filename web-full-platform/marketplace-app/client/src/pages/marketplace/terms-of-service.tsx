import { Link } from 'wouter';
import { useSettings } from '@/lib/settings-context';
import { usePageTitle } from '@/hooks/use-page-title';

export default function TermsOfService() {
  const { settings } = useSettings();
  usePageTitle('Terms of Service');
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: October 21, 2025</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
            <p className="mb-4">
              By accessing or using {settings.app_name} ("the Platform", "our Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you do not have permission to access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
            <p className="mb-4">To use our Service, you must:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into a binding contract</li>
              <li>Not be prohibited from using the Service under applicable laws</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Account Registration</h2>
            <p className="mb-4">
              When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms. You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Maintaining the confidentiality of your account password</li>
              <li>Restricting access to your account</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. User Conduct</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon intellectual property rights of others</li>
              <li>Upload harmful code or malware</li>
              <li>Engage in fraudulent, deceptive, or misleading activities</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Manipulate prices or engage in bid rigging</li>
              <li>Create fake accounts or impersonate others</li>
              <li>Sell counterfeit, stolen, or illegal items</li>
              <li>Spam or send unsolicited communications</li>
              <li>Scrape or collect data from the Platform without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Seller Terms</h2>
            <p className="mb-4">If you operate as a seller on the Platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Provide accurate descriptions and images of items</li>
              <li>Honor all sales and complete transactions promptly</li>
              <li>Ship items within stated timeframes</li>
              <li>Comply with all applicable tax laws and regulations</li>
              <li>Maintain adequate inventory of listed items</li>
              <li>Respond to buyer inquiries in a timely manner</li>
              <li>Accept responsibility for items until delivered</li>
              <li>Comply with our seller policies and guidelines</li>
            </ul>
            <p className="mb-4">
              We reserve the right to suspend or terminate seller accounts that violate these terms or our seller policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Buyer Terms</h2>
            <p className="mb-4">As a buyer, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Pay for all purchases promptly</li>
              <li>Provide accurate shipping information</li>
              <li>Not engage in bid manipulation or shill bidding</li>
              <li>Communicate respectfully with sellers</li>
              <li>Follow our return and refund policies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Live Streaming</h2>
            <p className="mb-4">Our Platform includes live streaming features. By participating, you agree that:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Your comments and interactions may be visible to other users</li>
              <li>We may record and store live stream content</li>
              <li>You will not share inappropriate, offensive, or illegal content</li>
              <li>You will respect community guidelines during live shows</li>
              <li>Bids and purchases made during live shows are binding</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Payments and Fees</h2>
            <p className="mb-4">
              We use third-party payment processors to handle transactions. By making a purchase or sale, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Pay all applicable fees and charges</li>
              <li>Our commission structure for sellers (as outlined in seller dashboard)</li>
              <li>Payment processing fees charged by our providers</li>
              <li>Shipping and handling costs</li>
              <li>Any applicable taxes</li>
            </ul>
            <p className="mb-4">
              All sales are final unless otherwise stated in our return policy. Refunds are subject to our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Intellectual Property</h2>
            <p className="mb-4">
              The Platform and its original content, features, and functionality are owned by {settings.app_name} and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="mb-4">
              By posting content on the Platform, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content in connection with operating the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Prohibited Items</h2>
            <p className="mb-4">The following items are strictly prohibited from being sold on our Platform:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Counterfeit or replica items</li>
              <li>Stolen goods</li>
              <li>Illegal drugs or drug paraphernalia</li>
              <li>Weapons and explosives</li>
              <li>Hazardous materials</li>
              <li>Adult content and services</li>
              <li>Live animals</li>
              <li>Human remains or body parts</li>
              <li>Items that infringe on intellectual property rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Dispute Resolution</h2>
            <p className="mb-4">
              In the event of a dispute between buyers and sellers, we encourage parties to resolve issues directly. If resolution is not possible, you may submit a dispute through our dispute resolution system. We reserve the right to make final decisions on disputes.
            </p>
            <p className="mb-4">
              Any dispute arising from these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Limitation of Liability</h2>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {settings.app_name.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
            <p className="mb-4">
              We are not responsible for the quality, safety, or legality of items sold, the truth or accuracy of listings, the ability of sellers to sell items, or the ability of buyers to pay for items.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Indemnification</h2>
            <p className="mb-4">
              You agree to indemnify and hold harmless {settings.app_name}, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Platform, violation of these Terms, or infringement of any rights of another.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">14. Termination</h2>
            <p className="mb-4">
              We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we believe:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Violates these Terms or our policies</li>
              <li>Harms other users or the Platform</li>
              <li>Exposes us to legal liability</li>
              <li>Is fraudulent or illegal</li>
            </ul>
            <p className="mb-4">
              Upon termination, your right to use the Platform will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">15. Modifications to Service</h2>
            <p className="mb-4">
              We reserve the right to modify or discontinue the Service at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">16. Governing Law</h2>
            <p className="mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">17. Changes to Terms</h2>
            <p className="mb-4">
              We reserve the right to modify these Terms at any time. We will provide notice of significant changes by posting the new Terms on the Platform and updating the "Last Updated" date. Your continued use of the Platform after such changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">18. Severability</h2>
            <p className="mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">19. Entire Agreement</h2>
            <p className="mb-4">
              These Terms constitute the entire agreement between you and {settings.app_name} regarding the use of the Platform and supersede any prior agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">20. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-none space-y-2">
              <li>Email: {settings.support_email}</li>
            </ul>
          </section>

          <section className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              By using our Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 {settings.app_name}. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <Link href="/privacy-policy" className="text-muted-foreground hover:text-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="text-muted-foreground hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
