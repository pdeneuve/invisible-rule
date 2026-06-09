'use client';

import { useState } from 'react';

interface Props {
  onSelectTier: (tier: 1 | 2) => void;
}

// Tier 3 (Mastery) is not yet built. Set to true once the /mastery flow is
// production-ready AND a NEXT_PUBLIC_GHL_URL_TIER3 is configured.
const TIER_3_AVAILABLE = false;

const ALL_TIERS = [
  {
    id: 1 as const,
    name: 'First Light',
    price: '$7',
    tagline: 'See your Invisible Rule for the first time',
    description: 'The moment of recognition - your unconscious pattern named, clearly and simply.',
    includes: [
      'Your Invisible Rule statement',
      'The one core insight that changes everything',
      'Delivered instantly by email',
    ],
    cta: 'Get First Light',
    featured: false,
    color: 'border-slate-700',
    badge: null,
  },
  {
    id: 2 as const,
    name: 'The Deep Dive',
    price: '$97',
    tagline: 'Hear it. Read it. Feel it. Share it.',
    description: 'Your full report - plus a personalized audio podcast, slide deck, and video walking you through your own pattern.',
    includes: [
      'Full multi-section Core Insight Report',
      'Personalized audio podcast in Pamela\'s voice',
      'Branded slide deck of your key insights',
      'Personalized video narration',
      'Shareable link to your complete profile',
      'All assets delivered to your inbox',
    ],
    cta: 'Get The Deep Dive',
    featured: true,
    color: 'border-amber-500/60',
    badge: 'Most Powerful',
  },
  {
    id: 3,
    name: 'Invisible Rule Mastery',
    price: '$297',
    tagline: 'Stop living by your old rule. Begin your new one.',
    description: 'A 26-week AI coaching and accountability program. Weekly check-ins, Pamela AI on demand, and 3 personal goals to transform how you live.',
    includes: [
      '26-week guided workbook path',
      'Pamela AI coaching on demand',
      'Weekly accountability check-ins',
      'Every 4-week deep reflection',
      '3 personal goals from your tolerations',
      'Support while you practice living differently',
    ],
    cta: 'Begin Tier 3 Mastery',
    featured: false,
    color: 'border-amber-400/40',
    badge: 'New',
  },
];

const TIERS = TIER_3_AVAILABLE ? ALL_TIERS : ALL_TIERS.filter(t => t.id !== 3);

export default function PricingScreen({ onSelectTier }: Props) {
  const [selecting, setSelecting] = useState<number | null>(null);

  const handleSelect = (tierId: number) => {
    if (selecting !== null) return; // anti-double-click guard
    if (tierId !== 1 && tierId !== 2) return; // tier 3 not yet wired
    setSelecting(tierId);
    onSelectTier(tierId);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">

      <div className="text-center mb-10 max-w-2xl">
        <div className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)' }}>
          <span className="text-slate-900 font-bold text-sm">IR</span>
        </div>
        <h1 className="text-3xl font-light text-white mb-3 tracking-tight">
          You did real work today.
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          Your Invisible Rule has been mapped. Choose how deeply you want to receive it.
        </p>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`relative flex flex-col rounded-2xl border ${tier.color} p-7 transition-all duration-200 ${
              tier.featured
                ? 'bg-gradient-to-b from-amber-950/30 to-slate-900'
                : 'bg-slate-900/60'
            }`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {tier.badge}
                </span>
              </div>
            )}

            <div className="mb-5">
              <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${tier.featured ? 'text-amber-400' : 'text-slate-500'}`}>
                {tier.name}
              </p>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-4xl font-light text-white">{tier.price}</span>
              </div>
              <p className="text-slate-300 text-sm font-medium leading-snug">{tier.tagline}</p>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {tier.description}
            </p>

            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.includes.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span className={`mt-0.5 flex-shrink-0 ${tier.featured ? 'text-amber-400' : 'text-slate-500'}`}>&#10003;</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelect(tier.id)}
              disabled={selecting !== null}
              className={`w-full py-4 rounded-xl font-semibold text-base transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                tier.featured
                  ? 'text-slate-900 hover:scale-105 active:scale-95'
                  : 'text-white border border-slate-600 hover:border-slate-400 hover:bg-slate-800'
              }`}
              style={tier.featured ? {
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)',
              } : {}}
            >
              {selecting === tier.id ? 'Loading...' : tier.cta}
            </button>
          </div>
        ))}
      </div>

      <p className="text-slate-600 text-xs mt-8 text-center">
        Secure payment. Instant delivery. No subscriptions.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="text-slate-700 hover:text-slate-500 text-xs mt-4 transition-colors"
      >
        Start a new session
      </button>
    </div>
  );
}
