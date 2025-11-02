import { Link } from 'wouter';
import { useSettings } from '@/lib/settings-context';
import { usePageTitle } from '@/hooks/use-page-title';

export default function PrivacyPolicy() {
  const { settings } = useSettings();
  usePageTitle('Privacy Policy');
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: October 21, 2025</p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to {settings.app_name} ("Company", "we", "our", "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy will inform you about how we look after your personal data when you visit our platform and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <p className="mb-4">We collect and process the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Account Information:</strong> Name, email address, username, password, phone number, and profile information.</li>
              <li><strong>Transaction Information:</strong> Payment details, billing address, shipping address, purchase history, and order information.</li>
              <li><strong>Identity Verification:</strong> Government-issued ID, tax information, and business verification documents for sellers.</li>
              <li><strong>Live Stream Data:</strong> Comments, chats, interactions during live shows, and viewing history.</li>
              <li><strong>Device Information:</strong> IP address, browser type, device type, operating system, and mobile device identifiers.</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent on pages, links clicked, and interaction with features.</li>
              <li><strong>Location Data:</strong> General location based on IP address and precise location if you grant permission.</li>
              <li><strong>Communications:</strong> Messages sent through our platform, customer support interactions, and email communications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use your personal data for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>To provide and maintain our services</li>
              <li>To process transactions and send transaction notifications</li>
              <li>To verify your identity and prevent fraud</li>
              <li>To facilitate live streaming and e-commerce features</li>
              <li>To send marketing communications (with your consent)</li>
              <li>To improve our services and develop new features</li>
              <li>To provide customer support</li>
              <li>To comply with legal obligations and enforce our terms</li>
              <li>To personalize your experience and show relevant content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Information Sharing</h2>
            <p className="mb-4">We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Service Providers:</strong> Payment processors, shipping providers, email services, and analytics providers.</li>
              <li><strong>Sellers and Buyers:</strong> To facilitate transactions, we share necessary information between buyers and sellers.</li>
              <li><strong>Legal Requirements:</strong> Law enforcement, regulatory authorities, or as required by law.</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale of company assets, or acquisition.</li>
              <li><strong>With Your Consent:</strong> When you explicitly consent to sharing your information.</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational security measures to protect your personal data, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and penetration testing</li>
              <li>Access controls and authentication measures</li>
              <li>Employee training on data protection</li>
              <li>Secure payment processing through PCI-DSS compliant providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Your Privacy Rights</h2>
            <p className="mb-4">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li><strong>Access:</strong> Request access to your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Request transfer of your data to another service</li>
              <li><strong>Restriction:</strong> Request restriction of processing your data</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="mb-4">
              To exercise these rights, please contact us at {settings.support_email}.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Children's Privacy</h2>
            <p className="mb-4">
              Our service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you become aware that a child has provided us with personal data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. International Data Transfers</h2>
            <p className="mb-4">
              Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Data Retention</h2>
            <p className="mb-4">
              We retain your personal data only for as long as necessary for the purposes set out in this Privacy Policy. We will retain and use your data to comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Third-Party Links</h2>
            <p className="mb-4">
              Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to read their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Changes to This Policy</h2>
            <p className="mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">13. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-none space-y-2">
              <li>Email: {settings.support_email}</li>
            </ul>
          </section>

          <section className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              This Privacy Policy is effective as of the date stated at the top of this policy. Your continued use of the platform after any changes to this policy will constitute your acceptance of such changes.
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
