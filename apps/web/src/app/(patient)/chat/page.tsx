'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, AlertTriangle } from 'lucide-react';
import { api } from '../../../lib/api';
import { PatientNav } from '../../../components/patient/PatientNav';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');

  // Load existing session
  const { data: sessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/chat/sessions').then(r => r.data.data),
  });

  useEffect(() => {
    if (sessions && sessions.length > 0 && !sessionId) {
      setSessionId(sessions[0].id);
    }
  }, [sessions, sessionId]);

  const { data: session } = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => api.get(`/chat/sessions/${sessionId}`).then(r => r.data.data),
    enabled: !!sessionId,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => api.post('/chat/sessions'),
    onSuccess: (res) => {
      const newId = res.data.data.sessionId || res.data.data.id;
      setSessionId(newId);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      return newId;
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ sid, message }: { sid: string; message: string }) =>
      api.post(`/chat/sessions/${sid}/messages`, { message }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['chat-session', vars.sid] });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, sendMessageMutation.isPending]);

  // Auto-resize textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  async function handleSend() {
    const msg = input.trim();
    if (!msg || sendMessageMutation.isPending) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let sid = sessionId;
    if (!sid) {
      const res = await createSessionMutation.mutateAsync();
      sid = (res as any).data?.data?.sessionId || (res as any).data?.data?.id || sessionId;
      // Give state time to update
      await new Promise(r => setTimeout(r, 100));
      sid = sid || sessionId;
    }
    if (sid) {
      sendMessageMutation.mutate({ sid, message: msg });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const messages: Message[] = session?.messages || [];

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      <PatientNav />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">SwellnessIQ Assistant</h1>
            <p className="text-xs text-slate-400">Health education support · not medical advice</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="max-w-lg mx-auto w-full px-4 pt-3 shrink-0">
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            For urgent symptoms call <strong>911</strong> or your care team — this assistant provides education only.
          </p>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-4">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-cyan-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-700 mb-1">Ask me anything</h2>
              <p className="text-slate-400 text-sm mb-6">Questions about your recovery, medications, or care plan.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'What should I watch for with heart failure?',
                  'Why do I need to weigh myself daily?',
                  'What does my medication do?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                    className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:border-cyan-300 hover:text-cyan-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ASSISTANT' && (
                <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'USER'
                  ? 'bg-cyan-600 text-white rounded-tr-sm'
                  : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-card'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'USER' && (
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-card">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-lg mx-auto flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your question… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none text-slate-800 text-sm placeholder:text-slate-400 resize-none leading-relaxed transition"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            aria-label="Message"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="w-11 h-11 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-colors shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-300 mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
