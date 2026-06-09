'use client';

import { useState } from 'react';

const TIER_NAMES: Record<number, string> = {
  1: 'First Light — $7',
  2: 'The Deep Dive — $97',
};

interface Props {
  onSubmit: (firstName: string, email: string) => void;
  onClose: () => void;
  tier?: 1 | 2;
}

export default function LeadCaptureModal({ onSubmit, onClose, tier }: Props) {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) {
      setError('Please enter both your name and email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    await onSubmit(firstName.trim(), email.trim());
  };

  // Decide messaging based on tier
  const isFree = !tier;
  const isFirstLight = tier === 1;
  const isDeepDive = tier === 2;

  let headline = 'Almost there';
  let subtext = '';
  let buttonText = 'Continue';
  let bullets: string[] = [];

  if (isFree) {
    subtext = 'Enter your name and email. Your full Deep Dive will arrive in your inbox within 10 to 15 minutes.';
    buttonText = 'Send My Deep Dive';
    bullets = [
      'Your written Invisible Rule report',
      'A personalized podcast in Pamela\'s voice',
      'A cinematic video walking you through your pattern',
      'A branded slide deck of your key insights',
    ];
  } else if (isFirstLight) {
    subtext = 'Enter your name and email. After payment, your First Light report will arrive in your inbox within 10 to 15 minutes.';
    buttonText = 'Continue to Payment';
    bullets = [
      'Your Invisible Rule, stated clearly',
      'The one core insight that changes everything',
      'Delivered to your inbox',
    ];
  } else if (isDeepDive) {
    subtext = 'Enter your name and email. After payment, your full Deep Dive will arrive in your inbox within 10 to 15 minutes.';
    buttonText = 'Continue to Payment';
    bullets = [
      'Your full multi-section Invisible Rule report',
      'A personalized podcast in Pamela\'s voice',
      'A cinematic video walking you through your pattern',
      'A branded slide deck of your key insights',
    ];
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-light text-white mb-2">{headline}</h2>
          {tier && (
            <div className="inline-block bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1 mb-2">
              <span className="text-amber-400 text-sm font-medium">{TIER_NAMES[tier]}</span>
            </div>
          )}
          <p className="text-slate-400 leading-relaxed">{subtext}</p>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">What you receive</p>
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-amber-400 mt-0.5">&#10003;</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm mb-2">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Your first name"
              className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-semibold py-4 rounded-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
          >
            {isSubmitting ? 'Preparing your report...' : buttonText}
          </button>
          <p className="text-center text-slate-500 text-xs">
            No spam. No selling your data.
          </p>
        </form>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
