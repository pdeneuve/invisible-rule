'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Chapter4() {
  const router = useRouter();
  const [ruleStatement, setRuleStatement] = useState('');
  const [ruleFear, setRuleFear] = useState('');
  const [bodyMoment, setBodyMoment] = useState({ what: '', bodyFelt: '', wantedTo: '', actuallyDid: '' });
  const [bodyAware, setBodyAware] = useState({ afraid: '', fromPast: '' });
  const [newResponse, setNewResponse] = useState('');
  const [newRule, setNewRule] = useState('');
  const [practiceScenario, setPracticeScenario] = useState({ situation: '', oldReaction: '', newResponse: '', wantToFeel: '' });
  const [letterToSelf, setLetterToSelf] = useState('');
  const [finalReflection, setFinalReflection] = useState({ seenNow: '', feelsPossible: '', willing: '' });

  const canContinue = ruleStatement.trim().length > 0 && newRule.trim().length > 0 && letterToSelf.trim().length > 0;

  const handleContinue = () => {
    localStorage.setItem('mastery_ch4', JSON.stringify({ ruleStatement, ruleFear, bodyMoment, bodyAware, newResponse, newRule, practiceScenario, letterToSelf, finalReflection }));
    router.push('/mastery/workbook/ch5');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white px-6 py-10 max-w-2xl mx-auto">
      <div className="flex gap-2 mb-10">
        {[1,2,3,4,5].map(n => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= 4 ? 'bg-amber-400' : 'bg-slate-700'}`} />
        ))}
      </div>
      <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-2">Chapter 4</p>
      <h1 className="text-3xl font-bold mb-4">Your Invisible Rule</h1>
      <p className="text-slate-400 mb-8 leading-relaxed">
        You have seen what you tolerate. You have seen how you respond. You have walked through your first house. Now something very important begins. We bring it all together — and then we begin to change it.
      </p>

      {/* Find Your Rule */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Find Your Rule</h2>
        <p className="text-slate-400 mb-6 leading-relaxed">
          Your life is not random. There is a pattern. And that pattern is being guided by one sentence. You may not have ever said it out loud. But you have been living it.
        </p>
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 mb-6">
          <p className="text-slate-300 text-sm italic">It may sound like: "I must stay small so I don't get hurt." Or "I must please others so I don't get rejected." Or "I must be perfect to be loved." There is no right answer. There is only what is true for you.</p>
        </div>
        <div className="space-y-5">
          <div>
            <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">"In order to be safe, loved, or accepted… I must…"</label>
            <textarea
              value={ruleStatement}
              onChange={e => setRuleStatement(e.target.value)}
              placeholder="Let this come from inside you..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">"If I don't ________, then ________ will happen."</label>
            <textarea
              value={ruleFear}
              onChange={e => setRuleFear(e.target.value)}
              placeholder="This one often reveals the fear..."
              rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>
        <div className="bg-slate-800/60 rounded-2xl p-5 mt-6 border border-amber-400/20">
          <p className="text-slate-300 text-sm leading-relaxed">
            This rule is not who you are. It is something you learned. A child created it. A child needed it. That child deserves compassion. But now you are an adult — and you have awareness. And awareness gives you choice.
          </p>
        </div>
      </div>

      {/* Teaching Your Body */}
      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Teaching Your Body It Is Safe</h2>
        <p className="text-slate-400 mb-6 leading-relaxed">
          Your mind can understand something in a second. But your body learns through experience. Even when you say "I can speak up now," your body may still feel fear. That does not mean you are doing it wrong. It means your body is remembering the past.
        </p>
        <p className="text-slate-400 mb-6">Think of a recent moment when you felt triggered. Not a big moment — just something real.</p>
        <div className="space-y-4">
          {[
            { f: 'what', label: 'What happened?', ph: 'Describe the moment simply...' },
            { f: 'bodyFelt', label: 'What did your body feel?', ph: 'Tight chest, shallow breathing, knot in stomach...' },
            { f: 'wantedTo', label: 'What did you want to do?', ph: 'Pull away, stay quiet, please, numb...' },
            { f: 'actuallyDid', label: 'What did you actually do?', ph: 'What you chose in the end...' },
          ].map(({ f, label, ph }) => (
            <div key={f}>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">{label}</label>
              <textarea
                value={(bodyMoment as any)[f]}
                onChange={e => setBodyMoment(prev => ({ ...prev, [f]: e.target.value }))}
                placeholder={ph}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">"What is my body afraid will happen right now?"</label>
            <textarea value={bodyAware.afraid} onChange={e => setBodyAware(p => ({ ...p, afraid: e.target.value }))} rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
          </div>
          <div>
            <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">"Is this happening right now — or is this from my past?"</label>
            <textarea value={bodyAware.fromPast} onChange={e => setBodyAware(p => ({ ...p, fromPast: e.target.value }))} rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
          </div>
          <div>
            <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">One small step I can take instead:</label>
            <textarea value={newResponse} onChange={e => setNewResponse(e.target.value)} rows={2}
              placeholder="Maybe say one sentence. Maybe stay present instead of pulling away..."
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* Creating New Rule */}
      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">Creating Your New Rule</h2>
        <p className="text-slate-400 mb-4">You cannot just replace it with positive thinking. Your new rule must come from truth — from who you are now, from what is actually possible in your life today.</p>
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 mb-6">
          <p className="text-slate-300 text-sm italic">Example — Old rule: "If I speak up, I will be rejected." New rule: "I can speak up and still be accepted by the right people." The new rule does not deny the fear. It gives you a new experience.</p>
        </div>
        <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">My new rule — "It is now safe for me to… / I am allowed to… / I can ________ and still be okay."</label>
        <textarea
          value={newRule}
          onChange={e => setNewRule(e.target.value)}
          placeholder="Write something real, not forced. It may feel unfamiliar — that is okay."
          rows={3}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      {/* Practice Scenario */}
      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">My First Practice Moment</h2>
        <p className="text-slate-400 mb-6">Think of a situation coming up in your life where you usually react in a certain way.</p>
        <div className="space-y-4">
          {[
            { f: 'situation', label: 'The situation I want to practice in:', ph: 'A conversation, relationship, or moment...' },
            { f: 'oldReaction', label: 'My old reaction would be:', ph: '' },
            { f: 'newResponse', label: 'My new response will be:', ph: '' },
            { f: 'wantToFeel', label: 'What I want to feel instead:', ph: '' },
          ].map(({ f, label, ph }) => (
            <div key={f}>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">{label}</label>
              <textarea
                value={(practiceScenario as any)[f]}
                onChange={e => setPracticeScenario(prev => ({ ...prev, [f]: e.target.value }))}
                placeholder={ph}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Letter to Self */}
      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-4">A Letter to Yourself</h2>
        <p className="text-slate-400 mb-4 leading-relaxed">
          Write a letter from who you are becoming. Speak to the part of you that has been struggling. Speak to the part of you that has been afraid. Speak to the part of you that has been trying so hard.
        </p>
        <p className="text-slate-400 mb-4 text-sm italic">Begin with "My dear…" — You might say: "I see now what I have been doing…" or "I forgive myself for…" or "I am ready to…"</p>
        <textarea
          value={letterToSelf}
          onChange={e => setLetterToSelf(e.target.value)}
          placeholder="My dear..."
          rows={8}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      <div className="bg-slate-800/40 rounded-xl p-5 border border-amber-400/20 mb-8">
        <p className="text-slate-300 text-sm leading-relaxed italic">
          Change does not come from pressure. It comes from awareness and from staying present. There will be moments when you forget. When that happens — do not judge yourself. Just notice. And choose again. You are not broken. You are not too late. You were living by a rule. And now you are free to write a new one.
        </p>
        <p className="text-amber-400 text-sm font-semibold mt-3">— Pamela</p>
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${canContinue ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
      >
        Continue to Chapter 5 →
      </button>
      <a href="/mastery/workbook/ch3" className="block text-center text-slate-500 text-sm mt-4 hover:text-slate-400">← Back to Chapter 3</a>
    </div>
  );
}