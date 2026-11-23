import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  ShieldAlert,
  FileText,
  Loader2,
  Compass
} from 'lucide-react';
import { api } from '../../services/api';
import { AIChatMessage } from '../../types';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Welcome to SmartFin AI by Vichar Vimarsh. I am connected directly to your purchase register, GSTR-2B data, ledger accounts, and bank feeds. How may I assist your financial systems and reconciliation today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggested_actions: [
        'Show all pending vendor payments',
        'What are the unmatched bank transactions?',
        'Generate this month’s GST reconciliation summary',
        'Which customers have outstanding balances?',
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.askAI(query);
      const aiMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: response.sources,
        suggested_actions: response.suggested_actions,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an issue retrieving the ledger facts: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-[#0D2035]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-[#131C2E] shadow-2xl border-l border-[#C5CBD2] dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-[#364452] flex items-center justify-between bg-[#0D2035] blueprint-grid-navy-deep text-white">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-[3px] bg-[#1A2F46] border border-[#E65909]/60 flex items-center justify-center text-[#E65909]">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-display font-bold text-sm tracking-tight text-white uppercase">
                    SmartFin AI
                  </span>
                  <span className="text-[9px] font-mono bg-[#E65909] text-white px-1 py-0.2 rounded-[2px] uppercase">
                    V—V
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[#8B97A3]">
                  Grounded Financial Intelligence Copilot
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#8B97A3] hover:text-white hover:bg-[#1A2F46] rounded-[3px] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Compliance & Safety Banner */}
          <div className="px-4 py-2 bg-[#F6F3EE] dark:bg-[#1A253A] border-b border-[#C5CBD2] dark:border-slate-800 flex items-center space-x-2 text-[11px] font-mono text-[#4A545D] dark:text-slate-300">
            <ShieldAlert className="w-4 h-4 text-[#E65909] flex-shrink-0" />
            <span>Advisory Mode: Modifications & tax filings require human approval.</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F6F3EE]/40 dark:bg-[#0B1120]/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  {msg.role === 'assistant' ? (
                    <>
                      <Bot className="w-3.5 h-3.5 text-[#E65909]" />
                      <span className="text-[11px] font-display font-semibold text-[#1A2F46] dark:text-slate-200">SmartFin AI</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-display font-semibold text-[#1A2F46] dark:text-slate-200">You</span>
                      <User className="w-3.5 h-3.5 text-[#5D646C] dark:text-slate-400" />
                    </>
                  )}
                  <span className="text-[10px] font-mono text-[#8B97A3] dark:text-slate-400">{msg.timestamp}</span>
                </div>

                <div
                  className={`p-3.5 rounded-[3px] text-xs leading-relaxed max-w-[90%] shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-[#1A2F46] text-white border border-white/10'
                      : 'bg-white dark:bg-[#1A253A] border border-[#C5CBD2] dark:border-slate-800 text-[#171E25] dark:text-slate-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Sources Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#ECE9E3] dark:border-slate-800">
                      <p className="text-[10px] font-mono font-bold text-[#E65909] uppercase tracking-wider mb-1.5">
                        Verified Source Records:
                      </p>
                      <div className="space-y-1">
                        {msg.sources.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-1.5 bg-[#F6F3EE] dark:bg-[#0B1120] px-2 py-1 rounded-[2px] border border-[#C5CBD2] dark:border-slate-800 text-[11px] font-mono text-[#4A545D] dark:text-slate-300"
                          >
                            <FileText className="w-3 h-3 text-[#E65909] flex-shrink-0" />
                            <span className="truncate">{s.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Suggested Prompts */}
                  {msg.suggested_actions && (
                    <div className="mt-3 pt-2 border-t border-[#ECE9E3] dark:border-slate-800 flex flex-wrap gap-1.5">
                      {msg.suggested_actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(act)}
                          className="text-[10px] font-mono bg-[#ECE9E3] dark:bg-[#0B1120] text-[#1A2F46] dark:text-slate-200 hover:bg-[#E65909] hover:text-white dark:hover:bg-[#E65909] px-2 py-1 rounded-[2px] border border-[#C5CBD2] dark:border-slate-800 transition-colors text-left"
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-xs font-mono text-[#5D646C] dark:text-slate-400 p-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#E65909]" />
                <span>Interrogating SQL ledger records & reconciling...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white dark:bg-[#131C2E] border-t border-[#C5CBD2] dark:border-slate-800">
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
                placeholder="Ask about invoices, GST mismatch, vendor ledgers..."
                className="flex-1 text-xs px-3.5 py-2.5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-700 focus:outline-none focus:border-[#E65909] bg-[#F6F3EE] dark:bg-[#0F172A] text-[#171E25] dark:text-slate-100 placeholder-[#8B97A3] dark:placeholder-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="btn-signal p-2.5 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
