import React, { useState } from 'react';
import {
  FileText,
  Send,
  MessageSquare,
  AlertTriangle,
  Scale,
  Copy,
  Clock,
  CheckCircle2,
  TrendingDown,
  Building2,
  DollarSign,
  Receipt
} from 'lucide-react';
import { api } from '../../services/api';

export const CollectionAI: React.FC = () => {
  const [customerName, setCustomerName] = useState('Zenith Retail & Logistics Ltd');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-0891');
  const [amountDue, setAmountDue] = useState('285000');
  const [daysOverdue, setDaysOverdue] = useState(38);
  const [draftResult, setDraftResult] = useState<any | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleGenerateDraft = async () => {
    setDrafting(true);
    try {
      const res = await api.draftCollectionSequence({
        customer_name: customerName,
        invoice_number: invoiceNumber,
        amount_due: parseFloat(amountDue) || 0,
        days_overdue: daysOverdue
      });
      setDraftResult(res);
    } catch (err: any) {
      alert(`Draft generation failed: ${err.message}`);
    } finally {
      setDrafting(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1A2F46] p-6 rounded-xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-500/30">
              Receivables Recovery & Credit Control
            </span>
            <span className="text-xs font-mono text-slate-300">| Module: Collection AI</span>
          </div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <span>Collection AI (Trade Receivables Recovery Engine)</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Multi-tier, automated B2B payment recovery sequences tailored by overdue aging, incorporating MSME statutory interest protection clauses.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white/10 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-mono">
          <Scale className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400">Statutory Backing</div>
            <div className="font-bold">MSMED Act Section 16</div>
          </div>
        </div>
      </div>

      {/* Main Form & Configuration */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
            Overdue Account Parameters
          </h3>
          <p className="text-xs text-slate-500">
            Provide debtor details and days overdue to generate the optimal communication sequence and tone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Debtor / Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Acme Enterprises"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-2026-001"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Amount Outstanding (₹)
            </label>
            <input
              type="number"
              value={amountDue}
              onChange={(e) => setAmountDue(e.target.value)}
              placeholder="250000"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Days Overdue: <strong className="text-rose-700">{daysOverdue} Days</strong>
            </label>
            <input
              type="range"
              min="1"
              max="120"
              value={daysOverdue}
              onChange={(e) => setDaysOverdue(parseInt(e.target.value))}
              className="w-full accent-rose-600 mt-2"
            />
          </div>
        </div>

        {/* Overdue Tier Guide */}
        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono pt-2">
          <div className={`p-2 rounded border ${daysOverdue <= 15 ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-800' : 'bg-slate-50 text-slate-500'}`}>
            0–15 Days: Courtesy
          </div>
          <div className={`p-2 rounded border ${daysOverdue > 15 && daysOverdue <= 30 ? 'bg-amber-50 border-amber-300 font-bold text-amber-800' : 'bg-slate-50 text-slate-500'}`}>
            16–30 Days: Due Advisory
          </div>
          <div className={`p-2 rounded border ${daysOverdue > 30 && daysOverdue <= 60 ? 'bg-orange-50 border-orange-300 font-bold text-orange-800' : 'bg-slate-50 text-slate-500'}`}>
            31–60 Days: Credit Hold
          </div>
          <div className={`p-2 rounded border ${daysOverdue > 60 ? 'bg-rose-50 border-rose-300 font-bold text-rose-800' : 'bg-slate-50 text-slate-500'}`}>
            60+ Days: MSME Demand
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleGenerateDraft}
            disabled={drafting}
            className="px-5 py-2.5 bg-[#1A2F46] hover:bg-[#0D2035] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <span>{drafting ? 'Generating Recovery Sequences...' : 'Generate Multi-Channel Drafts'}</span>
          </button>
        </div>
      </div>

      {/* Generated Recovery Drafts */}
      {draftResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* WhatsApp Text Bubble */}
          <div className="lg:col-span-6 bg-[#EFEAE2] p-5 rounded-xl border border-slate-300 space-y-3 font-mono text-xs text-slate-900 shadow-inner">
            <div className="flex items-center justify-between pb-2 border-b border-slate-300">
              <span className="text-[11px] font-bold text-emerald-800 font-sans flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Recovery Draft ({draftResult.tier})</span>
              </span>
              <button
                onClick={() => copyToClipboard(draftResult.whatsapp_draft, 'wa')}
                className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-600 hover:bg-slate-50 border border-slate-200 flex items-center gap-1 font-sans font-semibold"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedType === 'wa' ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              {draftResult.whatsapp_draft}
            </pre>
            <div className="text-[11px] font-sans text-slate-500">
              Recommended Tone: <strong>{draftResult.tone}</strong>
            </div>
          </div>

          {/* Formal Email Demand */}
          <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 space-y-3 text-xs shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold text-navy-950 font-sans flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-600" />
                <span>Formal Accounts Email Draft</span>
              </span>
              <button
                onClick={() => copyToClipboard(draftResult.email_subject, 'subject')}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-700 flex items-center gap-1 font-semibold"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedType === 'subject' ? 'Copied Subject!' : 'Copy Subject'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px]">
              <span className="text-slate-500">Subject: </span>
              <span className="font-bold text-navy-950">{draftResult.email_subject}</span>
            </div>

            {draftResult.statutory_msme_applicable && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                  <span>Statutory MSMED Act Clause Invoked</span>
                </div>
                <p>
                  As the delay exceeds 45 days, statutory penal interest at 3x the RBI bank rate is legally claimable under Indian law.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
