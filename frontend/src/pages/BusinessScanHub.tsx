import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BusinessScanItem } from '../types';
import {
  Compass, Plus, RefreshCw, Share2, CheckCircle2, AlertTriangle, FileText,
  BarChart3, ShieldCheck, ArrowRight, Copy, ExternalLink, Calculator, Send
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

const DOMAINS = [
  { key: 'finance', label: 'Financial Controls & MIS', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  { key: 'hr', label: 'People & HR Governance', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
  { key: 'sales_marketing', label: 'Sales & Revenue Engine', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
  { key: 'operations', label: 'Process & Supply Chain', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' },
  { key: 'strategy', label: 'Business Strategy & Moat', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-300' },
  { key: 'management', label: 'Leadership & Delegation', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-300' },
  { key: 'technology', label: 'ERP & Cyber Security', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-300' },
];

export const BusinessScanHub: React.FC = () => {
  const [scans, setScans] = useState<BusinessScanItem[]>([]);
  const [selectedScan, setSelectedScan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('Manufacturing / Industrial');
  const [turnover, setTurnover] = useState('10Cr - 50Cr');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getBusinessScans();
      setScans(data);
      if (data.length > 0 && !selectedScan) {
        handleSelectScan(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load business scans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectScan = async (id: number) => {
    try {
      const res = await api.getBusinessScanDetails(String(id));
      setSelectedScan(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createBusinessScan({
        company_name: companyName,
        contact_person: contactPerson || undefined,
        email: email || undefined,
        phone: phone || undefined,
        industry,
        annual_turnover: turnover
      });
      setCreateModalOpen(false);
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      await loadData();
      if (res.id) {
        await handleSelectScan(res.id);
      }
    } catch (err: any) {
      alert(`Creation failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCalculateScores = async (scanId: number) => {
    setCalculating(true);
    try {
      const res = await api.calculateBusinessScanScores(scanId);
      alert(`Diagnostic evaluation complete! Overall Score: ${res.overall_health_score}/100`);
      await handleSelectScan(scanId);
      const list = await api.getBusinessScans();
      setScans(list);
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setCalculating(false);
    }
  };

  const copyShareLink = (token: string) => {
    const fullUrl = `${window.location.origin}/business-scan/view/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleUpdateAnswerScore = async (questionKey: string, score: number, currentText: string) => {
    if (!selectedScan) return;
    try {
      await api.submitBusinessScanAnswer(selectedScan.scan.id, {
        question_key: questionKey,
        answer_text: currentText || 'Score updated by consultant',
        score_impact: score
      });
      await handleSelectScan(selectedScan.scan.id);
    } catch (err: any) {
      alert(`Failed to update score: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ECE9E3] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#E65909] font-bold">
              Strategic Advisory & Diagnostics
            </span>
            <span className="text-[#8B97A3]">/</span>
            <span className="text-xs text-[#5D646C] dark:text-slate-400">Vichar Vimarsh 7-Domain Business Scan</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A2F46] dark:text-slate-100 font-bold mt-1">
            Business Scan Diagnostic Hub
          </h1>
          <p className="text-xs text-[#5D646C] dark:text-slate-400 mt-0.5">
            Conduct 360° health assessments across Finance, HR, Sales, Ops, Strategy, Management, and Technology with missing document auditing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 text-[#1A2F46] dark:text-slate-100 text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120] flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Business Scan</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Scan Selector (Left) + 7-Domain Breakdown & Review (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Scans List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A2F46] dark:text-slate-100">
              Diagnostic Assessments ({scans.length})
            </h2>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {scans.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px]">
                <Compass className="w-6 h-6 text-[#8B97A3] mx-auto mb-2" />
                <p className="text-xs text-[#5D646C] dark:text-slate-400">No assessments created yet. Click "New Business Scan" to initiate.</p>
              </div>
            ) : (
              scans.map((s) => {
                const isSelected = selectedScan?.scan?.id === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectScan(s.id)}
                    className={`p-3.5 bg-white dark:bg-[#131C2E] border rounded-[3px] cursor-pointer transition-all ${
                      isSelected ? 'border-[#E65909] ring-2 ring-[#E65909]/20 shadow-sm' : 'border-[#C5CBD2] dark:border-slate-800 hover:border-[#8B97A3]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F6F3EE] dark:bg-[#0B1120] text-[#5D646C] dark:text-slate-400 font-bold">
                        {s.scan_number}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        s.overall_health_score >= 70 ? 'bg-emerald-100 text-emerald-800' :
                        s.overall_health_score >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        Score: {s.overall_health_score}/100
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 mt-2 line-clamp-1">{s.company_name}</h3>
                    <div className="text-[11px] text-[#5D646C] dark:text-slate-400 mt-0.5">
                      {s.industry} · {s.annual_turnover}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#ECE9E3] dark:border-slate-800 flex items-center justify-between text-[10px] text-[#8B97A3] font-mono">
                      <span>{s.answers_completed}/{s.total_questions} Questions Done</span>
                      <span className="text-[#E65909] font-bold">Status: {s.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Scan Diagnostics */}
        <div className="lg:col-span-8">
          {selectedScan ? (
            <div className="space-y-4">
              {/* Scan Overview Banner */}
              <div className="p-4 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {selectedScan.scan.scan_number}
                    </span>
                    <span className="text-xs text-[#8B97A3]">·</span>
                    <span className="text-xs text-[#5D646C] dark:text-slate-400">Turnover: <strong>{selectedScan.scan.annual_turnover}</strong></span>
                  </div>
                  <h2 className="text-xl font-bold font-serif text-[#1A2F46] dark:text-slate-100 mt-1">
                    {selectedScan.scan.company_name}
                  </h2>
                  <div className="text-xs text-[#5D646C] dark:text-slate-400 flex items-center space-x-3 mt-0.5">
                    <span>Contact: <strong>{selectedScan.scan.contact_person || 'N/A'}</strong></span>
                    {selectedScan.scan.phone && <span>Phone: <strong>{selectedScan.scan.phone}</strong></span>}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyShareLink(selectedScan.scan.shareable_token)}
                    className="px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 text-[#1A2F46] dark:text-slate-100 text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120] flex items-center space-x-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-700" />
                    <span>{copiedToken ? 'Copied Link!' : 'Shareable Link'}</span>
                  </button>

                  <button
                    onClick={() => handleCalculateScores(selectedScan.scan.id)}
                    disabled={calculating}
                    className="px-4 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{calculating ? 'Evaluating...' : 'Recalculate Scores'}</span>
                  </button>
                </div>
              </div>

              {/* 7 Domain Health Scores Strip */}
              <div className="p-4 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A2F46] dark:text-slate-100">
                    7-Domain Diagnostic Health Index
                  </h3>
                  <div className="text-sm font-serif font-bold text-[#1A2F46] dark:text-slate-100">
                    Overall Health: <span className="text-[#E65909] text-lg">{selectedScan.scan.overall_health_score}/100</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {DOMAINS.map((dom) => {
                    const score = selectedScan.scan.category_scores?.[dom.key] ?? 50;
                    return (
                      <div key={dom.key} className={`p-2.5 rounded-[2px] border ${dom.border} ${dom.bg} text-center`}>
                        <div className="text-[10px] font-bold text-[#1A2F46] dark:text-slate-100 line-clamp-1">{dom.label}</div>
                        <div className={`text-base font-bold font-serif mt-1 ${dom.color}`}>
                          {score}/100
                        </div>
                        <div className="w-full bg-white dark:bg-[#131C2E]/70 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div className="bg-current h-full" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Diagnostic Summary */}
              {selectedScan.scan.ai_diagnostic_summary && (
                <div className="p-4 bg-amber-50/50 rounded-[3px] border border-amber-200">
                  <span className="text-xs font-bold text-amber-900 uppercase font-mono tracking-wider flex items-center gap-1.5 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    Consultant Advisory Diagnostic Synthesis
                  </span>
                  <p className="text-xs text-[#1A2F46] dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {selectedScan.scan.ai_diagnostic_summary}
                  </p>
                </div>
              )}

              {/* Detailed Category Questions Accordion */}
              <div className="p-4 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm space-y-4">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#1A2F46] dark:text-slate-100">
                  Diagnostic Questionnaire & Evidence Audit
                </h3>

                {Object.entries(selectedScan.categories || {}).map(([catKey, qList]: [string, any]) => (
                  <div key={catKey} className="border border-[#ECE9E3] dark:border-slate-800 rounded-[2px] overflow-hidden">
                    <div className="p-2.5 bg-[#F6F3EE] dark:bg-[#0B1120] font-mono text-xs font-bold text-[#1A2F46] dark:text-slate-100 flex items-center justify-between">
                      <span>{catKey.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-[#8B97A3]">{qList.length} Questions</span>
                    </div>

                    <div className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
                      {qList.map((q: any) => (
                        <div key={q.id} className="p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-semibold text-[#1A2F46] dark:text-slate-100">{q.question}</p>
                            {q.answer && (
                              <p className="text-[11px] text-[#5D646C] dark:text-slate-400 mt-0.5">
                                Response: <em>{q.answer}</em>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-3 shrink-0">
                            {q.missing_document && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Missing Evidence
                              </span>
                            )}

                            <div className="flex items-center space-x-1.5 font-mono text-xs">
                              <span className="text-[#8B97A3] text-[10px]">Score (0-10):</span>
                              <input
                                type="number"
                                min={0}
                                max={10}
                                value={q.score}
                                onChange={(e) => handleUpdateAnswerScore(q.key, parseFloat(e.target.value) || 0, q.answer)}
                                className="w-14 px-2 py-1 border border-[#C5CBD2] dark:border-slate-800 rounded text-xs font-bold text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px]">
              <p className="text-xs text-[#5D646C] dark:text-slate-400">Select a diagnostic assessment from the left to inspect scores.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Scan Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Initiate New Business Scan"
        subtitle="Generate 360° diagnostic assessment link for client"
      >
        <form onSubmit={handleCreateScan} className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Company / Entity Legal Name *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Swastik Agro Products Pvt Ltd"
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Managing Director / Promoter</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Suresh Patel"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">WhatsApp Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Industry Vertical</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="Manufacturing / Industrial">Manufacturing / Industrial</option>
                <option value="Pharmaceuticals & Chemicals">Pharmaceuticals & Chemicals</option>
                <option value="Retail & Distribution">Retail & Distribution</option>
                <option value="Textiles & Garments">Textiles & Garments</option>
                <option value="IT & Professional Services">IT & Professional Services</option>
                <option value="Construction & Real Estate">Construction & Real Estate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Annual Turnover Scale</label>
              <select
                value={turnover}
                onChange={(e) => setTurnover(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="Under 5Cr">Under ₹5 Crores</option>
                <option value="5Cr - 25Cr">₹5 Crores - ₹25 Crores</option>
                <option value="25Cr - 100Cr">₹25 Crores - ₹100 Crores</option>
                <option value="100Cr+">Above ₹100 Crores</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Generating Scan...' : 'Generate Scan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
