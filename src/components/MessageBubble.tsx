import { Message } from '@/lib/types';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 bg-amber-500 rounded-full flex-shrink-0 mr-3 mt-1 flex items-center justify-center">
          <span className="text-slate-900 text-xs font-bold">IR</span>
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-4 ${
          isUser
            ? 'bg-slate-600 text-white rounded-tr-sm'
            : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
          {message.content}
        </div>
        <div className={`text-xs mt-2 ${isUser ? 'text-slate-400' : 'text-slate-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
