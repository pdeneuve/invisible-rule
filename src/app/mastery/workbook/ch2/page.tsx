'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveProgress } from '@/lib/mastery-progress';

export default function Chapter2() {
  const router = useRouter();
  const [tols, setTols] = useState(['', '', '']);
  const [iVersion, setIVersion] = useState(['', '', '']);
  const [respVersion, setRespVersion] = useState(['', '', '']);
  const [pattern, setPattern] = useState('');
  const [realMoment, setRealMoment] = useState({ what: '', otherDid: '', iDid: '', feltNotSaid: '' });
  const [bodyExp, setBodyExp] = useState({ felt: '', wantedTo: '', actuallyDid: '' });
  const [patternPurpose, setPatternPurpose] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('mastery_ch1_tolerations');
    if (saved) setTols(JSON.parse(saved));
  }, []);

  const updateArr = (setter: any, i: number, val: string) => {
    setter((prev: string[]) => { const n = [...prev]; n[i] = val; return n; });
  };

  const canContinue = iVersion.every(v => v.trim()) && respVersion.every(v => v.trim()) && pattern.trim() && patternPurpose.trim();

  const handleContinue = async () => {
    const ch2Data = { iVersion, respVersion, pattern, realMoment, bodyExp, patternPurpose };
    await saveProgress('ch2', ch2Data);
    router.push('/mastery/workbook/ch3');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white px-6 py-10 max-w-2xl mx-auto">
      <div className="flex gap-2 mb-10">
        {[1,2,3,4,5].map(n => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= 2 ? 'bg-amber-400' : 'bg-slate-700'}`} />
        ))}
      </div>
      <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-2">Chapter 2</p>
      <h1 className="text-3xl font-bold mb-4">Seeing Your Pattern Clearly</h1>

      <p className="text-slate-400 mb-8 leading-relaxed">
        Most people describe their tolerations by focusing on what someone else is doing. That keeps you stuck. Your power begins when you look at what you are doing in those same moments.
      </p>

      <div className="bg-slate-800/60 rounded-2xl p-6 mb-8 border border-slate-700/50">
        <p className="text-sm text-amber-300 font-semibold mb-1">Story â Michelle, 61</p>
        <p className="text-slate-300 text-sm leading-relaxed">
          Michelle wrote that her son spoke to her with disrespect. Then she remembered the last time it happened. He raised his voice, and she felt her body react. She wanted to say something, but she did not. She looked down, changed the subject, and stayed in the conversation. That was when she saw it â her toleration included what she did in that moment. She stayed silent. She allowed it to continue. When she saw that clearly, something changed. She felt power where she had felt stuck.
        </p>
      </div>

      <h2 className="text-xl font-semibold mb-4">Exercise: Rewrite Using "I"</h2>
      <p className="text-slate-400 mb-6">Go back to your three tolerations. Rewrite each one using the word "I." Take your time and let yourself be honest.</p>

      <div className="space-y-5 mb-10">
        {tols.map((t, i) => (
          <div key={i}>
            {t && <p className="text-slate-500 text-sm mb-1 italic">Original: {t}</p>}
            <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">Toleration {i+1} â using "I"</label>
            <textarea
              value={iVersion[i]}
              onChange={e => updateArr(setIVersion, i, e.target.value)}
              placeholder='Start with "I..."'
              rows={3}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-2">Go One Step Deeper</h2>
        <p className="text-slate-400 mb-6">Now rewrite each one as if you are taking full responsibility for what is happening and continuing. This is not about blame â it is about seeing the full truth of your participation.</p>
        <div className="space-y-5">
          {tols.map((_, i) => (
            <div key={i}>
              {iVersion[i] && <p className="text-slate-500 text-sm mb-1 italic">"I" version: {iVersion[i]}</p>}
              <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">Toleration {i+1} â full responsibility</label>
              <textarea
                value={respVersion[i]}
                onChange={e => updateArr(setRespVersion, i, e.target.value)}
                placeholder="Taking full responsibility..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-2">How I Move in My Life</h2>
        <div className="bg-slate-800/60 rounded-2xl p-6 mb-6 border border-slate-700/50">
          <p className="text-sm text-amber-300 font-semibold mb-1">Story â Elaine, 63</p>
          <p className="text-slate-300 text-sm leading-relaxed">Every time something felt off, Elaine told herself it was not worth bringing up. She adjusted her words and stayed where she was. Then one day she said something that surprised her: "I am the one leaving myself out."</p>
        </div>
        <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">Complete this sentence</label>
        <p className="text-slate-400 italic mb-3">"In my life, when something does not feel right, Iâ¦"</p>
        <textarea
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          placeholder="Be honest with yourself here..."
          rows={3}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-2">One Real Moment</h2>
        <p className="text-slate-400 mb-6">Think of one recent situation where one of your tolerations showed up. Choose something real and familiar.</p>
        <div className="space-y-4">
          {[
            { key: 'what', label: 'What happened?', ph: 'Describe the situation...' },
            { key: 'otherDid', label: 'What did the other person do?', ph: 'Their actions...' },
            { key: 'iDid', label: 'What did you do in that moment?', ph: 'Your response...' },
            { key: 'feltNotSaid', label: 'What did you feel but did not say?', ph: 'What stayed inside...' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">{label}</label>
              <textarea
                value={(realMoment as any)[key]}
                onChange={e => setRealMoment(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={ph}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-2">Your Inner Experience</h2>
        <p className="text-slate-400 mb-6">Look at that same moment from inside your body.</p>
        <div className="space-y-4">
          {[
            { key: 'felt', label: 'What did you feel in your body?', ph: 'Tightness, shallow breathing, knot in stomach...' },
            { key: 'wantedTo', label: 'What did you want to do?', ph: 'What your body was pulling you toward...' },
            { key: 'actuallyDid', label: 'What did you actually do instead?', ph: 'What you chose in the end...' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">{label}</label>
              <textarea
                value={(bodyExp as any)[key]}
                onChange={e => setBodyExp(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={ph}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h2 className="text-xl font-semibold mb-2">What My Pattern Is Trying to Do</h2>
        <div className="bg-slate-800/60 rounded-2xl p-6 mb-6 border border-slate-700/50">
          <p className="text-sm text-amber-300 font-semibold mb-1">Story â Carla, 66</p>
          <p className="text-slate-300 text-sm leading-relaxed">Carla noticed that every time she felt tension, she moved toward making things easier for everyone else. She agreed, smiled, and gave more, even when she felt tired. Then she saw what it was costing her. When she saw that clearly, she understood why nothing was changing.</p>
        </div>
        <p className="text-slate-400 italic mb-3">"The reason I do this may be because I am trying toâ¦"</p>
        <textarea
          value={patternPurpose}
          onChange={e => setPatternPurpose(e.target.value)}
          placeholder="Let yourself see it without judgment..."
          rows={3}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 mb-8">
        <p className="text-slate-400 text-sm italic leading-relaxed">
          You are not fixing anything yet. You are learning how to see clearly. And that is where real change begins.
        </p>
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${canContinue ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
      >
        Continue to Chapter 3 â
      </button>
      <a href="/mastery/workbook/ch1" className="block text-center text-slate-500 text-sm mt-4 hover:text-slate-400">â Back to Chapter 1</a>
    </div>
  );
}