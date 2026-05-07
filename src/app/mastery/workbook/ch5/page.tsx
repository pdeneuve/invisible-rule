'use client';
import { useState, useEffect } from 'react';
import { saveProgress } from '@/lib/mastery-progress';
import { useRouter } from 'next/navigation';

type Goal = { statement: string; why: string; lifeFeeling: string };
const emptyGoal = (): Goal => ({ statement: '', why: '', lifeFeeling: '' });

export default function Chapter5() {
  const router = useRouter();
  const [tols, setTols] = useState(['', '', '']);
  const [changed, setChanged] = useState([{ look: '', feel: '' }, { look: '', feel: '' }, { look: '', feel: '' }]);
  const [goals, setGoals] = useState([emptyGoal(), emptyGoal(), emptyGoal()]);
  const [commitment, setCommitment] = useState({ willing: '', uncomfortable: '', noGoBack: '' });
  const [finalReflection, setFinalReflection] = useState({ mostImportant: '', mostReady: '', whatItMeans: '' });

  useEffect(() => {
    const saved = localStorage.getItem('mastery_ch1_tolerations');
    if (saved) setTols(JSON.parse(saved));
  }, []);

  const updateChanged = (i: number, field: 'look' | 'feel', val: string) => {
    setChanged(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: val }; return n; });
  };
  const updateGoal = (i: number, field: keyof Goal, val: string) => {
    setGoals(prev => { const n = [...prev]; n[i] = { ...n[i], [field]: val }; return n; });
  };

  const canContinue = goals.every(g => g.statement.trim().length > 0) && commitment.willing.trim().length > 0;

  const handleContinue = async () => {
    const allGoals = goals.map(g => g.statement);
    localStorage.setItem('mastery_goals', JSON.stringify(allGoals));
    const ch5Data = { changed, goals, commitment, finalReflection };
    await saveProgress('ch5', ch5Data);
    await saveProgress('goals', allGoals);
    router.push('/mastery/weekly');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white px-6 py-10 max-w-2xl mx-auto">
      <div className="flex gap-2 mb-10">
        {[1,2,3,4,5].map(n => (
          <div key={n} className={`h-1 flex-1 rounded-full bg-amber-400`} />
        ))}
      </div>
      <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-2">Chapter 5</p>
      <h1 className="text-3xl font-bold mb-4">Turning Your Tolerations Into Goals</h1>
      <p className="text-slate-400 mb-8 leading-relaxed">
        Take a breath before you begin this part. You are not just writing anymore. You are deciding what you want your life to look like. You are taking what you have been tolerating and choosing something different.
      </p>

      {/* Step 1: Come back to tolerations */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Step 1: Come Back to Your Tolerations</h2>
        <p className="text-slate-400 mb-4">These are not just situations. These are patterns you have been living with. Read them again slowly â and let them feel real.</p>
        <div className="space-y-3">
          {tols.map((t, i) => (
            <div key={i} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-1">Toleration {i+1}</p>
              <p className="text-slate-300">{t || '(not yet written)'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Step 2: Fully changed */}
      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Step 2: If This Were Fully Changed</h2>
        <p className="text-slate-400 mb-6">Imagine each toleration is completely different. Not improved a little â fully changed.</p>
        <div className="space-y-6">
          {tols.map((t, i) => (
            <div key={i} className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/30">
              <p className="text-slate-500 text-sm italic mb-3">Toleration {i+1}: {t}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-1">Toleration {i+1} fully changed would look like:</label>
                  <textarea value={changed[i].look} onChange={e => updateChanged(i, 'look', e.target.value)} rows={2}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
                </div>
                <div>
                  <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-1">How I would feel if this changed:</label>
                  <textarea value={changed[i].feel} onChange={e => updateChanged(i, 'feel', e.target.value)} rows={2}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 3: Goals */}
      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Step 3: Your 3 Goals for the Next 26 Weeks</h2>
        <p className="text-slate-400 mb-6">Turn each toleration into a clear goal. Write it in a way that reflects how you want to live â not what you want to avoid. You are choosing to change how you show up.</p>
        <div className="space-y-6">
          {[0,1,2].map(i => (
            <div key={i} className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/30">
              <p className="text-amber-400 text-sm font-bold mb-3">Goal {i+1}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">Goal {i+1} statement:</label>
                  <textarea value={goals[i].statement} onChange={e => updateGoal(i, 'statement', e.target.value)} rows={2}
                    placeholder="Write the goal in positive, present-tense language..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">Why this goal matters to me:</label>
                  <textarea value={goals[i].why} onChange={e => updateGoal(i, 'why', e.target.value)} rows={2}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
                </div>
                <div>
                  <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">How my life will feel different when I live this:</label>
                  <textarea value={goals[i].lifeFeeling} onChange={e => updateGoal(i, 'lifeFeeling', e.target.value)} rows={2}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 mt-6">
          <p className="text-slate-400 text-sm italic">These are not small changes. These are shifts in how you live your life.</p>
        </div>
      </div>

      {/* Commitment */}
      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Stay With This Commitment</h2>
        <p className="text-slate-400 mb-6">Sit with what you wrote. You may feel excitement. You may feel fear. You may feel doubt. All of that is normal. You are stepping into something new.</p>
        <div className="space-y-4">
          {[
            { f: 'willing', label: 'For the next 26 weeks, I am willing to:', ph: '' },
            { f: 'uncomfortable', label: 'Even when it feels uncomfortable, I will:', ph: '' },
            { f: 'noGoBack', label: 'The one thing I do not want to go back to is:', ph: '' },
          ].map(({ f, label, ph }) => (
            <div key={f}>
              <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-1">{label}</label>
              <textarea value={(commitment as any)[f]} onChange={e => setCommitment(p => ({ ...p, [f]: e.target.value }))}
                placeholder={ph} rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Final reflection */}
      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Final Reflection</h2>
        <div className="space-y-4">
          {[
            { f: 'mostImportant', label: 'What feels most important about the goals I chose:' },
            { f: 'mostReady', label: 'What I am most ready to change:' },
            { f: 'whatItMeans', label: 'What it would mean to me to follow through on this:' },
          ].map(({ f, label }) => (
            <div key={f}>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">{label}</label>
              <textarea value={(finalReflection as any)[f]} onChange={e => setFinalReflection(p => ({ ...p, [f]: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-2xl p-5 border border-amber-400/30 mb-8">
        <p className="text-amber-400 font-semibold text-sm mb-2">You are ready.</p>
        <p className="text-slate-300 text-sm leading-relaxed">
          Not because everything is perfect. But because you can see, you can feel, and you are willing. Now we create a structure that helps you stay accountable, week by week, as you begin to live this new way.
        </p>
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${canContinue ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
      >
        Begin My Weekly Accountability â
      </button>
      <a href="/mastery/workbook/ch4" className="block text-center text-slate-500 text-sm mt-4 hover:text-slate-400">â Back to Chapter 4</a>
    </div>
  );
}