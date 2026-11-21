import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Mail,
  Send,
  Bot,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Calculator,
  MessageSquare,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Plus,
  Play,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';

type HubTab = 'gstr_email' | 'gst_agent' | 'itr_bot' | 'itr_archive' | 'capital_gains' | 'whatsapp_pmsc' | 'skill_tools';

export const ComplianceHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('gstr_email');

  // ==========================================
  // 1. GSTR PDF Email Auto-Sender State
  // ==========================================
  const [gstrLogs, setGstrLogs] = useState<any[]>([]);
  const [gstrFilesInput, setGstrFilesInput] = useState(
    'GSTR1_27AACCA9876C1Z1_102026.pdf\nGSTR3B_27AACCA9876C1Z1_102026.pdf\nGSTR2B_27AABCT1234A1Z5_102026.pdf'
  );
  const [dispatchingGstr, setDispatchingGstr] = useState(false);

  // ==========================================
  // 2. GSTR AI Agent (Human-in-the-Loop) State
  // ==========================================
  const [gstinInput, setGstinInput] = useState('27AACCA9876C1Z1');
  const [clientInput, setClientInput] = useState('Apex Global Enterprises Ltd');
  const [returnTypeInput, setReturnTypeInput] = useState('GSTR1');
  const [periodInput, setPeriodInput] = useState('Q3-2026');
  const [agentPreparing, setAgentPreparing] = useState(false);
  const [agentReviewData, setAgentReviewData] = useState<any | null>(null);
  const [approvingFiling, setApprovingFiling] = useState(false);

  // ==========================================
  // 3. ITR Document Collection Bot State
  // ==========================================
  const [itrCases, setItrCases] = useState<any[]>([]);
  const [loadingItrCases, setLoadingItrCases] = useState(false);
  const [createCaseModalOpen, setCreateCaseModalOpen] = useState(false);
  const [itrClientName, setItrClientName] = useState('');
  const [itrPan, setItrPan] = useState('');
  const [itrProfile, setItrProfile] = useState('SALARIED');
  const [itrPhone, setItrPhone] = useState('+91 98765 43210');
  const [itrEmail, setItrEmail] = useState('');

  // ==========================================
  // 4. Last 3 Years ITR Archive State
  // ==========================================
  const [archivePackages, setArchivePackages] = useState<any[]>([]);
  const [organizingArchive, setOrganizingArchive] = useState(false);

  // ==========================================
  // 5. Capital Gains & Tax Payable State
  // ==========================================
  const [cgAssetType, setCgAssetType] = useState('EQUITY_LISTED');
  const [cgBuyDate, setCgBuyDate] = useState('2024-04-01');
  const [cgSaleDate, setCgSaleDate] = useState('2026-11-01');
  const [cgSaleVal, setCgSaleVal] = useState('500000');
  const [cgCostVal, setCgCostVal] = useState('300000');
  const [cgExpenses, setCgExpenses] = useState('2500');
  const [cgExemption, setCgExemption] = useState('0');
  const [cgResult, setCgResult] = useState<any | null>(null);
  const [cgRecords, setCgRecords] = useState<any[]>([]);

  // ==========================================
  // 6. Daily Office WhatsApp Summary State
  // ==========================================
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [postingToPmsc, setPostingToPmsc] = useState(false);

  // ==========================================
  // 7. Skill-Set Tools State
  // ==========================================
  // Consulting Report
  const [consultingClient, setConsultingClient] = useState('Zenith Retail & Logistics Ltd');
  const [consultingTitle, setConsultingTitle] = useState('Financial Controls & Statutory Reconciliation Modernisation');
  const [consultingFindings, setConsultingFindings] = useState('Manual ledger postings causing ITC loss of ₹8.4L, delayed vendor payments averaging 52 days, repetitive GSTR-3B variance notices.');
  const [consultingReport, setConsultingReport] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Salary Calculator
  const [ctcInput, setCtcInput] = useState('75000');
  const [basicPctInput, setBasicPctInput] = useState('50');
  const [hraPctInput, setHraPctInput] = useState('40');
  const [lopDaysInput, setLopDaysInput] = useState('0');
  const [tdsMonthlyInput, setTdsMonthlyInput] = useState('2500');
  const [salaryResult, setSalaryResult] = useState<any | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchGstrLogs();
    fetchItrCases();
    fetchArchivePackages();
    fetchCgRecords();
  }, []);

  const fetchGstrLogs = async () => {
    try {
      const data = await api.getGstrDispatchLogs();
      setGstrLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchItrCases = async () => {
    setLoadingItrCases(true);
    try {
      const data = await api.getItrBotCases();
      setItrCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItrCases(false);
    }
  };

  const fetchArchivePackages = async () => {
    try {
      const data = await api.getItrArchivePackages();
      setArchivePackages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCgRecords = async () => {
    try {
      const data = await api.getCapitalGains();
      setCgRecords(data);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. GSTR Dispatch Action
  const handleDispatchGstr = async () => {
    setDispatchingGstr(true);
    try {
      const files = gstrFilesInput.split('\n').map(s => s.trim()).filter(Boolean);
      await api.dispatchGstrPdfs(files);
      await fetchGstrLogs();
      alert('Return PDFs successfully verified against GSTIN directory and queued for secure dispatch.');
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setDispatchingGstr(false);
    }
  };

  // 2. GST Agent Action
  const handleRunAgentPreCheck = async () => {
    setAgentPreparing(true);
    try {
      const res = await api.prepareGstAgentFiling({
        gstin: gstinInput,
        client_name: clientInput,
        return_type: returnTypeInput,
        period: periodInput
      });
      setAgentReviewData(res);
    } catch (err: any) {
      alert(`Agent pre-check failed: ${err.message}`);
    } finally {
      setAgentPreparing(false);
    }
  };

  const handleApproveFiling = async () => {
    if (!agentReviewData) return;
    setApprovingFiling(true);
    try {
      const res = await api.approveGstAgentFiling(agentReviewData.review_id, 'APPROVE');
      setAgentReviewData({ ...agentReviewData, status: 'APPROVED_FILED', arn: res.arn });
      alert(`Filing successfully authorized and recorded with ARN: ${res.arn}`);
    } catch (err: any) {
      alert(`Filing approval failed: ${err.message}`);
    } finally {
      setApprovingFiling(false);
    }
  };

  // 3. ITR Bot Case Creation
  const handleCreateItrCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createItrBotCase({
        client_name: itrClientName,
        pan: itrPan,
        income_profile: itrProfile,
        phone: itrPhone,
        email: itrEmail
      });
      setCreateCaseModalOpen(false);
      setItrClientName('');
      setItrPan('');
      await fetchItrCases();
    } catch (err: any) {
      alert(`Error creating ITR collection case: ${err.message}`);
    }
  };

  const handleToggleDocItem = async (caseId: number, itemId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'RECEIVED' ? 'PENDING' : 'RECEIVED';
    try {
      await api.updateItrBotItem(caseId, itemId, nextStatus, nextStatus === 'RECEIVED' ? 'Verified_Upload.pdf' : undefined);
      await fetchItrCases();
    } catch (err: any) {
      alert(`Failed to update item: ${err.message}`);
    }
  };

  const handleSendItrReminder = async (caseId: number) => {
    try {
      const res = await api.sendItrBotReminder(caseId);
      alert(`Reminder dispatched to client via WhatsApp / Email:\n\n${res.reminder_message}`);
      await fetchItrCases();
    } catch (err: any) {
      alert(`Failed to send reminder: ${err.message}`);
    }
  };

  // 4. Archive Organizer Action
  const handleOrganizeAndSendArchive = async () => {
    setOrganizingArchive(true);
    try {
      await api.organizeAndSendItrArchive({
        client_name: 'Apex Global Enterprises Ltd',
        pan: 'AACCA9876C',
        email: 'finance@apexglobal.com',
        phone: '+91 98200 11223'
      });
      await fetchArchivePackages();
      alert('3-Year ITR archive folder scanned, structured into standardized AY hierarchy, and dispatched to client.');
    } catch (err: any) {
      alert(`Failed to organize archive: ${err.message}`);
    } finally {
      setOrganizingArchive(false);
    }
  };

  // 5. Capital Gains Calculate Action
  const handleCalculateCg = async () => {
    try {
      const res = await api.calculateCapitalGains({
        asset_type: cgAssetType,
        purchase_date: cgBuyDate,
        sale_date: cgSaleDate,
        sale_consideration: cgSaleVal,
        cost_of_acquisition: cgCostVal,
        transfer_expenses: cgExpenses,
        exemption_amount: cgExemption
      });
      setCgResult(res);
    } catch (err: any) {
      alert(`Calculation error: ${err.message}`);
    }
  };

  const handleSaveCgRecord = async () => {
    try {
      await api.saveCapitalGains({
        client_name: 'Apex Global Enterprises Ltd',
        pan: 'AACCA9876C',
        asset_type: cgAssetType,
        purchase_date: cgBuyDate,
        sale_date: cgSaleDate,
        sale_consideration: cgSaleVal,
        cost_of_acquisition: cgCostVal,
        transfer_expenses: cgExpenses,
        exemption_amount: cgExemption
      });
      await fetchCgRecords();
      alert('Capital gains schedule recorded to client tax computation subledger.');
    } catch (err: any) {
      alert(`Failed to save record: ${err.message}`);
    }
  };

  // 6. WhatsApp Daily Summary Action
  const handleGenerateOfficeSummary = async () => {
    setGeneratingSummary(true);
    try {
      const res = await api.generateOfficeSummary();
      setSummaryData(res);
    } catch (err: any) {
      alert(`Failed to synthesize office summary: ${err.message}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handlePostToPmsc = async () => {
    if (!summaryData) return;
    setPostingToPmsc(true);
    try {
      await api.postOfficeSummaryToPmsc(summaryData.summary_id);
      setSummaryData({ ...summaryData, posted: true });
      alert('Executive briefing dispatched to Team PMSC WhatsApp Group.');
    } catch (err: any) {
      alert(`Failed to post: ${err.message}`);
    } finally {
      setPostingToPmsc(false);
    }
  };

  // 7. Skill Tools Actions
  const handleGenerateConsulting = async () => {
    setGeneratingReport(true);
    try {
      const res = await api.generateConsultingReport({
        client_name: consultingClient,
        title: consultingTitle,
        findings: consultingFindings
      });
      setConsultingReport(res);
    } catch (err: any) {
      alert(`Report generation failed: ${err.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleCalculateSalary = async () => {
    try {
      const res = await api.calculateSalary({
        ctc_monthly: ctcInput,
        basic_pct: basicPctInput,
        hra_pct: hraPctInput,
        lop_days: lopDaysInput,
        monthly_tds: tdsMonthlyInput
      });
      setSalaryResult(res);
    } catch (err: any) {
      alert(`Salary computation error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-mono font-bold uppercase tracking-wider">
              SmartFin.AI Automation Suite
            </span>
            <span className="text-xs font-mono text-slate-400">| Statutory & Internal Workflows</span>
          </div>
          <h2 className="text-base font-bold text-navy-950 mt-1 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-brand-600" />
            <span>Compliance Automation & Internal Advisory Hub</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-email return PDFs, GSTR human-in-the-loop agent, ITR document bots, 3-year archive organizer, capital gains calculator & PMSC daily briefing.
          </p>
        </div>
      </div>

      {/* Sub-Nav Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { key: 'gstr_email', label: '1. GSTR PDF Auto-Email', icon: Mail },
          { key: 'gst_agent', label: '2. GSTR Auto-Filing Agent', icon: Bot },
          { key: 'itr_bot', label: '3. ITR Collection Bot', icon: UserCheck },
          { key: 'itr_archive', label: '4. 3-Year ITR Organizer', icon: FolderArchive },
          { key: 'capital_gains', label: '5. Capital Gains Working', icon: Calculator },
          { key: 'whatsapp_pmsc', label: '6. PMSC WhatsApp Summary', icon: MessageSquare },
          { key: 'skill_tools', label: '7. Consulting & Salary Tools', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as HubTab)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 1. AUTO-SEND GSTR-1, 2B & 3B RETURN PDFS BY EMAIL               */}
      {/* ============================================================== */}
      {activeTab === 'gstr_email' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-600" />
                <span>Return PDF Intake & Dispatch Queue</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically detects GSTR-1, 2B, and 3B PDFs, extracts GSTIN & period, looks up client email, and dispatches return filing certificates.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detected / Uploaded PDF Filenames (One per line)
              </label>
              <textarea
                rows={4}
                value={gstrFilesInput}
                onChange={(e) => setGstrFilesInput(e.target.value)}
                className="w-full p-2.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600"
              />
              <span className="text-[10px] text-slate-400">
                Pattern: TYPE_GSTIN_PERIOD.pdf (e.g. GSTR1_27AACCA9876C1Z1_102026.pdf)
              </span>
            </div>

            <button
              onClick={handleDispatchGstr}
              disabled={dispatchingGstr}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{dispatchingGstr ? 'Resolving & Sending...' : 'Auto-Match & Send Return PDFs'}</span>
            </button>
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                Automated Dispatch Audit Logs ({gstrLogs.length})
              </h3>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">SMTP Service Active</span>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Return</th>
                    <th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3">Recipient Email</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gstrLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No dispatch logs recorded yet. Run auto-match to send return PDFs.
                      </td>
                    </tr>
                  ) : (
                    gstrLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-brand-900">{l.return_type} ({l.tax_period})</td>
                        <td className="py-2 px-3 truncate max-w-[140px] text-slate-800">{l.client_name}</td>
                        <td className="py-2 px-3 text-slate-500">{l.recipient_email}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            l.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[10px]">{l.sent_at}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. GSTR-1 & 3B AUTO-FILING AI AGENT (Human-in-the-Loop)         */}
      {/* ============================================================== */}
      {activeTab === 'gst_agent' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                Human-in-the-Loop Mandatory Gate
              </span>
              <h3 className="text-sm font-bold text-navy-950 mt-1 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-brand-600" />
                <span>GSTR-1 & GSTR-3B Preparation, Verification & Filing Agent</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Validates checksums, HSN/SAC mappings, tax arithmetic, sequence continuity & GSTR-1 vs 3B variance before presenting human approval barrier.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunAgentPreCheck}
                disabled={agentPreparing}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{agentPreparing ? 'Running AI Checks...' : 'Run Pre-Filing Diagnostic'}</span>
              </button>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-600 mb-1 font-sans font-semibold">Client Name</label>
              <input
                type="text"
                value={clientInput}
                onChange={(e) => setClientInput(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-sans font-semibold">GSTIN</label>
              <input
                type="text"
                value={gstinInput}
                onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-sans font-semibold">Return Type</label>
              <select
                value={returnTypeInput}
                onChange={(e) => setReturnTypeInput(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="GSTR1">GSTR-1 (Outward Supplies)</option>
                <option value="GSTR3B">GSTR-3B (Monthly Summary & Payment)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-sans font-semibold">Tax Period</label>
              <input
                type="text"
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Diagnostic Verification Results */}
          {agentReviewData ? (
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                    Review ID #{agentReviewData.review_id}
                  </span>
                  <h4 className="text-xs font-bold text-navy-950 mt-0.5">
                    Pre-Filing Verification Summary for {agentReviewData.client_name} ({agentReviewData.return_type})
                  </h4>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-slate-500 block">Total Turnover: ₹{agentReviewData.total_taxable_value.toLocaleString('en-IN')}</span>
                  <span className="text-brand-900 font-bold block">Total Tax: ₹{agentReviewData.total_tax.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checks Checklist */}
              <div className="space-y-2">
                {agentReviewData.checks.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-white border border-slate-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start space-x-2">
                      {c.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold text-slate-800">{c.name}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{c.details}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {c.passed ? 'VERIFIED' : 'ACTION REQUIRED'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Human-in-the-Loop Approval Action */}
              <div className="p-4 rounded-xl bg-white border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-navy-950">Statutory Authorization Required</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Filing will not be dispatched to GST common portal without explicit senior review sign-off.
                  </p>
                </div>

                {agentReviewData.status === 'APPROVED_FILED' ? (
                  <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-mono font-bold">
                    ✓ FILED (ARN: {agentReviewData.arn})
                  </div>
                ) : (
                  <button
                    onClick={handleApproveFiling}
                    disabled={approvingFiling}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{approvingFiling ? 'Authorizing...' : 'Approve & Execute Filing'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs font-mono text-slate-400 border border-dashed rounded-xl">
              Click "Run Pre-Filing Diagnostic" to trigger automated HSN, tax math, checksum & variance checks.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. INCOME TAX DOCUMENT COLLECTION BOT                           */}
      {/* ============================================================== */}
      {activeTab === 'itr_bot' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-600" />
                <span>ITR Document Collection Bot (WhatsApp / Web Intake)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic document checklist based on client income profile with automated progress tracking and WhatsApp reminders.
              </p>
            </div>

            <button
              onClick={() => setCreateCaseModalOpen(true)}
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Open New Intake Case</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itrCases.length === 0 ? (
              <div className="col-span-3 p-12 text-center text-xs font-mono text-slate-400 bg-white rounded-xl border border-slate-200">
                No active document collection cases. Click "+ Open New Intake Case" to begin collecting documents.
              </div>
            ) : (
              itrCases.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-brand-600 font-bold uppercase">
                        {c.income_profile.replace('_', ' ')}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-0.5">{c.client_name}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600">{c.pan}</span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-slate-500">Intake Progress</span>
                      <span className="font-bold text-navy-950">{c.completion_percentage}% ({c.received_count}/{c.total_count})</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${c.completion_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 text-xs">
                    {(c.items || []).map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleDocItem(c.id, item.id, item.status)}
                        className="flex items-center justify-between p-2 rounded bg-slate-50 hover:bg-slate-100/80 cursor-pointer border border-slate-200/80 text-[11px]"
                      >
                        <span className={`truncate max-w-[200px] ${item.status === 'RECEIVED' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                          {item.name}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {c.last_reminder_sent ? `Reminded: ${c.last_reminder_sent}` : 'No reminder sent'}
                    </span>
                    <button
                      onClick={() => handleSendItrReminder(c.id)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send WhatsApp Reminder</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. LAST 3 YEARS ITR DATA COLLECTOR & AUTO-SENDER                */}
      {/* ============================================================== */}
      {activeTab === 'itr_archive' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-navy-950 flex items-center gap-1.5">
                <FolderArchive className="w-4 h-4 text-brand-600" />
                <span>Last 3 Years ITR Data Collector, Folder Organizer & Auto-Sender</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scans client archive folders for last 3 Assessment Years (AY 2024-25, 2025-26, 2026-27), organizes into standardized folders, and dispatches via Email & WhatsApp.
              </p>
            </div>

            <button
              onClick={handleOrganizeAndSendArchive}
              disabled={organizingArchive}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${organizingArchive ? 'animate-spin' : ''}`} />
              <span>{organizingArchive ? 'Organizing Archive...' : 'Scan, Organize & Dispatch Dossier'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">PAN</th>
                  <th className="py-2.5 px-3">Covered AYs</th>
                  <th className="py-2.5 px-3">Standardized Folder Path</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivePackages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No 3-year dossiers created yet. Click "Scan, Organize & Dispatch Dossier" to bundle client returns.
                    </td>
                  </tr>
                ) : (
                  archivePackages.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{p.client_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.pan}</td>
                      <td className="py-2.5 px-3 text-brand-900 font-bold">{p.covered_years.join(', ')}</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[220px]">{p.folder_path}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.delivery_channel}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {p.delivery_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[10px]">{p.dispatched_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. CAPITAL GAINS & TAX PAYABLE WORKING TOOL                     */}
      {/* ============================================================== */}
      {activeTab === 'capital_gains' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-brand-600" />
                <span>Capital Gains Calculator (Indian IT Act)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Computes holding period, STCG/LTCG classification, cost of acquisition, transfer expenses, Section 54/54EC exemptions & tax payable.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Asset Class</label>
                <select
                  value={cgAssetType}
                  onChange={(e) => setCgAssetType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="EQUITY_LISTED">Listed Equity Shares (12m threshold u/s 111A/112A)</option>
                  <option value="EQUITY_MUTUAL_FUNDS">Equity Oriented Mutual Funds (12m threshold)</option>
                  <option value="IMMOVABLE_PROPERTY">Land / Building / Real Estate (24m threshold)</option>
                  <option value="UNLISTED_SHARES">Unlisted Private Shares (24m threshold)</option>
                  <option value="DEBT_MUTUAL_FUNDS">Debt Mutual Funds (Taxed at slab rates u/s 50AA)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Date of Purchase</label>
                  <input
                    type="date"
                    value={cgBuyDate}
                    onChange={(e) => setCgBuyDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Date of Sale</label>
                  <input
                    type="date"
                    value={cgSaleDate}
                    onChange={(e) => setCgSaleDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Sale Consideration (₹)</label>
                  <input
                    type="number"
                    value={cgSaleVal}
                    onChange={(e) => setCgSaleVal(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Cost of Acquisition (₹)</label>
                  <input
                    type="number"
                    value={cgCostVal}
                    onChange={(e) => setCgCostVal(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Transfer Expenses (₹)</label>
                  <input
                    type="number"
                    value={cgExpenses}
                    onChange={(e) => setCgExpenses(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Exemptions u/s 54 (₹)</label>
                  <input
                    type="number"
                    value={cgExemption}
                    onChange={(e) => setCgExemption(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleCalculateCg}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg"
                >
                  Compute Capital Gains
                </button>
                {cgResult && (
                  <button
                    type="button"
                    onClick={handleSaveCgRecord}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg"
                  >
                    Save Record
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Capital Gains & Tax Working Schedule
            </h3>

            {cgResult ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 font-sans block text-[10px]">Holding Period</span>
                    <strong className="text-navy-950 text-sm">{cgResult.holding_months} Months</strong>
                    <span className="block text-[10px] text-brand-600 font-bold">{cgResult.gain_type}</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 font-sans block text-[10px]">Net Capital Gain</span>
                    <strong className="text-emerald-700 text-sm">₹{cgResult.net_taxable_gain.toLocaleString('en-IN')}</strong>
                    <span className="block text-[10px] text-slate-400">After exemptions</span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-rose-700 font-sans block text-[10px]">Tax Payable</span>
                    <strong className="text-rose-700 text-sm">₹{cgResult.tax_payable.toLocaleString('en-IN')}</strong>
                    <span className="block text-[10px] text-rose-600">Rate: {cgResult.applicable_tax_rate_pct}%</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gross Sale Consideration:</span>
                    <span>₹{cgResult.sale_consideration.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Cost of Acquisition:</span>
                    <span>₹{cgResult.cost_of_acquisition.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Transfer Expenses (Brokerage/STT):</span>
                    <span>₹{cgResult.transfer_expenses.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>(-) Exemptions Claimed:</span>
                    <span>₹{cgResult.exemption_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-navy-950">
                    <span>Net Taxable Capital Gains:</span>
                    <span>₹{cgResult.net_taxable_gain.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-sans">
                  * Note: {cgResult.notes}
                </p>
              </div>
            ) : (
              <div className="p-12 text-center text-xs font-mono text-slate-400">
                Provide purchase and sale details to generate transaction-level tax schedule.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. DAILY OFFICE WHATSAPP SUMMARY TO TEAM PMSC GROUP             */}
      {/* ============================================================== */}
      {activeTab === 'whatsapp_pmsc' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                Automated Daily Pipeline
              </span>
              <h3 className="text-sm font-bold text-navy-950 mt-1 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Daily Office WhatsApp Summary to "Team PMSC" Group</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregates relevant office updates, filters noise/chatter, and formats a concise executive summary covering Key Decisions, Action Items & Blockers.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleGenerateOfficeSummary}
                disabled={generatingSummary}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingSummary ? 'animate-spin' : ''}`} />
                <span>{generatingSummary ? 'Synthesizing...' : 'Aggregate & Generate Summary'}</span>
              </button>
            </div>
          </div>

          {summaryData ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* WhatsApp Live Typography Preview */}
              <div className="lg:col-span-7 bg-[#EFEAE2] p-5 rounded-xl border border-slate-300 space-y-3 font-mono text-xs text-slate-900 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-300">
                  <span className="text-[11px] font-bold text-emerald-800 font-sans">
                    WhatsApp Message Preview (Target: Team PMSC)
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded text-slate-500">
                    256-bit Encrypted
                  </span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800 bg-white p-4 rounded-lg border border-slate-200">
                  {summaryData.formatted_text}
                </pre>
              </div>

              {/* Action Sidebar */}
              <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Dispatch to Team PMSC Group
                </h4>
                <p className="text-xs text-slate-500">
                  Reviewed by authorized administrator. Ready to broadcast to all Team PMSC group members.
                </p>

                {summaryData.posted ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Successfully Posted to Team PMSC WhatsApp Group</span>
                  </div>
                ) : (
                  <button
                    onClick={handlePostToPmsc}
                    disabled={postingToPmsc}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{postingToPmsc ? 'Broadcasting...' : 'Post to Team PMSC WhatsApp Group'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs font-mono text-slate-400 border border-dashed rounded-xl">
              Click "Aggregate & Generate Summary" to extract today's key decisions, action items and blockers.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. SKILL-SET TOOLS: CONSULTING REPORT & SALARY CALCULATION     */}
      {/* ============================================================== */}
      {activeTab === 'skill_tools' && (
        <div className="space-y-8">
          {/* Tool 1: Consulting Report Generator */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <div>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                Internal Advisory Utility
              </span>
              <h3 className="text-sm font-bold text-navy-950 mt-1 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-brand-600" />
                <span>Executive Consulting Report Generator</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Converts raw client findings and audit notes into a structured 6-section formal advisory report.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Client Name</label>
                <input
                  type="text"
                  value={consultingClient}
                  onChange={(e) => setConsultingClient(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">Engagement Title</label>
                <input
                  type="text"
                  value={consultingTitle}
                  onChange={(e) => setConsultingTitle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1 font-semibold">Raw Findings & Diagnostic Notes</label>
              <textarea
                rows={2}
                value={consultingFindings}
                onChange={(e) => setConsultingFindings(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <button
              onClick={handleGenerateConsulting}
              disabled={generatingReport}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{generatingReport ? 'Formatting Report...' : 'Generate Consulting Report'}</span>
            </button>

            {consultingReport && (
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4 text-xs">
                <div className="border-b border-slate-200 pb-3">
                  <span className="text-[10px] font-mono font-bold text-brand-600 uppercase">CONFIDENTIAL ADVISORY</span>
                  <h4 className="text-sm font-bold text-navy-950 mt-0.5">{consultingReport.title}</h4>
                  <p className="text-[11px] text-slate-500">Prepared for: {consultingReport.client} | {consultingReport.date}</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">1. Executive Summary</h5>
                  <p className="text-slate-600 leading-relaxed">{consultingReport.executive_summary}</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">2. Current State & Root Causes</h5>
                  <div className="space-y-1.5">
                    {consultingReport.current_state_analysis.map((c: any, i: number) => (
                      <div key={i} className="p-2.5 bg-white rounded border border-slate-200 text-xs">
                        <strong className="text-navy-950">{c.issue}:</strong> <span className="text-slate-600">{c.root_cause}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">3. Implementation Roadmap</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {consultingReport.implementation_roadmap.map((r: any, i: number) => (
                      <div key={i} className="p-2.5 bg-white rounded border border-slate-200 text-xs">
                        <strong className="text-brand-900 block font-sans">{r.phase}</strong>
                        <span className="text-slate-600 text-[11px] mt-1 block">{r.milestones}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tool 2: Salary Calculation Tool */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
            <div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-mono font-bold uppercase tracking-wider">
                Statutory Payroll Calculator
              </span>
              <h3 className="text-sm font-bold text-navy-950 mt-1 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Salary Breakdown & CTC Calculator (Indian Labour Law Compliance)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Computes Basic, HRA, PF (12%), ESIC (0.75%), Professional Tax, TDS deductions, LOP adjustments, Net Take-Home & Employer CTC.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
              <div>
                <label className="block text-slate-600 mb-1 font-sans font-semibold">Monthly CTC (₹)</label>
                <input
                  type="number"
                  value={ctcInput}
                  onChange={(e) => setCtcInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-sans font-semibold">Basic (% of CTC)</label>
                <input
                  type="number"
                  value={basicPctInput}
                  onChange={(e) => setBasicPctInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-sans font-semibold">HRA (% of Basic)</label>
                <input
                  type="number"
                  value={hraPctInput}
                  onChange={(e) => setHraPctInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-sans font-semibold">LOP Days</label>
                <input
                  type="number"
                  value={lopDaysInput}
                  onChange={(e) => setLopDaysInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-sans font-semibold">Monthly TDS (₹)</label>
                <input
                  type="number"
                  value={tdsMonthlyInput}
                  onChange={(e) => setTdsMonthlyInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <button
              onClick={handleCalculateSalary}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
            >
              Compute Statutory Salary Breakdown
            </button>

            {salaryResult && (
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                {/* Earnings */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <h5 className="font-bold text-navy-950 font-sans uppercase text-[11px] pb-1 border-b">Gross Earnings</h5>
                  <div className="flex justify-between"><span>Basic Pay:</span><span>₹{salaryResult.earnings.basic_salary}</span></div>
                  <div className="flex justify-between"><span>HRA:</span><span>₹{salaryResult.earnings.house_rent_allowance}</span></div>
                  <div className="flex justify-between"><span>Special Allowance:</span><span>₹{salaryResult.earnings.special_allowance}</span></div>
                  {salaryResult.earnings.lop_deduction > 0 && (
                    <div className="flex justify-between text-rose-600"><span>(-) LOP Cut:</span><span>₹{salaryResult.earnings.lop_deduction}</span></div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-1 text-slate-900">
                    <span>Earned Gross:</span><span>₹{salaryResult.earnings.net_gross_earned}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <h5 className="font-bold text-rose-700 font-sans uppercase text-[11px] pb-1 border-b">Employee Deductions</h5>
                  <div className="flex justify-between"><span>EPF (12%):</span><span>₹{salaryResult.employee_deductions.provident_fund_12pct}</span></div>
                  <div className="flex justify-between"><span>ESIC (0.75%):</span><span>₹{salaryResult.employee_deductions.esic_0_75pct}</span></div>
                  <div className="flex justify-between"><span>Prof. Tax (PT):</span><span>₹{salaryResult.employee_deductions.professional_tax}</span></div>
                  <div className="flex justify-between"><span>TDS on Salary:</span><span>₹{salaryResult.employee_deductions.tds_withheld}</span></div>
                  <div className="flex justify-between font-bold border-t pt-1 text-rose-700">
                    <span>Total Deductions:</span><span>₹{salaryResult.employee_deductions.total_deductions}</span>
                  </div>
                </div>

                {/* Take-Home Summary */}
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg space-y-2 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-brand-900 font-sans uppercase text-[11px] pb-1 border-b border-brand-200">Take-Home Pay</h5>
                    <p className="text-xl font-bold text-brand-900 mt-2 font-mono">
                      ₹{salaryResult.summary.net_take_home_pay.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[10px] text-slate-500 font-sans block">Monthly Net Credit</span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono border-t border-brand-200 pt-1">
                    Employer CTC Cost: ₹{salaryResult.summary.total_employer_ctc}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Case Creation Modal */}
      <Modal
        isOpen={createCaseModalOpen}
        onClose={() => setCreateCaseModalOpen(false)}
        title="Open ITR Document Intake Case"
        subtitle="Initiate profile-based document collection for client"
      >
        <form onSubmit={handleCreateItrCase} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Client Full Name *</label>
            <input
              type="text"
              required
              value={itrClientName}
              onChange={(e) => setItrClientName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PAN *</label>
              <input
                type="text"
                required
                value={itrPan}
                onChange={(e) => setItrPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Income Profile *</label>
              <select
                value={itrProfile}
                onChange={(e) => setItrProfile(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value="SALARIED">Salaried (Form 16 + 80C/80D)</option>
                <option value="BUSINESS_PROFESSION">Business / Profession (P&L, Balance Sheet)</option>
                <option value="CAPITAL_GAINS_INVESTOR">Capital Gains Investor (Brokers + Property)</option>
                <option value="COMPREHENSIVE">Comprehensive (All Income Heads)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Phone *</label>
              <input
                type="text"
                required
                value={itrPhone}
                onChange={(e) => setItrPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={itrEmail}
                onChange={(e) => setItrEmail(e.target.value)}
                placeholder="client@gmail.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setCreateCaseModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white rounded-lg shadow-xs"
            >
              Open Intake Case
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
