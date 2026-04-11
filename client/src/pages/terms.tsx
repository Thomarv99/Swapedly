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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/refunds" className="hover:text-primary">Refund Policy</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last updated: April 10, 2026</p>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using Swapedly ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Platform. These Terms apply to all visitors, users, and others who access or use Swapedly.</p>
          <p>Swapedly is operated by Swapedly, Inc. ("Company," "we," "our," or "us"). We reserve the right to modify these Terms at any time. We will notify you of significant changes by posting the new Terms on this page with an updated date.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>Swapedly is an online marketplace that allows users to list items for sale, earn virtual currency called "Swap Bucks" (SB), and purchase items from other users using Swap Bucks. No direct cash-for-goods transactions occur between users — all purchases are made using Swap Bucks.</p>
          <p>Real-money transactions occur only for: (a) Swapedly Plus membership subscriptions, (b) purchase credit purchases, and (c) transaction fees on completed trades.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>You must create an account to use most features of Swapedly. You agree to provide accurate, current, and complete information during registration and to keep your account information updated.</p>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must be at least 18 years old to create an account.</p>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.</p>
        </Section>

        <Section title="4. Swap Bucks">
          <p>Swap Bucks (SB) are a virtual currency with no cash value. They cannot be redeemed for real money, transferred between accounts, or used outside the Swapedly platform.</p>
          <p>Swap Bucks are earned through listing items, completing tasks, referring friends, sharing on social media, and other activities defined by Swapedly. Swapedly reserves the right to modify earning rates and Swap Buck values at any time.</p>
          <p>Swap Bucks are non-transferable and will be forfeited upon account termination.</p>
        </Section>

        <Section title="5. Listings and Transactions">
          <p>Users are solely responsible for the accuracy of their listings, including item descriptions, condition, images, and pricing. Misrepresenting an item is grounds for account suspension.</p>
          <p>When a transaction is completed, Swapedly charges a 10% transaction fee (capped at $20 USD) in real currency to both the buyer and seller separately. This fee is disclosed at the time of purchase.</p>
          <p>Swapedly is not responsible for disputes between buyers and sellers. We provide a dispute resolution process but make no guarantees of specific outcomes.</p>
        </Section>

        <Section title="6. Paid Services">
          <p>Swapedly offers optional paid services including Swapedly Plus membership ($9.99/month) and purchase credit packs. All payments are processed securely by Paddle, our authorized payment processor.</p>
          <p>By purchasing a paid service, you authorize us to charge your payment method for the stated amount. Subscriptions auto-renew monthly unless cancelled before the renewal date.</p>
          <p>Please see our <Link href="/refunds" className="text-primary hover:underline">Refund Policy</Link> for information on refunds and cancellations.</p>
        </Section>

        <Section title="7. Prohibited Conduct">
          <p>You may not use Swapedly to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>List counterfeit, stolen, illegal, or prohibited items</li>
            <li>Harass, threaten, or abuse other users</li>
            <li>Manipulate ratings, reviews, or Swap Buck balances</li>
            <li>Create multiple accounts to circumvent restrictions</li>
            <li>Use automated tools or bots without written permission</li>
            <li>Attempt to circumvent payment systems or fees</li>
            <li>Post false, misleading, or deceptive content</li>
          </ul>
        </Section>

        <Section title="8. Intellectual Property">
          <p>The Swapedly platform, including its design, logo, software, and content, is owned by Swapedly, Inc. and is protected by copyright and trademark laws. You may not reproduce, distribute, or create derivative works without our written permission.</p>
          <p>By posting content on Swapedly (including listing images and descriptions), you grant us a non-exclusive, royalty-free license to use, display, and distribute that content in connection with the Platform.</p>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <p>Swapedly is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>To the maximum extent permitted by law, Swapedly, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of data, profits, or goodwill.</p>
        </Section>

        <Section title="11. Governing Law">
          <p>These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Delaware.</p>
        </Section>

        <Section title="12. Contact Us">
          <p>If you have questions about these Terms, please contact us at <a href="mailto:legal@swapedly.com" className="text-primary hover:underline">legal@swapedly.com</a>.</p>
        </Section>
      </main>

      <footer className="py-8 px-4 border-t text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-primary">Home</Link>
          <Link href="/pricing" className="hover:text-primary">Pricing</Link>
          <Link href="/terms" className="hover:text-primary font-medium text-foreground">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/refunds" className="hover:text-primary">Refund Policy</Link>
        </div>
        <div className="mt-4"><PerplexityAttribution /></div>
      </footer>
    </div>
  );
}
