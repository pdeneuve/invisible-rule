'use client';
import { useState } from 'react';
import { saveProgress } from '@/lib/mastery-progress';
import { useRouter } from 'next/navigation';

type RoomData = { see: string; who: string; feeling: string; bodyFeel: string };
const emptyRoom = (): RoomData => ({ see: '', who: '', feeling: '', bodyFeel: '' });

export default function Chapter3() {
  const router = useRouter();
  const [intro, setIntro] = useState('');
  const [rooms, setRooms] = useState({
    kitchen: emptyRoom(),
    livingRoom: emptyRoom(),
    bedroom: emptyRoom(),
    dinnerTable: emptyRoom(),
    play: emptyRoom(),
  });
  const [climate, setClimate] = useState({ mostTime: '', whenWrong: '', whenCalm: '', safeFeel: '' });
  const [mother, setMother] = useState({ withHer: '', comfort: '', upset: '', feel: '' });
  const [father, setFather] = useState({ withHim: '', respond: '', needed: '', feel: '' });
  const [goodMoments, setGoodMoments] = useState('');
  const [hardMoments, setHardMoments] = useState('');
  const [learned, setLearned] = useState({ was: '', whenWrong: '', needed: '', safe: '' });

  const updateRoom = (room: keyof typeof rooms, field: keyof RoomData, val: string) => {
    setRooms(prev => ({ ...prev, [room]: { ...prev[room], [field]: val } }));
  };

  const canContinue = intro.trim().length > 0 && learned.was.trim().length > 0;

  const handleContinue = async () => {
    const ch3Data = { intro, rooms, climate, mother, father, goodMoments, hardMoments, learned };
    await saveProgress('ch3', ch3Data);
    router.push('/mastery/workbook/ch4');
  };

  const RoomSection = ({ title, roomKey, desc }: { title: string; roomKey: keyof typeof rooms; desc: string }) => (
    <div className="border-t border-slate-700 pt-8 mb-8">
      <h3 className="text-lg font-semibold text-amber-400 mb-2">{title}</h3>
      <p className="text-slate-400 text-sm mb-5">{desc}</p>
      <div className="space-y-4">
        {([
          { f: 'see', label: 'What do you see around you?', ph: 'Let the image come to you...' },
          { f: 'who', label: 'Who is there?', ph: 'Who is present in this space...' },
          { f: 'feeling', label: 'What is the feeling in this space most of the time?', ph: 'The emotional tone...' },
          { f: 'bodyFeel', label: 'How does your body feel when you are here?', ph: 'Relaxed, tight, careful, free...' },
        ] as { f: keyof RoomData; label: string; ph: string }[]).map(({ f, label, ph }) => (
          <div key={f}>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">{label}</label>
            <textarea
              value={rooms[roomKey][f]}
              onChange={e => updateRoom(roomKey, f, e.target.value)}
              placeholder={ph}
              rows={2}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white px-6 py-10 max-w-2xl mx-auto">
      <div className="flex gap-2 mb-10">
        {[1,2,3,4,5].map(n => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= 3 ? 'bg-amber-400' : 'bg-slate-700'}`} />
        ))}
      </div>
      <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-2">Chapter 3</p>
      <h1 className="text-3xl font-bold mb-4">Your First House</h1>
      <p className="text-slate-400 mb-4 leading-relaxed">
        What you learned there did not stay there. It came with you into your life today.
      </p>
      <p className="text-slate-400 mb-8 leading-relaxed">
        Before you begin â slow down. You are not remembering your childhood the way you tell a story. You are stepping back into it as the child you were. You are not analyzing. You are noticing.
      </p>

      <div className="bg-slate-800/60 rounded-2xl p-6 mb-8 border border-slate-700/50">
        <p className="text-sm text-amber-300 font-semibold mb-1">Story â Angela, 66</p>
        <p className="text-slate-300 text-sm leading-relaxed">
          Angela thought her childhood was normal. When she went back into her house, she saw the kitchen first. Her mother was moving quickly. Angela stood there, wanting to say something, but she could feel it was not the right moment. Then the living room â her father in his chair, the room felt serious. She knew not to interrupt. Room by room, she felt something she had not allowed herself to feel before. She had learned to watch. She had learned to wait. She had learned to stay small.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Enter the House</h2>
        <p className="text-slate-400 mb-4 leading-relaxed">
          Picture yourself at seven years old. You are standing somewhere inside your first house. Look around slowly.
        </p>
        <label className="text-amber-400 text-xs font-bold tracking-widest uppercase block mb-2">Where are you right now? What do you see? What does the space feel like?</label>
        <textarea
          value={intro}
          onChange={e => setIntro(e.target.value)}
          placeholder="Let the house come to you. Do not force it..."
          rows={4}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
        />
      </div>

      <RoomSection title="The Kitchen" roomKey="kitchen" desc="Go into the kitchen as your younger self. Look around and notice what is happening there." />
      <RoomSection title="The Living Room" roomKey="livingRoom" desc="Walk into the living room. This is where people often gathered." />
      <RoomSection title="Your Bedroom" roomKey="bedroom" desc="Go into your bedroom. This is where you slept and where you were alone." />
      <RoomSection title="The Dinner Table" roomKey="dinnerTable" desc="Sit at the table as your younger self. This is an important place." />
      <RoomSection title="Where You Played" roomKey="play" desc="Go to the place where you spent time playing â inside or outside." />

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">The Feeling of the House</h3>
        <p className="text-slate-400 text-sm mb-5">Not what it looked like. What it felt like to live there.</p>
        <div className="space-y-4">
          {[
            { f: 'mostTime', label: 'What was the feeling in the house most of the time?', ph: '' },
            { f: 'whenWrong', label: 'What did it feel like when something went wrong?', ph: '' },
            { f: 'whenCalm', label: 'What did it feel like when things were calm?', ph: '' },
            { f: 'safeFeel', label: 'Did you feel safe, or did you feel like you had to watch what was happening?', ph: '' },
          ].map(({ f, label }) => (
            <div key={f}>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">{label}</label>
              <textarea
                value={(climate as any)[f]}
                onChange={e => setClimate(prev => ({ ...prev, [f]: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Time With Your Mother</h3>
        <div className="space-y-4">
          {[
            { f: 'withHer', label: 'What was it like to be with her?' },
            { f: 'comfort', label: 'When you needed comfort, how did she respond?' },
            { f: 'upset', label: 'When you were upset, what happened?' },
            { f: 'feel', label: 'How did you feel around her most of the time?' },
          ].map(({ f, label }) => (
            <div key={f}>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">{label}</label>
              <textarea
                value={(mother as any)[f]}
                onChange={e => setMother(prev => ({ ...prev, [f]: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Time With Your Father</h3>
        <div className="space-y-4">
          {[
            { f: 'withHim', label: 'What was it like to be with him?' },
            { f: 'respond', label: 'How did he respond to you?' },
            { f: 'needed', label: 'When you needed something, what happened?' },
            { f: 'feel', label: 'How did you feel around him?' },
          ].map(({ f, label }) => (
            <div key={f}>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">{label}</label>
              <textarea
                value={(father as any)[f]}
                onChange={e => setFather(prev => ({ ...prev, [f]: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Moments That Stayed With You</h3>
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">Moments that felt warm or special â who was there, how did you feel?</label>
            <textarea value={goodMoments} onChange={e => setGoodMoments(e.target.value)} rows={3}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">Moments that felt confusing, scary, or not good â what happened, how did you feel?</label>
            <textarea value={hardMoments} onChange={e => setHardMoments(e.target.value)} rows={3}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors" />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-8 mb-8">
        <h3 className="text-lg font-semibold text-amber-400 mb-4">Who You Became</h3>
        <p className="text-slate-400 text-sm mb-5">You were a child in that house trying to understand your world. You learned how to respond to what was happening around you.</p>
        <div className="space-y-4">
          {[
            { f: 'was', label: 'As a child in this house, I learned to be:', ph: '' },
            { f: 'whenWrong', label: 'When something did not feel right, I:', ph: '' },
            { f: 'needed', label: 'When I needed something, I:', ph: '' },
            { f: 'safe', label: 'To feel safe, I:', ph: '' },
          ].map(({ f, label }) => (
            <div key={f}>
              <label className="text-slate-400 text-xs font-semibold uppercase tracking-widest block mb-1">{label}</label>
              <textarea
                value={(learned as any)[f]}
                onChange={e => setLearned(prev => ({ ...prev, [f]: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 mb-8">
        <p className="text-slate-400 text-sm italic leading-relaxed">
          You are not in that house anymore. But now you can see how it shaped you. And that is where your power begins.
        </p>
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${canContinue ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
      >
        Continue to Chapter 4 â
      </button>
      <a href="/mastery/workbook/ch2" className="block text-center text-slate-500 text-sm mt-4 hover:text-slate-400">â Back to Chapter 2</a>
    </div>
  );
}