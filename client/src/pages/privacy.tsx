import { Logo } from "@/components/layouts";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { Link } from "wouter";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            <Link href="/refunds" className="hover:text-primary">Refund Policy</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: April 10, 2026</p>

        <Section title="1. Information We Collect">
          <p>We collect information you provide directly to us when you:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Create an account (name, email address, username, password)</li>
            <li>Complete your profile (display name, bio, location, profile photo)</li>
            <li>Create listings (item descriptions, photos, pricing)</li>
            <li>Make purchases or complete transactions</li>
            <li>Contact us for support</li>
          </ul>
          <p>We also automatically collect certain information when you use our Platform, including IP address, browser type, device information, pages visited, and referring URLs.</p>
        </Section>

        <Section title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Provide, maintain, and improve the Swapedly Platform</li>
            <li>Process transactions and send related information</li>
            <li>Send promotional communications (you may opt out at any time)</li>
            <li>Respond to comments, questions, and support requests</li>
            <li>Monitor and analyze usage patterns to improve the Platform</li>
            <li>Detect and prevent fraudulent transactions and abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </Section>

        <Section title="3. Information Sharing">
          <p>We do not sell your personal information to third parties. We may share your information with:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>Other users:</strong> Your public profile, listings, and ratings are visible to other Swapedly users</li>
            <li><strong>Payment processors:</strong> Paddle processes payments on our behalf and handles payment data securely</li>
            <li><strong>Service providers:</strong> We use third-party services for hosting, analytics, and email delivery</li>
            <li><strong>Legal requirements:</strong> We may disclose information if required by law or to protect rights and safety</li>
          </ul>
        </Section>

        <Section title="4. Payment Information">
          <p>All payment processing is handled by Paddle, a certified payment processor. Swapedly does not store your credit card, debit card, or banking information. Paddle's privacy policy governs the processing of your payment data. You can view Paddle's privacy policy at <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">paddle.com/legal/privacy</a>.</p>
        </Section>

        <Section title="5. Cookies and Tracking">
          <p>We use cookies and similar tracking technologies to maintain your session, remember your preferences, and understand how you use the Platform. You can control cookies through your browser settings, though disabling cookies may affect Platform functionality.</p>
          <p>We may use third-party analytics services (such as Google Analytics) to help understand Platform usage. These services collect information about your visits anonymously.</p>
        </Section>

        <Section title="6. Data Retention">
          <p>We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal or business purposes.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Access the personal information we hold about you</li>
            <li>Correct inaccurate personal information</li>
            <li>Request deletion of your personal information</li>
            <li>Object to or restrict our processing of your information</li>
            <li>Receive a copy of your data in a portable format</li>
          </ul>
          <p>To exercise these rights, contact us at <a href="mailto:privacy@swapedly.com" className="text-primary hover:underline">privacy@swapedly.com</a>.</p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>Swapedly is not intended for users under the age of 18. We do not knowingly collect personal information from children. If we discover that a child has provided us with personal information, we will delete it promptly.</p>
        </Section>

        <Section title="9. Security">
          <p>We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. However, no internet transmission is completely secure and we cannot guarantee absolute security.</p>
        </Section>

        <Section title="10. International Transfers">
          <p>Swapedly is based in the United States. If you access our Platform from outside the United States, your information may be transferred to, stored, and processed in the United States where our servers are located.</p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.</p>
        </Section>

        <Section title="12. Contact Us">
          <p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:privacy@swapedly.com" className="text-primary hover:underline">privacy@swapedly.com</a>.</p>
        </Section>
      </main>

      <footer className="py-8 px-4 border-t text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-primary">Home</Link>
          <Link href="/pricing" className="hover:text-primary">Pricing</Link>
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary font-medium text-foreground">Privacy Policy</Link>
          <Link href="/refunds" className="hover:text-primary">Refund Policy</Link>
        </div>
        <div className="mt-4"><PerplexityAttribution /></div>
      </footer>
    </div>
  );
}
