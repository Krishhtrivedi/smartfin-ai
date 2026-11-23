import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DocAnalysisSummary, DocAnalysisDetail } from '../types';
import {
  FileText, Upload, Sparkles, AlertCircle, CheckCircle2, MessageSquare,
  Search, RefreshCw, Send, ArrowRight, ShieldAlert, Layers, ChevronRight
} from 'lucide-react';

export const DocumentAnalyzer: React.FC = () => {
  const [analyses, setAnalyses] = useState<DocAnalysisSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DocAnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState('FINANCIAL_STATEMENT');

  // Grounded Chat State
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; message: string; timestamp: string }>>([]);

  const loadList = async () => {
    setLoading(true);
    try {
      const data = await api.listDocAnalyses();
      setAnalyses(data);
      if (data.length > 0 && !selectedDocId) {
        handleSelectDoc(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load document analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleSelectDoc = async (id: number) => {
    setSelectedDocId(id);
    try {
      const doc = await api.getDocAnalysis(id);
      setDetail(doc);
      setChatMessages(doc.chat_history || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a document file to analyze.');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_category', docCategory);

      const res = await api.uploadAndAnalyzeDoc(fd);
      alert(`Document '${file.name}' analyzed successfully.`);
      setFile(null);
      await loadList();
      if (res.id) {
        await handleSelectDoc(res.id);
      }
    } catch (err: any) {
      alert(`Document analysis failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedDocId || sendingChat) return;

    const query = chatInput.trim();
    setChatInput('');
    setSendingChat(true);

    const userMsg = { role: 'user' as const, message: query, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const res = await api.chatWithDoc(selectedDocId, query);
      const assistantMsg = { role: 'assistant' as const, message: res.reply, timestamp: new Date().toISOString() };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      alert(`Chat query failed: ${err.message}`);
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ECE9E3]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#E65909] font-bold">
              Cognitive Automation
            </span>
            <span className="text-[#8B97A3]">/</span>
            <span className="text-xs text-[#5D646C]">Multi-Format Financial & Statutory Parser</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A2F46] font-bold mt-1">
            AI Document Analyzer
          </h1>
          <p className="text-xs text-[#5D646C] mt-0.5">
            Extract figures, detect missing statutory disclosures, and chat in real-time with balance sheets, audit reports, and contracts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadList()}
            className="px-3 py-2 border border-[#C5CBD2] text-[#1A2F46] text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm">
        <form onSubmit={handleUpload} className="flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:w-auto">
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-[2px] file:border-0 file:text-xs file:font-semibold file:bg-[#1A2F46] file:text-white hover:file:bg-[#0D2035] cursor-pointer"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            >
              <option value="FINANCIAL_STATEMENT">Financial Statement / Balance Sheet</option>
              <option value="AUDIT_REPORT">Statutory Audit Report</option>
              <option value="GST_RETURN">GSTR Return / 2B Summary</option>
              <option value="TAX_NOTICE">Income Tax / GST Notice</option>
              <option value="CONTRACT_AGREEMENT">Legal Contract / Agreement</option>
              <option value="GENERAL">General Document</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full md:w-auto px-5 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{uploading ? 'Extracting & Parsing...' : 'Analyze Document'}</span>
          </button>
        </form>
      </div>

      {/* Main Content: Parsed Documents List (Left) + Document Insights & Chat (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document History */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A2F46]">
              Parsed Repositories ({analyses.length})
            </h2>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {analyses.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#C5CBD2] rounded-[3px]">
                <FileText className="w-6 h-6 text-[#8B97A3] mx-auto mb-2" />
                <p className="text-xs text-[#5D646C]">No documents analyzed yet. Upload a file above.</p>
              </div>
            ) : (
              analyses.map((doc) => {
                const isSelected = selectedDocId === doc.id;

                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className={`p-3.5 bg-white border rounded-[3px] cursor-pointer transition-all ${
                      isSelected ? 'border-[#E65909] ring-2 ring-[#E65909]/20 shadow-sm' : 'border-[#C5CBD2] hover:border-[#8B97A3]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F6F3EE] text-[#5D646C] font-bold">
                        {doc.file_type.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#8B97A3] font-mono">
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[#1A2F46] mt-2 line-clamp-1">{doc.filename}</h3>
                    <div className="text-[11px] text-[#5D646C] mt-0.5">
                      {doc.doc_category.replace(/_/g, ' ')}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#ECE9E3] flex items-center justify-between text-[10px] text-[#8B97A3] font-mono">
                      <span>{doc.figures_count} Extracted Figures</span>
                      {doc.missing_items_count > 0 ? (
                        <span className="text-rose-700 font-bold">{doc.missing_items_count} Missing Items</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Complete</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Document Analysis & Interactive Chat */}
        <div className="lg:col-span-8">
          {detail ? (
            <div className="space-y-4">
              {/* Document Overview Header */}
              <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#1A2F46] text-white">
                    {detail.doc_category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-[#8B97A3]">
                    Analyzed on {new Date(detail.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <h2 className="text-lg font-bold font-serif text-[#1A2F46] mt-1.5">
                  {detail.filename}
                </h2>
                {detail.summary && (
                  <p className="text-xs text-[#5D646C] mt-1 leading-relaxed">{detail.summary}</p>
                )}
              </div>

              {/* Extracted Figures Table */}
              <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm space-y-3">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A2F46]">
                  Extracted Financial Figures & Metrics ({detail.extracted_figures?.length || 0})
                </h3>

                {detail.extracted_figures && detail.extracted_figures.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F6F3EE] text-[#5D646C] font-mono uppercase text-[10px]">
                        <tr>
                          <th className="p-2 border border-[#C5CBD2]">Metric / Line Item</th>
                          <th className="p-2 border border-[#C5CBD2]">Extracted Value</th>
                          <th className="p-2 border border-[#C5CBD2]">Source Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECE9E3]">
                        {detail.extracted_figures.map((fig, idx) => (
                          <tr key={idx} className="hover:bg-[#F6F3EE]/50">
                            <td className="p-2 border border-[#C5CBD2] font-semibold text-[#1A2F46]">{fig.label}</td>
                            <td className="p-2 border border-[#C5CBD2] font-mono font-bold text-[#E65909]">{fig.value}</td>
                            <td className="p-2 border border-[#C5CBD2] font-mono text-[#8B97A3] text-[11px]">{fig.page_or_ref || 'Page 1'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-[#8B97A3]">No structured tabular figures detected in this file.</p>
                )}
              </div>

              {/* Missing Statutory Items & Risks */}
              {detail.missing_items && detail.missing_items.length > 0 && (
                <div className="p-4 bg-rose-50/50 rounded-[3px] border border-rose-200 space-y-2">
                  <div className="text-xs font-bold font-mono uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-700" />
                    Missing Disclosures & Compliance Gaps ({detail.missing_items.length})
                  </div>
                  <div className="space-y-1.5">
                    {detail.missing_items.map((item, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-rose-200 text-xs text-[#1A2F46]">
                        <div className="font-semibold text-rose-900">{item.item}</div>
                        {item.recommendation && (
                          <div className="text-[11px] text-[#5D646C] mt-0.5">{item.recommendation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grounded Document Chat Panel */}
              <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A2F46] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#E65909]" />
                    Grounded AI Query (Ask Document Anything)
                  </span>
                  <span className="text-[10px] text-[#8B97A3] font-mono">Answers cited strictly from parsed text</span>
                </div>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto p-3 bg-[#F6F3EE] rounded-[2px] border border-[#C5CBD2]">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#8B97A3]">
                      Ask questions like: "What is the net profit for FY26?", "Are there any contingent liabilities listed?", or "Summarize the auditor's key remarks."
                    </div>
                  ) : (
                    chatMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-[2px] text-xs max-w-[85%] ${
                          m.role === 'user'
                            ? 'ml-auto bg-[#1A2F46] text-white'
                            : 'bg-white text-[#1A2F46] border border-[#C5CBD2]'
                        }`}
                      >
                        <div className="text-[10px] opacity-70 mb-0.5 font-mono uppercase">
                          {m.role === 'user' ? 'You' : 'Document Assistant'}
                        </div>
                        <div className="leading-relaxed whitespace-pre-wrap">{m.message}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about this document..."
                    className="flex-1 px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || sendingChat}
                    className="px-4 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingChat ? 'Querying...' : 'Ask'}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-[#C5CBD2] rounded-[3px]">
              <p className="text-xs text-[#5D646C]">Select an analyzed document from the left to view parsed metrics and chat.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
