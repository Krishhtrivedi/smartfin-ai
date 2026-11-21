import React, { useState } from 'react';
import {
  Bot,
  Send,
  BookOpenCheck,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  CornerDownRight,
  Sparkles,
  HelpCircle,
  FileText,
  Clock,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  citation?: string;
  owner?: string;
  escalation?: string;
  timestamp: string;
}

export const VVPMSCChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Welcome to the VV-PMSC Internal SOP & Policy Assistant. You can ask me any question regarding firm rules, statutory notice procedures, GSTR/TDS checklists, PMS client onboarding guidelines, or office administration policies.',
      citation: 'VV-PMSC Internal Governance Manual (Rev 2026)',
      owner: 'Biraju Bhai / Pinal Shah / Nilesh Jain',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);

  const quickPrompts = [
    'What is our standard procedure for replying to a 148A notice?',
    'What are the mandatory checks before approving GSTR-1 and GSTR-3B?',
    'When does Section 194Q take priority over Section 206C(1H)?',
    'What is the SEBI minimum investment threshold for PMS client onboarding?',
    'What is the office leave policy and reimbursement timeline?',
    'How should unmatched bank receipts in suspense ledger be handled?'
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isQuerying) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsQuerying(true);

    try {
      const res = await api.querySOPAssistant(textToSend);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: res.answer,
        citation: res.citation,
        owner: res.designated_owner,
        escalation: res.escalation_path,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        sender: 'bot',
        text: `Unable to retrieve SOP verification: ${err.message}. Please consult Biraju Bhai or senior partner directly.`,
        citation: 'System Communication Exception',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1A2F46] p-6 rounded-xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E65909]/20 text-[#E65909] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#E65909]/40">
              Internal Staff Intelligence
            </span>
            <span className="text-xs font-mono text-slate-300">| Standard Operating Procedures & Compliance Policy</span>
          </div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#E65909]" />
            <span>VV-PMSC Internal SOP & Policy Assistant</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Codified internal knowledge base covering statutory notice protocols, SEBI PMS mandates, filing checklists, and office HR guidelines with source citations.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white/10 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-mono">
          <BookOpenCheck className="w-4 h-4 text-[#E65909]" />
          <div>
            <div className="text-[10px] text-slate-400">Knowledge Scope</div>
            <div className="font-bold">VV-PMSC Manual (Rev 2026)</div>
          </div>
        </div>
      </div>

      {/* Main Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chat Stream */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Chat Stream Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-navy-950 font-mono">Active Policy Assistant Session</span>
            </div>
            <button
              onClick={() => setMessages(messages.slice(0, 1))}
              className="text-[11px] font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Chat</span>
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed space-y-2 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#1A2F46] text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 pb-1 border-b border-current/10 text-[10px] opacity-75 font-mono">
                    <span className="font-bold">{msg.sender === 'user' ? 'Staff Query' : 'VV-PMSC SOP Assistant'}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.citation && (
                    <div className="pt-2 border-t border-slate-200/60 mt-2 space-y-1 text-[11px] font-mono">
                      <div className="flex items-center gap-1 text-[#E65909] font-bold">
                        <FileText className="w-3 h-3" />
                        <span>Citation: {msg.citation}</span>
                      </div>
                      {msg.owner && (
                        <div className="text-slate-600 flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <span>Designated Reviewer: <strong>{msg.owner}</strong></span>
                        </div>
                      )}
                      {msg.escalation && (
                        <div className="text-slate-500 text-[10px] italic">
                          ↳ {msg.escalation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isQuerying && (
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 p-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E65909]" />
                <span>Consulting internal SOP manuals and circulars...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about firm checklists, notice defense SOPs, SEBI rules, or office guidelines..."
                className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1A2F46] bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={isQuerying || !inputQuery.trim()}
                className="px-4 py-2.5 bg-[#1A2F46] hover:bg-[#0D2035] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-[#E65909]" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Quick Prompts & Knowledge Index */}
        <div className="lg:col-span-4 space-y-5">
          {/* Quick Prompts Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#E65909]" />
              <span>Standard Operational Inquiries</span>
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Click any quick prompt to immediately pull the approved SOP procedure and owner citation:
            </p>
            <div className="space-y-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  disabled={isQuerying}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-[#1A2F46] hover:bg-slate-50 transition-colors text-xs text-slate-700 flex items-start space-x-2 disabled:opacity-50"
                >
                  <CornerDownRight className="w-3.5 h-3.5 text-[#E65909] mt-0.5 flex-shrink-0" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Key Partner Contacts & Escalations Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Practice Escalation Matrix</span>
            </h3>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="font-bold text-navy-950">Biraju Bhai (birju@smartfin.ai)</div>
                <div className="text-[11px] text-slate-500">Statutory Tax Notices, 148A, Scrutiny & Litigation</div>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="font-bold text-navy-950">Pinal Shah (pinal@smartfin.ai)</div>
                <div className="text-[11px] text-slate-500">GST Filings, Audit Assurance & PMS Client Mandates</div>
              </div>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-0.5">
                <div className="font-bold text-navy-950">Nilesh Jain (nilesh@smartfin.ai)</div>
                <div className="text-[11px] text-slate-500">Banking Reconciliations, TDS 194Q & Operations</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
