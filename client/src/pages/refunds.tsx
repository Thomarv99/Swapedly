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

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-4xl font-bold mb-2">Refund Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: April 10, 2026</p>

        <Section title="Overview">
          <p>At Swapedly, we want you to be satisfied with your purchase. This Refund Policy explains when and how refunds are issued for paid services on our Platform. All payments are processed by Paddle, our authorized Merchant of Record.</p>
        </Section>

        <Section title="1. Swapedly Plus Membership">
          <p><strong>Free cancellation:</strong> You may cancel your Swapedly Plus membership at any time through your account Settings page. Your membership benefits will remain active until the end of your current billing period.</p>
          <p><strong>Refunds for the current period:</strong> If you cancel within 48 hours of your initial subscription or most recent renewal charge, you may request a full refund of that charge. To request a refund, contact us at <a href="mailto:support@swapedly.com" className="text-primary hover:underline">support@swapedly.com</a> within 48 hours of the charge.</p>
          <p><strong>No partial refunds:</strong> We do not issue partial refunds for unused portions of a billing period beyond the 48-hour window.</p>
          <p><strong>Auto-renewal:</strong> Subscriptions automatically renew monthly. You will receive an email reminder before each renewal. Cancel before the renewal date to avoid being charged for the next period.</p>
        </Section>

        <Section title="2. Purchase Credits">
          <p><strong>Non-refundable once used:</strong> Listing credits that have been used to publish a listing are non-refundable.</p>
          <p><strong>Unused credits:</strong> If you have unused purchase credits and wish to request a refund within 30 days of purchase, contact us at <a href="mailto:support@swapedly.com" className="text-primary hover:underline">support@swapedly.com</a>. Refunds for unused credits are issued at our discretion.</p>
          <p><strong>Upgrading to Plus:</strong> If you purchase purchase credits and then upgrade to Swapedly Plus, your unused credits will remain in your account and can still be used. We do not automatically refund purchase credits upon upgrading.</p>
        </Section>

        <Section title="3. Transaction Fees">
          <p>The 10% transaction fee charged to buyers and sellers upon completed trades is non-refundable once a transaction is marked as complete.</p>
          <p>If a transaction is cancelled or disputed before completion, transaction fees will be reversed as appropriate based on the outcome of the dispute resolution process.</p>
        </Section>

        <Section title="4. Swap Bucks">
          <p>Swap Bucks are a virtual currency with no monetary value and are non-refundable under any circumstances. Swap Bucks earned through the Platform cannot be converted to cash or redeemed for a refund.</p>
        </Section>

        <Section title="5. How to Request a Refund">
          <p>To request a refund, please contact our support team at <a href="mailto:support@swapedly.com" className="text-primary hover:underline">support@swapedly.com</a> with:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Your account email address</li>
            <li>The date of the charge</li>
            <li>The amount charged</li>
            <li>The reason for your refund request</li>
          </ul>
          <p>We will respond to refund requests within 3-5 business days. Approved refunds are processed within 5-10 business days and will appear on your original payment method.</p>
        </Section>

        <Section title="6. Chargebacks">
          <p>If you initiate a chargeback with your bank or credit card company without first contacting us, we reserve the right to suspend your account pending investigation. We encourage you to contact us first — we are committed to resolving issues fairly and promptly.</p>
        </Section>

        <Section title="7. Changes to This Policy">
          <p>We may update this Refund Policy from time to time. We will notify you of significant changes by posting the updated policy on this page. Continued use of the Platform after changes constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="8. Contact Us">
          <p>For questions about this Refund Policy or to request a refund, contact us at:</p>
          <ul className="list-none space-y-1 pl-2">
            <li>Email: <a href="mailto:support@swapedly.com" className="text-primary hover:underline">support@swapedly.com</a></li>
            <li>Website: <Link href="/" className="text-primary hover:underline">swapedly.com</Link></li>
          </ul>
        </Section>
      </main>

      <footer className="py-8 px-4 border-t text-center text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-primary">Home</Link>
          <Link href="/pricing" className="hover:text-primary">Pricing</Link>
          <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          <Link href="/refunds" className="hover:text-primary font-medium text-foreground">Refund Policy</Link>
        </div>
        <div className="mt-4"><PerplexityAttribution /></div>
      </footer>
    </div>
  );
}
