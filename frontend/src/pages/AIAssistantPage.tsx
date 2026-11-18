import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Sparkles,
  Send,
  ShieldAlert,
  FileText,
  Loader2,
  Receipt,
  Landmark,
  Building2,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { AIChatMessage } from '../types';

export const AIAssistantPage: React.FC<{ onNavigateTab: (tab: any) => void }> = ({ onNavigateTab }) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Welcome to SmartFin AI Assistant! I am connected to your live financial database, GSTR-2B feeds, and banking ledger. Ask me any question regarding receivables, vendor payables, tax mismatches, or BRS items.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggested_actions: [
        'Show all pending vendor payments',
        'What are the unmatched bank transactions?',
        'Generate this month’s GST reconciliation summary',
        'Which customers have outstanding balances?',
        'Check TDS short deductions and deposit deadlines',
        'Show monthly expenses'
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const prompt = queryText || input;
    if (!prompt.trim() || isLoading) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.askAI(prompt);
      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources,
        suggested_actions: res.suggested_actions,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error retrieving financial intelligence: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-navy-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-blue-400 flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
              SmartFin AI Financial Co-Pilot
              <span className="text-[10px] bg-brand-500/30 text-brand-200 px-2 py-0.5 rounded font-mono border border-brand-400/30">
                Live Data Connected
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              Auditor-grade natural language queries with verified database record citations
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-300">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Strict Guardrails: Advisory only. No autonomous write execution.</span>
        </div>
      </div>

      {/* Messages Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center space-x-1.5 mb-1 px-1">
              {m.role === 'assistant' ? (
                <>
                  <Bot className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-800">SmartFin AI</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-800">You (Accountant)</span>
                  <User className="w-4 h-4 text-slate-500" />
                </>
              )}
              <span className="text-[10px] text-slate-400">{m.timestamp}</span>
            </div>

            <div
              className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] shadow-xs ${
                m.role === 'user'
                  ? 'bg-navy-900 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Source Records Citations */}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Verified Source Data Records:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {m.sources.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                        <span className="truncate font-medium">{s.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follow-ups */}
              {m.suggested_actions && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                  {m.suggested_actions.map((act, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(act)}
                      className="text-[11px] bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1 rounded-lg border border-brand-200 font-semibold transition-colors flex items-center space-x-1"
                    >
                      <span>{act}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2.5 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
            <span>SmartFin AI is cross-referencing ledger tables & calculating discrepancies...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about pending vendor payments, bank BRS, GST ITC mismatch, or TDS deadlines..."
            className="flex-1 text-xs sm:text-sm px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/70"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
