'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function Chapter1Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tols, setTols] = useState(['', '', '']);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const nameParam = searchParams.get('name') || '';
    const emailParam = searchParams.get('email') || '';
    if (nameParam) setUserName(nameParam);
    if (emailParam) setUserEmail(emailParam);
    // Save to localStorage so all chapters can access it
    if (nameParam) localStorage.setItem('mastery_user_name', nameParam);
    if (emailParam) localStorage.setItem('mastery_user_email', emailParam);
  }, [searchParams]);

  const update = (i: number, val: string) => {
    const next = [...tols]; next[i] = val; setTols(next);
  };

  const canContinue = tols.every(t => t.trim().length > 0);

  const handleContinue = () => {
    localStorage.setItem('mastery_ch1_tolerations', JSON.stringify(tols));
    router.push('/mastery/workbook/ch2');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white px-6 py-10 max-w-2xl mx-auto">
      <div className="flex gap-2 mb-10">
        {[1,2,3,4,5].map(n => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n === 1 ? 'bg-amber-400' : 'bg-slate-700'}`} />
        ))}
      </div>

      {userName && (
        <p className="text-amber-400 text-sm mb-4">Welcome, {userName}. Let's begin your workbook.</p>
      )}

      <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-2">Chapter 1</p>
      <h1 className="text-3xl font-bold mb-4">Your Three Tolerations</h1>

      <div className="bg-slate-800/60 rounded-2xl p-6 mb-8 border border-slate-700/50">
        <p className="text-slate-300 leading-relaxed mb-4">
          A toleration is not just something that bothers you for a moment. It is something that drains you, hurts you, or does not feel right — and you keep allowing it to stay in your life.
        </p>
        <p className="text-slate-300 leading-relaxed mb-4">
          Over time, you stop questioning it. You adjust to it, and you build your life around it.
        </p>
        <div className="border-l-4 border-amber-400 pl-4 mt-4">
          <p className="text-sm text-amber-300 font-semibold mb-1">Story – Linda, 63</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Linda would have told you her life was fine. One evening at dinner she was sharing something that mattered to her. Her partner nodded, but he never looked up. She felt something drop inside her — a feeling she had known for years. It was the feeling of not being seen. Later that night she realised: this moment had been happening for years.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-2">Now Look at Your Life</h2>
      <p className="text-slate-400 mb-6 leading-relaxed">
        Not the version that sounds reasonable. Not the explanation you give others. The truth. Write three things in your life right now that do not feel right. Do not explain them. Do not soften them.
      </p>

      <div className="space-y-5">
        {['Toleration 1', 'Toleration 2', 'Toleration 3'].map((label, i) => (
          <div key={i}>
            <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">{label}</label>
            <textarea
              value={tols[i]}
              onChange={e => update(i, e.target.value)}
              placeholder="Write honestly — do not soften this..."
              rows={3}
              className={`w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors`}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
        <p className="text-slate-400 text-sm italic leading-relaxed">
          Now read what you wrote. Do not move past this quickly. Stay here for a moment and let yourself feel what is there.
        </p>
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className={`mt-8 w-full py-4 rounded-2xl font-bold text-lg transition-all ${canContinue ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
      >
        Continue to Chapter 2 →
      </button>

      <a href="/mastery" className="block text-center text-slate-500 text-sm mt-4 hover:text-slate-400">← Back to Mastery home</a>
    </div>
  );
}

export default function Chapter1() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <Chapter1Content />
    </Suspense>
  );
}
