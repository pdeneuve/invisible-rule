'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function GoalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [step, setStep] = useState(1);
  const [tolerations, setTolerations] = useState(['', '', '']);
  const [iStatements, setIStatements] = useState(['', '', '']);
  const [responsibility, setResponsibility] = useState(['', '', '']);
  const [goals, setGoals] = useState(['', '', '']);

  const updateItem = (arr: string[], setArr: (v: string[]) => void, idx: number, val: string) => {
    const copy = [...arr];
    copy[idx] = val;
    setArr(copy);
  };

  const handleContinue = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      localStorage.setItem('mastery_goals', JSON.stringify(goals));
      localStorage.setItem('mastery_email', email);
      localStorage.setItem('mastery_week', '1');
      router.push('/mastery/weekly' + (email ? '?email=' + encodeURIComponent(email) : ''));
    }
  };

  const stepTitles = [
    'Step 1: My 3 Tolerations',
    'Step 2: Rewrite with "I"',
    'Step 3: Take Full Responsibility',
    'Step 4: Turn Into 6-Month Goals',
  ];

  const stepDescriptions = [
    'What are the 3 things you have been tolerating in your life? Write them honestly.',
    'Rewrite each toleration starting with the word "I" — make it personal.',
    'Rewrite each statement taking full responsibility. No blame, no excuses.',
    'Turn each into a clear 6-month goal. Start with "By [date], I will..."',
  ];

  const arrays: [string[], (v: string[]) => void] = step === 1
    ? [tolerations, setTolerations]
    : step === 2
    ? [iStatements, setIStatements]
    : step === 3
    ? [responsibility, setResponsibility]
    : [goals, setGoals];

  const placeholders = step === 1
    ? ['e.g. I tolerate not being heard in my relationship', 'e.g. I tolerate a job that drains me', 'e.g. I tolerate not having time for myself']
    : step === 2
    ? ['e.g. I stay silent when I want to speak up', 'e.g. I choose to stay in work that drains me', 'e.g. I put everyone else before myself']
    : step === 3
    ? ['e.g. I am responsible for not asking for what I need', 'e.g. I am responsible for staying where I am not growing', 'e.g. I am responsible for abandoning myself']
    : ['e.g. By Nov 2026, I will ask for what I need in my relationship', 'e.g. By Nov 2026, I will be in work that energizes me', 'e.g. By Nov 2026, I will have 3 hours weekly just for me'];

  const [currentArr, currentSet] = arrays;
  const canContinue = currentArr.every(v => v.trim().length > 0);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full"
              style={{ background: s <= step ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : '#334155' }}
            />
          ))}
        </div>

        <h2 className="text-2xl font-light text-white mb-2">{stepTitles[step - 1]}</h2>
        <p className="text-slate-400 text-sm mb-6">{stepDescriptions[step - 1]}</p>

        <div className="space-y-4 mb-8">
          {[0, 1, 2].map(i => (
            <div key={i}>
              <label className="text-amber-400 text-xs uppercase tracking-widest mb-2 block">
                {step === 4 ? 'Goal' : 'Toleration'} {i + 1}
              </label>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-sm placeholder-slate-500 focus:border-amber-500/60 focus:outline-none resize-none"
                rows={3}
                placeholder={placeholders[i]}
                value={currentArr[i]}
                onChange={e => updateItem(currentArr, currentSet, i, e.target.value)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full py-4 rounded-2xl text-slate-900 font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            boxShadow: canContinue ? '0 8px 32px rgba(245,158,11,0.3)' : 'none'
          }}
        >
          {step < 4 ? 'Continue →' : 'Begin My Weekly Journey →'}
        </button>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <GoalsContent />
    </Suspense>
  );
}