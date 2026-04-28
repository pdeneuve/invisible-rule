interface Props {
  onClose: () => void;
}

export default function SafetyModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-slate-800 border border-amber-500/30 rounded-2xl max-w-lg w-full p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/40 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-amber-400 text-2xl">â</span>
          </div>
          <h2 className="text-xl font-light text-white mb-2">Let&apos;s slow down for a moment</h2>
        </div>

        <div className="text-slate-300 leading-relaxed space-y-4 mb-6">
          <p>Your nervous system is responding to something real right now.</p>
          <p>Before we continue â can you do something simple?</p>
          <div className="bg-slate-700/50 rounded-xl p-4 space-y-2">
            <p>Look around the room you&apos;re in. Name <strong className="text-white">three things</strong> you can see.</p>
            <p>Name <strong className="text-white">two things</strong> you can physically feel right now.</p>
            <p>Take <strong className="text-white">one slow breath</strong> â just one â and let it out slowly.</p>
          </div>
          <p className="text-slate-400 text-sm">You are here. You are now. You are safe in this moment.</p>
        </div>

        <div className="bg-slate-700/30 rounded-xl p-4 mb-6 text-sm text-slate-400">
          <p className="font-medium text-slate-300 mb-2">If you need support right now:</p>
          <p>Crisis Text Line: Text <strong className="text-white">HOME</strong> to <strong className="text-white">741741</strong></p>
          <p>988 Suicide &amp; Crisis Lifeline: Call or text <strong className="text-white">988</strong></p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-xl transition-colors"
        >
          I&apos;m okay â continue the process
        </button>
      </div>
    </div>
  );
}
