'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function WeeklyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [week, setWeek] = useState(1);
  const [goals, setGoals] = useState<string[]>(['', '', '']);
  const [form, setForm] = useState({
    date: '',
    goal: '',
    stuck: '',
    challenges: '',
    fears: '',
    opportunities: '',
    actionsCommitted: '',
    actionsTaken: '',
    learned: '',
    nextActions: ''
  });
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const savedGoals = localStorage.getItem('mastery_goals');
    const savedWeek = localStorage.getItem('mastery_week');
    if (savedGoals) {
      const g = JSON.parse(savedGoals);
      setGoals(g);
      setForm(f => ({ ...f, goal: g[0] || '', date: new Date().toLocaleDateString() }));
    }
    if (savedWeek) setWeek(parseInt(savedWeek) || 1);
  }, []);

  const updateForm = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const askPamela = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/mastery-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week, goals, form, email })
      });
      const data = await res.json();
      setAiQuestion(data.question || 'What is one thing you are avoiding this week?');
    } catch {
      setAiQuestion('What is the one thing that would make the biggest difference this week?');
    }
    setAiLoading(false);
  };

  const handleSubmit = () => {
    const entries = JSON.parse(localStorage.getItem('mastery_entries') || '[]');
    entries.push({ week, form, email, timestamp: new Date().toISOString() });
    localStorage.setItem('mastery_entries', JSON.stringify(entries));
    localStorage.setItem('mastery_week', String(week + 1));
    setSubmitted(true);
  };

  const goToNextWeek = () => {
    const nextWeek = week + 1;
    setWeek(nextWeek);
    setForm({
      date: new Date().toLocaleDateString(),
      goal: goals[0] || '',
      stuck: '', challenges: '', fears: '', opportunities: '',
      actionsCommitted: '', actionsTaken: '', learned: '', nextActions: ''
    });
    setAiQuestion('');
    setSubmitted(false);
    window.scrollTo(0, 0);
  };

  const fields: { key: string; label: string; placeholder: string }[] = [
    { key: 'goal', label: 'Goal', placeholder: 'Which of your 3 goals are you focusing on this week?' },
    { key: 'stuck', label: 'Where am I stuck', placeholder: 'Be honest. Where are you not moving?' },
    { key: 'challenges', label: 'Challenges', placeholder: 'What challenges came up this week?' },
    { key: 'fears', label: 'Fears', placeholder: 'What fears are showing up?' },
    { key: 'opportunities', label: 'Opportunities', placeholder: 'What opportunities do you see right now?' },
    { key: 'actionsCommitted', label: 'Actions committed this week', placeholder: 'What did you say you would do?' },
    { key: 'actionsTaken', label: 'Actions taken this week', placeholder: 'What did you actually do?' },
    { key: 'learned', label: 'What did I learn', placeholder: 'What did this week teach you?' },
    { key: 'nextActions', label: 'Actions I commit to next week', placeholder: 'One clear action you will take next week.' },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">✨</div>
          <h2 className="text-3xl font-light text-white mb-4">Week {week} Complete</h2>
          <p className="text-slate-400 mb-8">You showed up. That is the work.</p>
          {week < 26 ? (
            <button
              onClick={goToNextWeek}
              className="w-full py-4 rounded-2xl text-slate-900 font-semibold text-base mb-4"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}
            >
              Continue to Week {week + 1} →
            </button>
          ) : (
            <div className="bg-amber-500/20 rounded-2xl p-6 border border-amber-500/40">
              <p className="text-amber-400 font-semibold text-lg mb-2">You completed all 26 weeks.</p>
              <p className="text-slate-300 text-sm">Your transformation is real.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-light text-white">Week {week} of 26</h1>
          <span className="text-amber-400 text-sm">{Math.round((week / 26) * 100)}%</span>
        </div>
        <div className="w-full h-1 bg-slate-700 rounded-full mb-6">
          <div
            className="h-1 rounded-full transition-all duration-500"
            style={{ width: (week / 26 * 100) + '%', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
          />
        </div>

        {goals.filter(g => g).length > 0 && (
          <div className="bg-slate-800/60 rounded-xl p-4 mb-6 border border-slate-700">
            <p className="text-amber-400 text-xs uppercase tracking-widest mb-2">Your 3 Goals</p>
            {goals.filter(g => g).map((g, i) => (
              <p key={i} className="text-slate-300 text-sm mb-1">• {g}</p>
            ))}
          </div>
        )}

        <div className="bg-slate-800/60 rounded-xl p-4 mb-6 border border-amber-500/30">
          <p className="text-amber-400 text-xs uppercase tracking-widest mb-2">Pamela AI Coach</p>
          {aiQuestion ? (
            <p className="text-white text-sm italic">"{aiQuestion}"</p>
          ) : (
            <p className="text-slate-400 text-sm">Ask Pamela for a coaching question to start your reflection.</p>
          )}
          <button
            onClick={askPamela}
            disabled={aiLoading}
            className="mt-3 text-amber-400 text-sm hover:text-amber-300 transition-colors disabled:opacity-50"
          >
            {aiLoading ? 'Pamela is thinking...' : '✨ Ask Pamela'}
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-amber-400 text-xs uppercase tracking-widest mb-2 block">Date</label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-amber-500/60 focus:outline-none"
              value={form.date}
              onChange={e => updateForm('date', e.target.value)}
            />
          </div>
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-amber-400 text-xs uppercase tracking-widest mb-2 block">{label}</label>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-sm placeholder-slate-500 focus:border-amber-500/60 focus:outline-none resize-none"
                rows={3}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => updateForm(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl text-slate-900 font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}
        >
          Complete Week {week} ✓
        </button>
      </div>
    </div>
  );
}

export default function WeeklyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <WeeklyContent />
    </Suspense>
  );
}