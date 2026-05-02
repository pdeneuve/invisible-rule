import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy — The Invisible Rule',
  description: 'How The Invisible Rule handles your session data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Privacy
        </p>
        <h1 className="text-3xl font-light text-white mb-2 tracking-tight">
          Your session is private.
        </h1>
        <p className="text-slate-400 text-sm mb-10">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
        </p>

        <Section title="The short version">
          We do not sell or share your data. Your voice session is used only to map
          your Invisible Rule and deliver your report. We use a small number of
          specialist providers to make the product work; that is it.
        </Section>

        <Section title="What we collect">
          <ul className="space-y-2 list-disc pl-5">
            <li>The audio of your voice session and the transcript generated from it.</li>
            <li>The first name and email address you provide to receive your report.</li>
            <li>Payment information processed by Stripe (we never see your card number).</li>
            <li>Basic technical data your browser sends — IP, user agent, page views.</li>
          </ul>
        </Section>

        <Section title="How we use it">
          <ul className="space-y-2 list-disc pl-5">
            <li>To run your voice session and generate your personalized report.</li>
            <li>To email your report and any follow-up nurture you opted in to.</li>
            <li>To process your payment and send a receipt.</li>
            <li>To improve the product in aggregate (we do not study individual sessions for marketing).</li>
          </ul>
        </Section>

        <Section title="Who processes your data">
          <ul className="space-y-2 list-disc pl-5">
            <li><strong className="text-slate-200">VAPI</strong> — handles the live voice call.</li>
            <li><strong className="text-slate-200">Anthropic</strong> — generates the analysis from your transcript.</li>
            <li><strong className="text-slate-200">Resend</strong> — sends your report email.</li>
            <li><strong className="text-slate-200">GoHighLevel</strong> — manages our email list and nurture.</li>
            <li><strong className="text-slate-200">Stripe</strong> — processes payment.</li>
            <li><strong className="text-slate-200">Vercel</strong> — hosts the application.</li>
          </ul>
        </Section>

        <Section title="What we do not do">
          <ul className="space-y-2 list-disc pl-5">
            <li>We do not sell your data to anyone, ever.</li>
            <li>We do not share your transcript or report with third parties beyond the processors above.</li>
            <li>We do not use your session content to train public AI models.</li>
          </ul>
        </Section>

        <Section title="Retention &amp; your rights">
          You can request a copy of your data, correction, or deletion at any time
          by emailing the address below. We will respond within a reasonable
          window. We retain session transcripts and reports as long as needed to
          deliver and support your purchase, then remove them on request.
        </Section>

        <Section title="Contact">
          For any privacy questions or requests, write to{' '}
          <a href="mailto:pamela@theinvisiblerule.com" className="text-amber-400 hover:text-amber-300 underline">
            pamela@theinvisiblerule.com
          </a>.
        </Section>

        <div className="mt-12">
          <Link href="/" className="text-amber-400 text-sm hover:text-amber-300 underline">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
        {title}
      </h2>
      <div className="text-slate-300 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}
