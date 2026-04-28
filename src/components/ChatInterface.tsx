'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, SessionState, BopPhase } from '@/lib/types';
import MessageBubble from './MessageBubble';
import ProgressBar from './ProgressBar';
import LeadCaptureModal from './LeadCaptureModal';
import SafetyModal from './SafetyModal';

const PHASE_LABELS: Record<BopPhase, string> = {
  ORIENTATION: 'Getting Started',
  TOLERATIONS: 'Mapping Tolerations',
  TRANSLATION: 'Finding the Pattern',
  TRIUMPH: 'Your Strengths',
  FIRST_HOUSE: 'Origin Story',
  PATTERN_CODING: 'Coding the Pattern',
  BOP_HYPOTHESIS: 'Your Invisible Rule',
  OBSERVATION: 'Observation Period',
  COUNTER_STRATEGY: '30-Day Strategy',
  LEAD_CAPTURE: 'Your Report',
  REPORT: 'Complete',
};

const PHASE_ORDER: BopPhase[] = [
  'ORIENTATION', 'TOLERATIONS', 'TRANSLATION', 'TRIUMPH',
  'FIRST_HOUSE', 'PATTERN_CODING', 'BOP_HYPOTHESIS',
  'OBSERVATION', 'COUNTER_STRATEGY', 'LEAD_CAPTURE', 'REPORT'
];

const INITIAL_SESSION: SessionState = {
  phase: 'ORIENTATION',
  phaseProgress: 0,
  overallProgress: 0,
  messages: [],
  tolerations: [],
  repeatingThemes: [],
  firstHouseMemories: [],
  patternData: {
    threatThemes: [],
    emotionalSignals: [],
    adaptationMoves: [],
    protectedNeeds: [],
    coreBeliefs: [],
    memoryWeights: [],
  },
  workingHypothesis: '',
  confirmedHypothesis: '',
  detectedArchetype: null,
  confidenceScore: 0,
  observationLogs: [],
  leadCaptured: false,
  leadData: null,
  safetyTriggered: false,
  sessionId: uuidv4(),
};

export default function ChatInterface() {
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [session.messages]);

  const getOverallProgress = (phase: BopPhase): number => {
    const idx = PHASE_ORDER.indexOf(phase);
    return Math.round((idx / (PHASE_ORDER.length - 1)) * 100);
  };

  const streamAIResponse = useCallback(async (messages: Message[], currentSession: SessionState) => {
    setIsStreaming(true);

    const aiMessageId = uuidv4();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      phase: currentSession.phase,
    };

    setSession(prev => ({
      ...prev,
      messages: [...prev.messages, aiMessage],
    }));

    try {
      const response = await fetch('/api/bop-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          sessionState: currentSession,
        }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullContent += data.text;
                setSession(prev => ({
                  ...prev,
                  messages: prev.messages.map(m =>
                    m.id === aiMessageId ? { ...m, content: fullContent } : m
                  ),
                }));
              }
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }
      }

      if (
        fullContent.toLowerCase().includes('first name') &&
        fullContent.toLowerCase().includes('email') &&
        !currentSession.leadCaptured
      ) {
        setTimeout(() => setShowLeadCapture(true), 1500);
      }

      const distressPatterns = [
        /\b(8|9|10)\s*(?:out of|\/)\s*10/i,
        /i(?:'m| am) (overwhelmed|in crisis|not okay|falling apart)/i,
        /can(?:'t| not) (?:breathe|stop crying|do this)/i,
      ];
      const lastUserMessage = messages[messages.length - 1]?.content || '';
      if (distressPatterns.some(p => p.test(lastUserMessage))) {
        setShowSafety(true);
        setSession(prev => ({ ...prev, safetyTriggered: true }));
      }

    } catch (error) {
      console.error('Streaming error:', error);
      setSession(prev => ({
        ...prev,
        messages: prev.messages.map(m =>
          m.id === aiMessageId
            ? { ...m, content: "I'm sorry, something went wrong. Please try again." }
            : m
        ),
      }));
    } finally {
      setIsStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  const handleStart = async () => {
    setHasStarted(true);
    const welcomeMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: "Welcome. I'm glad you're here.\n\nThis process is called the Invisible Rule â and it's designed to help you find the unconscious pattern that's been running your life from behind the scenes.\n\nHere's how this works: I'll ask you one question at a time. There's no right or wrong answer â I'm just following the thread of what's true for you. We'll go at whatever pace feels right.\n\nBefore we begin â is there anything you want me to know about where you're at today, emotionally or otherwise?",
      timestamp: new Date(),
      phase: 'ORIENTATION',
    };
    setSession(prev => ({ ...prev, messages: [welcomeMessage] }));
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      phase: session.phase,
    };

    const newMessages = [...session.messages, userMessage];
    const newSession = { ...session, messages: newMessages };
    setSession(newSession);
    setInputValue('');

    await streamAIResponse(newMessages, newSession);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLeadSubmit = async (firstName: string, email: string) => {
    const transcript = session.messages
      .map(m => `${m.role === 'user' ? 'USER' : 'GUIDE'}: ${m.content}`)
      .join('\n\n');

    const leadData = {
      firstName,
      email,
      sessionId: session.sessionId,
      sessionTranscript: transcript,
      workingHypothesis: session.workingHypothesis,
      confirmedHypothesis: session.confirmedHypothesis,
      detectedArchetype: session.detectedArchetype || 'Pending analysis',
      tolerations: session.tolerations,
      patternData: session.patternData,
      completedAt: new Date().toISOString(),
    };

    await fetch('/api/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData),
    });

    setSession(prev => ({ ...prev, leadCaptured: true, leadData, phase: 'REPORT' }));
    setShowLeadCapture(false);

    const reportRes = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionState: session, version: 'A' }),
    });
    const { report } = await reportRes.json();

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bop_report_a', JSON.stringify(report));
      sessionStorage.setItem('bop_lead_data', JSON.stringify(leadData));
      window.location.href = '/report';
    }
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="w-16 h-16 bg-amber-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.346.346a2 2 0 01-2.828 0l-.346-.346a5 5 0 010-7.072z" />
              </svg>
            </div>
            <h1 className="text-4xl font-light text-white mb-4">The Invisible Rule</h1>
            <p className="text-xl text-slate-300 mb-2">Your unconscious operating system â made visible.</p>
            <p className="text-slate-400 mt-4 leading-relaxed">
              Most people spend their lives reacting to a rule they never chose and can&apos;t see.
              This process changes that.
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 mb-8 text-left">
            <h3 className="text-white font-medium mb-4">What to expect:</h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-amber-500 mt-1">â</span>
                <span>A guided conversation â one question at a time, no pressure</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-500 mt-1">â</span>
                <span>60â90 minutes to complete the full process</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-500 mt-1">â</span>
                <span>A free Core Insight Report at the end</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-amber-500 mt-1">â</span>
                <span>You can stop at any time â just say so</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-lg py-4 px-8 rounded-xl transition-all duration-200 hover:scale-105"
          >
            Begin the Process
          </button>
          <p className="text-slate-500 text-sm mt-4">
            This is pattern-mapping work, not therapy. If you are in crisis, please contact a mental health professional.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-slate-900 text-xs font-bold">IR</span>
          </div>
          <span className="text-white font-medium">The Invisible Rule</span>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs mb-1">{PHASE_LABELS[session.phase]}</div>
          <ProgressBar progress={getOverallProgress(session.phase)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl mx-auto w-full">
        {session.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-slate-400 text-sm ml-2 mt-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response..."
            disabled={isStreaming}
            rows={1}
            className="flex-1 bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            onInput={e => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !inputValue.trim()}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-medium px-6 py-3 rounded-xl transition-all duration-200 flex-shrink-0"
          >
            Send
          </button>
        </div>
        <p className="text-center text-slate-500 text-xs mt-2">Press Enter to send Â· Shift+Enter for new line</p>
      </div>

      {showLeadCapture && (
        <LeadCaptureModal
          onSubmit={handleLeadSubmit}
          onClose={() => setShowLeadCapture(false)}
        />
      )}

      {showSafety && (
        <SafetyModal onClose={() => setShowSafety(false)} />
      )}
    </div>
  );
}
