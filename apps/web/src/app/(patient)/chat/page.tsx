'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, AlertTriangle } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { PatientNav } from '../../../components/patient/PatientNav';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');

  // Create or load session
  const { data: sessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/chat/sessions').then(r => r.data.data),
  });

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      setSessionId(sessions[0].id);
    }
  }, [sessions]);

  const { data: session } = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => api.get(`/chat/sessions/${sessionId}`).then(r => r.data.data),
    enabled: !!sessionId,
  });

  const createSessionMutation = useMutation({
    mutationFn: () => api.post('/chat/sessions'),
    onSuccess: (res) => {
      setSessionId(res.data.data.sessionId);
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) =>
      api.post(`/chat/sessions/${sessionId}/messages`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
      setInput('');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  function handleSend() {
    const msg = input.trim();
    if (!msg || sendMessageMutation.isPending) return;
    if (!sessionId) {
      createSessionMutation.mutate(undefined, {
        onSuccess: () => setTimeout(() => sendMessageMutation.mutate(msg), 500),
      });
    } else {
      sendMessageMutation.mutate(msg);
    }
  }

  const messages: Message[] = session?.messages || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PatientNav />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">SwellnessIQ Assistant</h1>
            <p className="text-xs text-slate-400">Health education support</p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            SwellnessIQ Assistant provides education only — not medical advice.
            For urgent symptoms, call <strong>911</strong> or your care team.
          </p>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-8">
          {!sessionId && (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-700 mb-2">Ask SwellnessIQ Assistant</h2>
              <p className="text-slate-400 mb-6">Get answers about your recovery, medications, and care plan.</p>
              <button
                onClick={() => createSessionMutation.mutate()}
                className="btn-primary"
              >
                Start a conversation
              </button>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ASSISTANT' && (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === 'USER'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>

              {msg.role === 'USER' && (
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
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

      {/* Input */}
      <div className="bg-white border-t border-slate-100 p-4 pb-safe">
        <div className="max-w-lg mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask a question about your recovery..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-slate-800"
            disabled={!sessionId && !createSessionMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="btn-primary px-4 min-w-0"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
