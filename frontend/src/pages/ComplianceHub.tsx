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
  UserCheck,
  Clock,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Settings,
  Radio,
  Lock,
  QrCode,
  LogOut,
  Smartphone,
  Inbox,
  ListChecks,
  Eye,
  Search
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
  const [gstrFilesInput, setGstrFilesInput] = useState('');
  const [dispatchingGstr, setDispatchingGstr] = useState(false);

  // ==========================================
  // 2. GSTR AI Agent (Human-in-the-Loop) State
  // ==========================================
  const [gstinInput, setGstinInput] = useState('');
  const [clientInput, setClientInput] = useState('');
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
  const [itrPhone, setItrPhone] = useState('');
  const [itrEmail, setItrEmail] = useState('');

  // ==========================================
  // 4. Last 3 Years ITR Archive State
  // ==========================================
  const [archivePackages, setArchivePackages] = useState<any[]>([]);
  const [organizingArchive, setOrganizingArchive] = useState(false);

  // ==========================================
  // 5. Capital Gains & Tax Payable State
  // ==========================================
  const [cgClientName, setCgClientName] = useState('');
  const [cgPan, setCgPan] = useState('');
  const [cgAssetType, setCgAssetType] = useState('EQUITY_LISTED');
  const [cgBuyDate, setCgBuyDate] = useState('2024-04-01');
  const [cgSaleDate, setCgSaleDate] = useState('2026-11-01');
  const [cgSaleVal, setCgSaleVal] = useState('');
  const [cgCostVal, setCgCostVal] = useState('');
  const [cgExpenses, setCgExpenses] = useState('0');
  const [cgExemption, setCgExemption] = useState('0');
  const [cgResult, setCgResult] = useState<any | null>(null);
  const [cgRecords, setCgRecords] = useState<any[]>([]);

  // ==========================================
  // 6. Daily Office WhatsApp Summary State & Direct Baileys
  // ==========================================
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [postingToPmsc, setPostingToPmsc] = useState(false);
  const [waStatus, setWaStatus] = useState<any | null>(null);
  const [loadingWaStatus, setLoadingWaStatus] = useState(false);
  const [startingQRSession, setStartingQRSession] = useState(false);
  const [loggingOutSession, setLoggingOutSession] = useState(false);
  const [waGroups, setWaGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('Team PMSC');
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('18:30');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [summaryHistory, setSummaryHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rawNotesInput, setRawNotesInput] = useState('');
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [realSendError, setRealSendError] = useState<string | null>(null);
  const [realSendSuccess, setRealSendSuccess] = useState<any | null>(null);
  const [pairingMethod, setPairingMethod] = useState<'QR' | 'CODE'>('QR');
  const [pairingPhoneInput, setPairingPhoneInput] = useState('');
  const [requestingPairingCode, setRequestingPairingCode] = useState(false);
  const [pairingCodeDisplay, setPairingCodeDisplay] = useState<string | null>(null);
  const [isPairingActive, setIsPairingActive] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingUnreads, setLoadingUnreads] = useState<boolean>(false);
  const [markingRead, setMarkingRead] = useState<boolean>(false);
  const [summaryViewTab, setSummaryViewTab] = useState<'FULL' | 'PARTS' | 'UNREAD_LIST'>('FULL');
  const [reportTracker, setReportTracker] = useState<any | null>(null);
  const [loadingReportTracker, setLoadingReportTracker] = useState(false);
  const [reportTrackerSubTab, setReportTrackerSubTab] = useState<'PENDING' | 'RECEIVED'>('PENDING');
  const [sendingReminders, setSendingReminders] = useState(false);
  const [trackerSearch, setTrackerSearch] = useState('');
  const [trackerPage, setTrackerPage] = useState(1);
  const trackerPageSize = 25;

  // ==========================================
  // 7. Skill-Set Tools State
  // ==========================================
  // Consulting Report
  const [consultingClient, setConsultingClient] = useState('');
  const [consultingTitle, setConsultingTitle] = useState('');
  const [consultingFindings, setConsultingFindings] = useState('');
  const [consultingReport, setConsultingReport] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Salary Calculator
  const [ctcInput, setCtcInput] = useState('');
  const [basicPctInput, setBasicPctInput] = useState('50');
  const [hraPctInput, setHraPctInput] = useState('40');
  const [lopDaysInput, setLopDaysInput] = useState('0');
  const [tdsMonthlyInput, setTdsMonthlyInput] = useState('0');
  const [salaryResult, setSalaryResult] = useState<any | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchGstrLogs();
    fetchItrCases();
    fetchArchivePackages();
    fetchCgRecords();
    fetchWaStatus();
    fetchSummaryHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'whatsapp_pmsc') {
      fetchWaStatus();
      fetchUnreadMessages();
      fetchReportTracker();
    }
  }, [activeTab]);

  useEffect(() => {
    let interval: any = null;
    const isScanningOrConnecting = isPairingActive || waStatus?.state === 'AWAITING_QR' || waStatus?.state === 'QR_READY' || waStatus?.state === 'CONNECTING' || waStatus?.state === 'PAIRING_CODE_READY';
    if (activeTab === 'whatsapp_pmsc' && isScanningOrConnecting && !waStatus?.is_connected) {
      interval = setInterval(async () => {
        const s = await fetchWaStatus();
        if (s?.is_connected) {
          clearInterval(interval);
          setIsPairingActive(false);
          handleFetchGroups();
        }
      }, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, isPairingActive, waStatus?.state, waStatus?.is_connected]);

  const fetchWaStatus = async () => {
    setLoadingWaStatus(true);
    try {
      const status = await api.getWhatsAppStatus();
      setWaStatus(status);
      if (status?.selected_group?.id) {
        setSelectedGroupId(status.selected_group.id);
        setSelectedGroupName(status.selected_group.name || 'Team PMSC');
      }
      return status;
    } catch (e) {
      console.error('Failed to get WhatsApp status:', e);
    } finally {
      setLoadingWaStatus(false);
    }
  };

  const fetchSummaryHistory = async () => {
    setLoadingHistory(true);
    try {
      const hist = await api.getOfficeSummaryHistory();
      setSummaryHistory(hist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

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
    if (!cgClientName.trim() || !cgPan.trim()) {
      alert('Please enter Client/Assessee Name and PAN before saving computation record.');
      return;
    }
    try {
      await api.saveCapitalGains({
        client_name: cgClientName.trim(),
        pan: cgPan.trim().toUpperCase(),
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
  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      const res = await api.updateWhatsAppSchedule({ enabled: scheduleEnabled, time_ist: scheduleTime });
      alert(res.message || 'Auto-scheduler updated successfully.');
      await fetchWaStatus();
    } catch (err: any) {
      alert(`Failed to save schedule: ${err.message}`);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleGenerateOfficeSummary = async () => {
    setGeneratingSummary(true);
    try {
      const payload: any = {};
      if (rawNotesInput.trim()) {
        payload.notes = rawNotesInput.trim();
      }
      const res = await api.generateOfficeSummary(payload);
      setSummaryData(res);
      await fetchSummaryHistory();
      await fetchUnreadMessages();
    } catch (err: any) {
      alert(`Failed to synthesize office summary: ${err.message}`);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const fetchUnreadMessages = async () => {
    setLoadingUnreads(true);
    try {
      const res = await api.getWhatsAppUnreadMessages();
      setUnreadMessages(res?.messages || []);
      setUnreadCount(res?.count || 0);
    } catch (e) {
      console.error('Failed to fetch unread WhatsApp messages:', e);
    } finally {
      setLoadingUnreads(false);
    }
  };

  const handleMarkAsRead = async (messageIds?: number[], markAll?: boolean) => {
    setMarkingRead(true);
    try {
      await api.markWhatsAppMessagesRead({
        message_ids: messageIds,
        mark_all: markAll
      });
      await fetchUnreadMessages();
      if (summaryData) {
        handleGenerateOfficeSummary();
      }
    } catch (e: any) {
      alert(`Failed to mark read: ${e.message}`);
    } finally {
      setMarkingRead(false);
    }
  };

  const fetchReportTracker = async () => {
    setLoadingReportTracker(true);
    try {
      const data = await api.getClientReportsTracker();
      setReportTracker(data);
    } catch (e) {
      console.error('Failed to fetch client reports tracker:', e);
    } finally {
      setLoadingReportTracker(false);
    }
  };

  const handleSendReportReminders = async (clientIds?: number[]) => {
    setSendingReminders(true);
    try {
      const res = await api.sendClientReportReminders({ client_ids: clientIds });
      alert(`Reminders sent to ${res.sent_count} pending client(s). Ignored ${res.ignored_already_received_count} client(s) who already submitted.`);
      await fetchReportTracker();
    } catch (e: any) {
      alert(`Failed to send reminders: ${e.message}`);
    } finally {
      setSendingReminders(false);
    }
  };

  const handleStartQRScan = async () => {
    setStartingQRSession(true);
    setIsPairingActive(true);
    setPairingMethod('QR');
    setRealSendError(null);
    try {
      const res = await api.startWhatsAppQRSession();
      if (res?.qr) {
        setWaStatus((prev: any) => ({ ...prev, state: 'QR_READY', qr_code: res.qr }));
      }
      await fetchWaStatus();
    } catch (err: any) {
      alert(`Failed to start WhatsApp pairing session: ${err.message}`);
    } finally {
      setStartingQRSession(false);
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pairingPhoneInput.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) {
      alert('Please enter a valid phone number with country code (e.g. 919876543210).');
      return;
    }
    setRequestingPairingCode(true);
    setIsPairingActive(true);
    setPairingMethod('CODE');
    try {
      const res = await api.requestWhatsAppPairingCode(clean);
      if (res?.pairingCode) {
        setPairingCodeDisplay(res.pairingCode);
        setWaStatus((prev: any) => ({ ...prev, state: 'PAIRING_CODE_READY', pairing_code: res.pairingCode }));
      }
      await fetchWaStatus();
    } catch (err: any) {
      alert(`Failed to generate pairing code: ${err.message}`);
    } finally {
      setRequestingPairingCode(false);
    }
  };

  const handleLogoutSession = async () => {
    if (!window.confirm('Are you sure you want to unlink and log out this WhatsApp device?')) return;
    setLoggingOutSession(true);
    try {
      await api.logoutWhatsAppSession();
      await fetchWaStatus();
      setWaGroups([]);
      setIsPairingActive(false);
      setPairingCodeDisplay(null);
      alert('WhatsApp device unlinked successfully.');
    } catch (err: any) {
      alert(`Failed to unlink session: ${err.message}`);
    } finally {
      setLoggingOutSession(false);
    }
  };

  const handleFetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await api.getWhatsAppGroups();
      if (res?.groups) {
        setWaGroups(res.groups);
        const pmsc = res.groups.find((g: any) => g.is_pmsc || g.name.toLowerCase().includes('pmsc'));
        if (pmsc && (!selectedGroupId || selectedGroupId === 'DEFAULT_PMSC_GROUP')) {
          await handleSelectGroup(pmsc.id, pmsc.name);
        }
      }
    } catch (err: any) {
      console.warn(`Could not fetch WhatsApp groups: ${err.message}`);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSelectGroup = async (groupId: string, groupName: string) => {
    try {
      await api.selectWhatsAppGroup({ group_id: groupId, group_name: groupName });
      setSelectedGroupId(groupId);
      setSelectedGroupName(groupName);
      await fetchWaStatus();
    } catch (err: any) {
      alert(`Failed to save target group: ${err.message}`);
    }
  };

  const handlePostToPmsc = async () => {
    if (!summaryData) return;
    if (!waStatus?.can_send) {
      alert('Cannot send message: Real WhatsApp session is disconnected. Please scan the QR code to link your office phone or configure gateway credentials.');
      return;
    }
    setPostingToPmsc(true);
    setRealSendError(null);
    setRealSendSuccess(null);
    try {
      const res = await api.postOfficeSummaryToPmsc(summaryData.summary_id);
      setSummaryData({ ...summaryData, posted: true, dispatch_status: res.status });
      setRealSendSuccess(res);
      await fetchSummaryHistory();
      alert(`Real WhatsApp message dispatched successfully to "${selectedGroupName}"!\nMessage ID: ${res.message_id || 'Delivered'}`);
    } catch (err: any) {
      const errMsg = err.message || 'Transmission failed';
      setRealSendError(errMsg);
      alert(`WhatsApp Delivery Failed: ${errMsg}`);
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
    <div className="space-y-6 w-full max-w-none">
      {/* Top Header */}
      <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

      {/* Sub-Nav Tabs (Clean responsive wrap) */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
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
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100'
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
          <div className="lg:col-span-5 bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
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
                className="w-full p-2.5 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-brand-600"
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

          <div className="lg:col-span-7 bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                Automated Dispatch Audit Logs ({gstrLogs.length})
              </h3>
              <span className="text-[10px] text-emerald-600 font-mono font-bold">SMTP Service Active</span>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-[#1A253A] border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px]">
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
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]">
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
        <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
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
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">Client Name</label>
              <input
                type="text"
                value={clientInput}
                onChange={(e) => setClientInput(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">GSTIN</label>
              <input
                type="text"
                value={gstinInput}
                onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">Return Type</label>
              <select
                value={returnTypeInput}
                onChange={(e) => setReturnTypeInput(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-[#131C2E]"
              >
                <option value="GSTR1">GSTR-1 (Outward Supplies)</option>
                <option value="GSTR3B">GSTR-3B (Monthly Summary & Payment)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">Tax Period</label>
              <input
                type="text"
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Diagnostic Verification Results */}
          {agentReviewData ? (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A253A]/50 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
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
                    className="p-3 rounded-lg bg-white dark:bg-[#131C2E] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
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
              <div className="p-4 rounded-xl bg-white dark:bg-[#131C2E] border border-brand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
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
              <div className="col-span-3 p-12 text-center text-xs font-mono text-slate-400 bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800">
                No active document collection cases. Click "+ Open New Intake Case" to begin collecting documents.
              </div>
            ) : (
              itrCases.map((c) => (
                <div key={c.id} className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-brand-600 font-bold uppercase">
                        {c.income_profile.replace('_', ' ')}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">{c.client_name}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">{c.pan}</span>
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
                        className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-[#1A253A] hover:bg-slate-100/80 cursor-pointer border border-slate-200 dark:border-slate-800/80 text-[11px]"
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
        <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xs">
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
              <thead className="bg-slate-50 dark:bg-[#1A253A] border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px]">
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
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{p.client_name}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{p.pan}</td>
                      <td className="py-2.5 px-3 text-brand-900 font-bold">{p.covered_years.join(', ')}</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[220px]">{p.folder_path}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{p.delivery_channel}</td>
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
          <div className="lg:col-span-5 bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Client / Assessee Name *</label>
                  <input
                    type="text"
                    value={cgClientName}
                    onChange={(e) => setCgClientName(e.target.value)}
                    placeholder="e.g. Apex Global Enterprises Ltd"
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Assessee PAN *</label>
                  <input
                    type="text"
                    value={cgPan}
                    onChange={(e) => setCgPan(e.target.value.toUpperCase())}
                    placeholder="AACCA9876C"
                    maxLength={10}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Asset Class</label>
                <select
                  value={cgAssetType}
                  onChange={(e) => setCgAssetType(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-[#131C2E]"
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
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Date of Purchase</label>
                  <input
                    type="date"
                    value={cgBuyDate}
                    onChange={(e) => setCgBuyDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Date of Sale</label>
                  <input
                    type="date"
                    value={cgSaleDate}
                    onChange={(e) => setCgSaleDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Sale Consideration (₹)</label>
                  <input
                    type="number"
                    value={cgSaleVal}
                    onChange={(e) => setCgSaleVal(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Cost of Acquisition (₹)</label>
                  <input
                    type="number"
                    value={cgCostVal}
                    onChange={(e) => setCgCostVal(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Transfer Expenses (₹)</label>
                  <input
                    type="number"
                    value={cgExpenses}
                    onChange={(e) => setCgExpenses(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Exemptions u/s 54 (₹)</label>
                  <input
                    type="number"
                    value={cgExemption}
                    onChange={(e) => setCgExemption(e.target.value)}
                    className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
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

          <div className="lg:col-span-7 bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Capital Gains & Tax Working Schedule
            </h3>

            {cgResult ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800 rounded-lg">
                    <span className="text-slate-500 font-sans block text-[10px]">Holding Period</span>
                    <strong className="text-navy-950 text-sm">{cgResult.holding_months} Months</strong>
                    <span className="block text-[10px] text-brand-600 font-bold">{cgResult.gain_type}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800 rounded-lg">
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

                <div className="p-3.5 bg-slate-50 dark:bg-[#1A253A] rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
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
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1 font-bold text-navy-950">
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
        <div className="space-y-6">
          {/* Top Live Connection & Device Pairing Card */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                    Automated WhatsApp Pipeline
                  </span>
                  <span className="text-xs font-mono text-slate-400">| Strict Real-Transmission Mode</span>
                </div>
                <h3 className="text-sm font-bold text-navy-950 mt-1 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Office WhatsApp Connection & Executive Dispatch</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Links directly with office WhatsApp to dispatch daily executive briefings to the "Team PMSC" group without simulations or third-party markups.
                </p>
              </div>

              {/* Real Connection Status Badge & Actions */}
              <div className="flex items-center space-x-2.5">
                <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono ${
                  waStatus?.is_connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : (waStatus?.state === 'AWAITING_QR' || waStatus?.state === 'QR_READY')
                    ? 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse'
                    : waStatus?.state === 'CONNECTING'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {waStatus?.is_connected ? (
                    <>
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-bold">🟢 CONNECTED ({waStatus.connected_user?.phone || waStatus.connected_user?.id || 'Office WhatsApp'})</span>
                    </>
                  ) : (waStatus?.state === 'AWAITING_QR' || waStatus?.state === 'QR_READY') ? (
                    <>
                      <QrCode className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold">🟡 SCAN QR TO CONNECT</span>
                    </>
                  ) : waStatus?.state === 'CONNECTING' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      <span className="font-bold">🟡 CONNECTING...</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                      <span className="font-bold">🔴 DISCONNECTED</span>
                    </>
                  )}
                </div>

                <button
                  onClick={fetchWaStatus}
                  disabled={loadingWaStatus}
                  title="Refresh Connection Status"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingWaStatus ? 'animate-spin' : ''}`} />
                </button>

                {waStatus?.is_connected && (
                  <button
                    onClick={handleLogoutSession}
                    disabled={loggingOutSession}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{loggingOutSession ? 'Unlinking...' : 'Unlink Device'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* PAIRING COCKPIT (When pairing is in progress) */}
            {!waStatus?.is_connected && (isPairingActive || waStatus?.state === 'AWAITING_QR' || waStatus?.state === 'QR_READY' || waStatus?.state === 'CONNECTING' || waStatus?.state === 'PAIRING_CODE_READY' || waStatus?.qr_code) && (
              <div className="p-6 bg-gradient-to-b from-amber-50/70 to-white rounded-xl border border-amber-200 space-y-4">
                {/* Method Switcher Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200/70 gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold tracking-wide">
                      <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                      <span>Link Office WhatsApp Device</span>
                    </span>
                    <h4 className="text-sm font-bold text-navy-950 mt-1">
                      Choose Your Preferred Pairing Method
                    </h4>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-amber-100/70 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => { setPairingMethod('QR'); handleStartQRScan(); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                        pairingMethod === 'QR' ? 'bg-white dark:bg-[#131C2E] text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>1. Camera QR Scan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPairingMethod('CODE')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                        pairingMethod === 'CODE' ? 'bg-white dark:bg-[#131C2E] text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>2. Phone Pairing Code</span>
                    </button>
                  </div>
                </div>

                {/* Option 1: QR Code Scan */}
                {pairingMethod === 'QR' && (
                  <div className="text-center space-y-3 py-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      1. Open WhatsApp on office phone &nbsp;•&nbsp; 2. Tap <strong>Linked Devices</strong> &nbsp;•&nbsp; 3. Tap <strong>Link a Device</strong> &nbsp;•&nbsp; 4. Scan the QR code below:
                    </p>

                    {waStatus?.qr_code ? (
                      <div className="inline-block p-4 bg-white dark:bg-[#131C2E] rounded-2xl border-2 border-slate-900 shadow-xl">
                        <img
                          src={waStatus.qr_code}
                          alt="WhatsApp Pairing QR Code"
                          className="w-56 h-56 mx-auto object-contain"
                        />
                        <div className="mt-2 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                          <span>Waiting for phone scan (auto-detects)...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-10 max-w-sm mx-auto bg-white dark:bg-[#131C2E] rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
                        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                        <p className="text-xs font-semibold text-navy-950">
                          {startingQRSession ? 'Starting WhatsApp Web session...' : 'Generating fresh QR code...'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Connecting to WhatsApp Web socket daemon on server.
                        </p>
                        <button
                          type="button"
                          onClick={handleStartQRScan}
                          disabled={startingQRSession}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                        >
                          Regenerate QR
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Option 2: 8-Digit Pairing Code */}
                {pairingMethod === 'CODE' && (
                  <div className="max-w-md mx-auto text-center space-y-4 py-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      No camera needed! Enter your phone number with country code (e.g. <code>919876543210</code>) to generate an 8-character pairing code:
                    </p>

                    {pairingCodeDisplay || waStatus?.pairing_code ? (
                      <div className="p-5 bg-white dark:bg-[#131C2E] rounded-xl border-2 border-emerald-600 shadow-lg space-y-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Your Official WhatsApp Pairing Code
                        </span>
                        <div className="text-3xl font-mono font-extrabold tracking-widest text-navy-950 select-all">
                          {pairingCodeDisplay || waStatus?.pairing_code}
                        </div>
                        <div className="text-left bg-slate-50 dark:bg-[#1A253A] p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 space-y-1">
                          <p className="font-bold text-navy-950">How to enter on phone:</p>
                          <p>1. Open WhatsApp &gt; Settings (or ⋮) &gt; <strong>Linked Devices</strong></p>
                          <p>2. Tap <strong>Link a Device</strong></p>
                          <p>3. Tap <strong>&quot;Link with phone number instead&quot;</strong> at the bottom</p>
                          <p>4. Enter the code above: <strong className="font-mono">{pairingCodeDisplay || waStatus?.pairing_code}</strong></p>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center justify-center gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                          <span>Waiting for code confirmation on phone...</span>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleRequestPairingCode} className="space-y-3">
                        <div className="text-left">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Office Phone Number (with Country Code)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 919876543210 or +91 98765 43210"
                            value={pairingPhoneInput}
                            onChange={(e) => setPairingPhoneInput(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                          />
                          <span className="text-[10px] text-slate-400">Include country code: 91 for India</span>
                        </div>

                        <button
                          type="submit"
                          disabled={requestingPairingCode || !pairingPhoneInput.trim()}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-xs"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>{requestingPairingCode ? 'Requesting Code from WhatsApp...' : 'Get 8-Digit Pairing Code'}</span>
                        </button>
                      </form>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-amber-200/70 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => { setIsPairingActive(false); handleLogoutSession(); }}
                    className="text-slate-500 hover:text-slate-800 underline"
                  >
                    Cancel pairing session
                  </button>
                  <button
                    type="button"
                    onClick={fetchWaStatus}
                    className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Check Connection Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* INITIAL DISCONNECTED CALL-TO-ACTION */}
            {!waStatus?.is_connected && !isPairingActive && waStatus?.state !== 'AWAITING_QR' && waStatus?.state !== 'QR_READY' && waStatus?.state !== 'CONNECTING' && waStatus?.state !== 'PAIRING_CODE_READY' && !waStatus?.qr_code && (
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-brand-600" />
                    <span>Connect Office WhatsApp (Direct QR Scan & Pairing Code)</span>
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xl">
                    Scan a pairing QR code using the office WhatsApp phone, or enter your phone number to get an 8-character pairing code. Once linked, you can pick "Team PMSC" from your real joined groups list and dispatch live summaries.
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={handleStartQRScan}
                    disabled={startingQRSession}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{startingQRSession ? 'Generating...' : 'Link Office Phone (Scan QR or Code)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TARGET GROUP DISCOVERY & SELECTION BAR */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A253A]/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Target Broadcast Group:</span>
                </span>
                <span className="font-mono text-slate-500 text-[11px]">
                  {selectedGroupName} {selectedGroupId ? `(${selectedGroupId})` : '(Not selected)'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {waGroups.length > 0 ? (
                  <select
                    value={selectedGroupId}
                    onChange={(e) => {
                      const grp = waGroups.find(g => g.id === e.target.value);
                      if (grp) handleSelectGroup(grp.id, grp.name);
                    }}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white dark:bg-[#131C2E]"
                  >
                    <option value="">-- Choose WhatsApp Group --</option>
                    {waGroups.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} {g.is_pmsc ? '★ (PMSC)' : ''}
                      </option>
                    ))}
                  </select>
                ) : null}

                <button
                  onClick={handleFetchGroups}
                  disabled={loadingGroups || !waStatus?.is_connected}
                  className="px-3 py-1.5 bg-white dark:bg-[#131C2E] hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingGroups ? 'animate-spin' : ''}`} />
                  <span>{loadingGroups ? 'Loading...' : 'Select from Joined Groups'}</span>
                </button>
              </div>
            </div>

            {/* Daily Auto-Scheduler Bar */}
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span className="font-semibold text-slate-700">Automated Daily Dispatch Schedule:</span>
                <span className="font-mono text-slate-500">Every evening (Monday – Saturday)</span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="px-2.5 py-1 border border-slate-300 rounded text-xs font-mono bg-white dark:bg-[#131C2E]"
                />
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Auto-Send Enabled (IST)</span>
                </label>
                <button
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule}
                  className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded text-xs transition-colors disabled:opacity-50"
                >
                  {savingSchedule ? 'Saving...' : 'Update'}
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* LIVE INCOMING WHATSAPP CLIENT MESSAGES & UNREAD TRACKER  */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                    <Inbox className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                    Incoming Client Messages & Unread Tracker
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    unreadCount > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {unreadCount} Unread
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tracks incoming WhatsApp client chats throughout the day. Automatically synthesizes key updates and includes full unread details in the daily briefing.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchUnreadMessages}
                  disabled={loadingUnreads}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUnreads ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>Refresh</span>
                </button>

                {unreadCount > 0 && (
                  <button
                    onClick={() => handleMarkAsRead(undefined, true)}
                    disabled={markingRead}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{markingRead ? 'Updating...' : 'Mark All as Read'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Display state based on connection and unread count */}
            {!waStatus?.is_connected ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex items-center space-x-3">
                <WifiOff className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700">WhatsApp Not Connected: </span>
                  <span>Link your office WhatsApp above to capture live incoming client messages and unread digests. No dummy messages are simulated.</span>
                </div>
              </div>
            ) : unreadMessages.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="font-bold">All Caught Up! </span>
                  <span>No unread WhatsApp messages pending review. New messages will automatically appear here as clients text the office.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {unreadMessages.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50 dark:bg-[#1A253A]/80 hover:bg-slate-100/70 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 transition-colors text-xs"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-navy-950 truncate">{m.sender_name}</span>
                        {m.is_group && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 dark:text-slate-400 font-mono text-[9px]">
                            Group: {m.chat_name}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {m.formatted_time || m.timestamp}
                        </span>
                      </div>
                      <p className="text-slate-700 font-sans leading-relaxed break-words bg-white dark:bg-[#131C2E] p-2 rounded border border-slate-200 dark:border-slate-800/80">
                        "{m.message_text}"
                      </p>
                    </div>

                    <button
                      onClick={() => handleMarkAsRead([m.id], false)}
                      disabled={markingRead}
                      title="Mark this message as reviewed"
                      className="p-1.5 hover:bg-emerald-100 text-slate-400 hover:text-emerald-700 rounded-md transition-colors flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* MONTHLY CLIENT TDS & GST REPORT TRACKER & AUTO-REMINDER COCKPIT */}
          {/* ============================================================== */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                    <FileCheck2 className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                    Monthly Client TDS & GST Report Tracker
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                    Cycle: {reportTracker?.period || 'Current Month'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Daily WhatsApp reminders auto-ignore clients who already submitted their reports. Received files auto-save to Desktop.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchReportTracker}
                  disabled={loadingReportTracker}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingReportTracker ? 'animate-spin text-brand-600' : ''}`} />
                  <span>Refresh Tracker</span>
                </button>

                {reportTracker?.pending_count > 0 && (
                  <button
                    onClick={() => handleSendReportReminders()}
                    disabled={sendingReminders || !waStatus?.can_send}
                    className="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-xs"
                    title={!waStatus?.can_send ? 'Link WhatsApp phone first to send reminders' : ''}
                  >
                    <Send className={`w-3.5 h-3.5 ${sendingReminders ? 'animate-bounce' : ''}`} />
                    <span>{sendingReminders ? 'Sending...' : `Send Reminder to Pending (${reportTracker.pending_count})`}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metric Counters & Sub-Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#1A253A] p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-slate-500">Clients Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  ✓ {reportTracker?.received_count || 0} Received
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                  ⏳ {reportTracker?.pending_count || 0} Pending
                </span>
              </div>

              <div className="flex items-center space-x-1 font-sans">
                <button
                  type="button"
                  onClick={() => setReportTrackerSubTab('PENDING')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    reportTrackerSubTab === 'PENDING' ? 'bg-white dark:bg-[#131C2E] text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-100'
                  }`}
                >
                  1. Pending / Not Received ({reportTracker?.pending_count || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setReportTrackerSubTab('RECEIVED')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    reportTrackerSubTab === 'RECEIVED' ? 'bg-white dark:bg-[#131C2E] text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-100'
                  }`}
                >
                  2. Received & Auto-Saved ({reportTracker?.received_count || 0})
                </button>
              </div>
            </div>

            {/* Search Bar & Pagination Controls for Clients in Tracker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-[#1A253A]/70 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search client, GSTIN or phone..."
                  value={trackerSearch}
                  onChange={(e) => { setTrackerSearch(e.target.value); setTrackerPage(1); }}
                  className="w-full pl-7 pr-6 py-1 text-xs bg-white dark:bg-[#131C2E] border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-brand-500"
                />
                {trackerSearch && (
                  <button onClick={() => { setTrackerSearch(''); setTrackerPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">×</button>
                )}
              </div>

              {/* Page Controls */}
              {(() => {
                const list = reportTrackerSubTab === 'PENDING' ? (reportTracker?.pending || []) : (reportTracker?.received || []);
                const filtered = list.filter((c: any) => {
                  if (!trackerSearch.trim()) return true;
                  const q = trackerSearch.toLowerCase();
                  return (c.client_name && c.client_name.toLowerCase().includes(q)) || (c.gstin && c.gstin.toLowerCase().includes(q)) || (c.phone && c.phone.toLowerCase().includes(q));
                });
                const totalPages = Math.ceil(filtered.length / trackerPageSize) || 1;
                return (
                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="text-slate-500">
                      Showing {Math.min(filtered.length, (trackerPage - 1) * trackerPageSize + 1)}–{Math.min(filtered.length, trackerPage * trackerPageSize)} of {filtered.length}
                    </span>
                    <button
                      onClick={() => setTrackerPage(p => Math.max(1, p - 1))}
                      disabled={trackerPage <= 1}
                      className="px-2 py-0.5 bg-white dark:bg-[#131C2E] border border-slate-200 dark:border-slate-800 rounded text-slate-700 disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <span className="text-slate-700 font-bold">{trackerPage}/{totalPages}</span>
                    <button
                      onClick={() => setTrackerPage(p => Math.min(totalPages, p + 1))}
                      disabled={trackerPage >= totalPages}
                      className="px-2 py-0.5 bg-white dark:bg-[#131C2E] border border-slate-200 dark:border-slate-800 rounded text-slate-700 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* List 1: Pending Clients */}
            {reportTrackerSubTab === 'PENDING' && (() => {
              const pendingList = (reportTracker?.pending || []).filter((c: any) => {
                if (!trackerSearch.trim()) return true;
                const q = trackerSearch.toLowerCase();
                return (c.client_name && c.client_name.toLowerCase().includes(q)) || (c.gstin && c.gstin.toLowerCase().includes(q)) || (c.phone && c.phone.toLowerCase().includes(q));
              });
              const pageItems = pendingList.slice((trackerPage - 1) * trackerPageSize, trackerPage * trackerPageSize);

              return (
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                  {pendingList.length === 0 ? (
                    <div className="p-6 bg-emerald-50/50 rounded-lg border border-emerald-200 text-center space-y-1 text-emerald-800 text-xs">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                      <p className="font-bold">No Pending Clients</p>
                      <p className="text-[11px] text-emerald-700">All matched clients have submitted their reports or none match your search query.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#1A253A] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Client / Company Name</th>
                          <th className="py-2 px-3">GSTIN</th>
                          <th className="py-2 px-3">Phone</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pageItems.map((client: any) => (
                          <tr key={client.customer_id || client.client_name} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]/70">
                            <td className="py-2 px-3 font-semibold text-navy-950">{client.client_name}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{client.gstin || 'N/A'}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{client.phone || 'No Phone'}</td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[10px] font-bold">
                                PENDING
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleSendReportReminders(client.customer_id ? [client.customer_id] : undefined)}
                                disabled={sendingReminders || !waStatus?.can_send || !client.phone}
                                className="px-2 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 dark:text-slate-400 rounded text-[11px] font-semibold transition-colors disabled:opacity-40"
                              >
                                Send Reminder
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}

            {/* List 2: Received Clients */}
            {reportTrackerSubTab === 'RECEIVED' && (() => {
              const receivedList = (reportTracker?.received || []).filter((c: any) => {
                if (!trackerSearch.trim()) return true;
                const q = trackerSearch.toLowerCase();
                return (c.client_name && c.client_name.toLowerCase().includes(q)) || (c.file_path && c.file_path.toLowerCase().includes(q));
              });
              const pageItems = receivedList.slice((trackerPage - 1) * trackerPageSize, trackerPage * trackerPageSize);

              return (
                <div className="overflow-x-auto max-h-[360px] overflow-y-auto pr-1">
                  {receivedList.length === 0 ? (
                    <div className="p-6 bg-slate-50 dark:bg-[#1A253A] rounded-lg border border-slate-200 dark:border-slate-800 text-center space-y-1 text-slate-500 text-xs">
                      <Clock className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="font-semibold text-navy-950">No Reports Received Yet</p>
                      <p className="text-[11px]">When clients reply on WhatsApp with their statement or PDF, it will auto-save to Desktop and appear here.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-[#1A253A] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Client / Company Name</th>
                          <th className="py-2 px-3">Received Timestamp</th>
                          <th className="py-2 px-3">Local Desktop File Path</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pageItems.map((client: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]/70">
                            <td className="py-2 px-3 font-semibold text-navy-950">{client.client_name}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">{client.received_at || 'Just Now'}</td>
                            <td className="py-2 px-3 font-mono text-[10px] text-emerald-800 max-w-xs truncate" title={client.file_path}>
                              {client.file_path || 'Saved in ~/Desktop/<Client>/TDS_GST_Reports/'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                                ✓ RECEIVED
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Generator Input & Action Box */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Summary Synthesis & Daily Input
                </h4>
                <p className="text-xs text-slate-500">
                  Aggregates from system audit logs, open notices, and bank reconciliations, or supplement with today's operational notes below.
                </p>
              </div>

              <button
                onClick={handleGenerateOfficeSummary}
                disabled={generatingSummary}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingSummary ? 'animate-spin' : ''}`} />
                <span>{generatingSummary ? 'Synthesizing Updates...' : 'Generate Today\'s Summary'}</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Additional Daily Highlights / Meeting Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={rawNotesInput}
                onChange={(e) => setRawNotesInput(e.target.value)}
                placeholder="e.g. Biraju Bhai cleared 148A hearing; HDFC payment approved for client Zenith; Priya dispatched October GSTR-1s..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Active Summary Live Preview & Dispatch Card */}
          {summaryData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* WhatsApp Live Typography Preview & Detailed Sub-Tabs */}
              <div className="lg:col-span-7 bg-[#EFEAE2] p-5 rounded-xl border border-slate-300 space-y-3 font-mono text-xs text-slate-900 dark:text-slate-100 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-300 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-emerald-800 font-sans flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Preview ({selectedGroupName})</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-sans font-bold">
                      {summaryData.unread_count || 0} Unread Included
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 font-sans">
                    <button
                      type="button"
                      onClick={() => setSummaryViewTab('FULL')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        summaryViewTab === 'FULL' ? 'bg-white dark:bg-[#131C2E] text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      Complete Bubble (Part 1 & 2)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryViewTab('PARTS')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        summaryViewTab === 'PARTS' ? 'bg-white dark:bg-[#131C2E] text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      Part 1: Summary
                    </button>
                    <button
                      type="button"
                      onClick={() => setSummaryViewTab('UNREAD_LIST')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                        summaryViewTab === 'UNREAD_LIST' ? 'bg-white dark:bg-[#131C2E] text-navy-950 shadow-xs' : 'text-slate-600 hover:text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      Part 2: Unread List ({summaryData.unread_count || 0})
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(summaryData.formatted_text);
                        alert('Formatted summary copied to clipboard.');
                      }}
                      className="text-[10px] bg-white dark:bg-[#131C2E] px-2 py-1 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800 flex items-center gap-1 font-semibold ml-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tab 1: Complete WhatsApp Preformatted Bubble */}
                {summaryViewTab === 'FULL' && (
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800 bg-white dark:bg-[#131C2E] p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs max-h-[460px] overflow-y-auto">
                    {summaryData.formatted_text}
                  </pre>
                )}

                {/* Sub-Tab 2: Part 1 Executive Briefing Breakdown */}
                {summaryViewTab === 'PARTS' && (
                  <div className="space-y-3 font-sans max-h-[460px] overflow-y-auto pr-1">
                    <div className="p-3.5 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <h5 className="text-[11px] font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />
                        <span>Key Decisions & Client Updates</span>
                      </h5>
                      <ul className="space-y-1 text-xs text-slate-700 pl-4 list-disc">
                        {summaryData.key_decisions?.map((kd: string, idx: number) => (
                          <li key={idx}>{kd}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <h5 className="text-[11px] font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                        <ListChecks className="w-3.5 h-3.5 text-amber-600" />
                        <span>Action Items & Assigned Owners</span>
                      </h5>
                      <div className="space-y-1.5">
                        {summaryData.action_items?.map((ai: any, idx: number) => (
                          <div key={idx} className="p-2 bg-slate-50 dark:bg-[#1A253A] rounded border border-slate-100 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{ai.task}</span>
                            <span className="text-[11px] font-mono text-slate-500">
                              @{ai.owner} • {ai.deadline}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <h5 className="text-[11px] font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Blockers & Pending Follow-Ups</span>
                      </h5>
                      <ul className="space-y-1 text-xs text-slate-700 pl-4 list-disc">
                        {summaryData.blockers?.map((b: string, idx: number) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 3: Part 2 Unread Messages Itemized Detail */}
                {summaryViewTab === 'UNREAD_LIST' && (
                  <div className="space-y-2 font-sans max-h-[460px] overflow-y-auto pr-1">
                    {!summaryData.unread_messages || summaryData.unread_messages.length === 0 ? (
                      <div className="p-6 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800 text-center space-y-1 text-slate-500">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                        <p className="font-semibold text-xs text-navy-950">No Unread Messages Included</p>
                        <p className="text-[11px]">All client chats were caught up prior to summary generation.</p>
                      </div>
                    ) : (
                      summaryData.unread_messages.map((m: any, idx: number) => (
                        <div key={m.id || idx} className="p-3 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-navy-950">
                              {idx + 1}. {m.sender_name} {m.chat_name && m.is_group ? `(${m.chat_name})` : ''}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {m.formatted_time || m.timestamp}
                            </span>
                          </div>
                          <p className="text-slate-700 bg-slate-50 dark:bg-[#1A253A] p-2 rounded border border-slate-100 italic">
                            "{m.message_text}"
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Action Sidebar */}
              <div className="lg:col-span-5 bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Dispatch Control
                </h4>
                <p className="text-xs text-slate-500">
                  Transmits directly to the genuine "{selectedGroupName}" group via connected WhatsApp session. Fake delivery simulation is strictly prevented.
                </p>

                <div className="p-3 bg-slate-50 dark:bg-[#1A253A] rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Summary Date:</span>
                    <span className="font-bold text-slate-800">{summaryData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Channel:</span>
                    <span className="font-bold text-emerald-700">{selectedGroupName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unread Included:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{summaryData.unread_count || 0} Messages</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dispatch Status:</span>
                    <span className={`font-bold ${summaryData.posted ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {summaryData.dispatch_status || (summaryData.posted ? 'POSTED_TO_PMSC' : 'READY_TO_SEND')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gateway Link:</span>
                    <span className={`font-bold ${waStatus?.can_send ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {waStatus?.can_send ? '🟢 GENUINE SESSION READY' : '🔴 DISCONNECTED (SEND BLOCKED)'}
                    </span>
                  </div>
                </div>

                {/* Error Banner if Send Failed */}
                {realSendError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>Dispatch Rejected / Failed</span>
                    </div>
                    <p className="text-[11px] font-mono leading-relaxed">{realSendError}</p>
                  </div>
                )}

                {/* Success Banner with genuine Message ID */}
                {realSendSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Verified Live Transmission</span>
                    </div>
                    <p className="text-[11px] font-mono">
                      Message ID: <strong className="text-slate-900 dark:text-slate-100">{realSendSuccess.message_id || 'Delivered'}</strong>
                    </p>
                  </div>
                )}

                {/* Dispatch Button - Strictly Disabled if not can_send */}
                {summaryData.posted ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Successfully Dispatched to {selectedGroupName}</span>
                  </div>
                ) : (
                  <button
                    onClick={handlePostToPmsc}
                    disabled={postingToPmsc || !waStatus?.can_send}
                    className={`w-full py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-xs ${
                      waStatus?.can_send
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    title={!waStatus?.can_send ? 'Link WhatsApp Phone to Send (Real Transmission Required)' : ''}
                  >
                    {!waStatus?.can_send ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Link WhatsApp to Enable Broadcast</span>
                      </>
                    ) : (
                      <>
                        <Send className={`w-3.5 h-3.5 ${postingToPmsc ? 'animate-bounce' : ''}`} />
                        <span>{postingToPmsc ? 'Transmitting to WhatsApp...' : `Send Now to ${selectedGroupName}`}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Delivery Logs & Audit Trail Table */}
          <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
                  Delivery History & Audit Trail (Team PMSC Group)
                </h4>
                <p className="text-[11px] text-slate-400">
                  All summary dispatches logged with timestamp, user email and delivery status
                </p>
              </div>
              <button
                onClick={fetchSummaryHistory}
                disabled={loadingHistory}
                className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh History</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-[#1A253A]/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Target Group</th>
                    <th className="py-2.5 px-3">Unread Included</th>
                    <th className="py-2.5 px-3">Dispatch Status</th>
                    <th className="py-2.5 px-3">Sent / Logged At</th>
                    <th className="py-2.5 px-3">Triggered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        No delivery logs recorded yet. Click "Generate Today's Summary" to start.
                      </td>
                    </tr>
                  ) : (
                    summaryHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]">
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{item.summary_date}</td>
                        <td className="py-2.5 px-3 text-emerald-800 font-bold">{item.team_name}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 font-bold">
                            {item.unread_count || 0} msgs
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.dispatch_status === 'POSTED_TO_PMSC'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.dispatch_status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.dispatch_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {item.posted_at || item.created_at || 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">{item.created_by}</td>
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
      {/* 7. SKILL-SET TOOLS: CONSULTING REPORT & SALARY CALCULATION     */}
      {/* ============================================================== */}
      {activeTab === 'skill_tools' && (
        <div className="space-y-8">
          {/* Tool 1: Consulting Report Generator */}
          <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div>
              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 text-[10px] font-mono font-bold uppercase tracking-wider">
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
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Client Name</label>
                <input
                  type="text"
                  value={consultingClient}
                  onChange={(e) => setConsultingClient(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Engagement Title</label>
                <input
                  type="text"
                  value={consultingTitle}
                  onChange={(e) => setConsultingTitle(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1 font-semibold">Raw Findings & Diagnostic Notes</label>
              <textarea
                rows={2}
                value={consultingFindings}
                onChange={(e) => setConsultingFindings(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A253A]/60 space-y-4 text-xs">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                  <span className="text-[10px] font-mono font-bold text-brand-600 uppercase">CONFIDENTIAL ADVISORY</span>
                  <h4 className="text-sm font-bold text-navy-950 mt-0.5">{consultingReport.title}</h4>
                  <p className="text-[11px] text-slate-500">Prepared for: {consultingReport.client} | {consultingReport.date}</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">1. Executive Summary</h5>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{consultingReport.executive_summary}</p>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">2. Current State & Root Causes</h5>
                  <div className="space-y-1.5">
                    {consultingReport.current_state_analysis.map((c: any, i: number) => (
                      <div key={i} className="p-2.5 bg-white dark:bg-[#131C2E] rounded border border-slate-200 dark:border-slate-800 text-xs">
                        <strong className="text-navy-950">{c.issue}:</strong> <span className="text-slate-600 dark:text-slate-400">{c.root_cause}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">3. Implementation Roadmap</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {consultingReport.implementation_roadmap.map((r: any, i: number) => (
                      <div key={i} className="p-2.5 bg-white dark:bg-[#131C2E] rounded border border-slate-200 dark:border-slate-800 text-xs">
                        <strong className="text-brand-900 block font-sans">{r.phase}</strong>
                        <span className="text-slate-600 dark:text-slate-400 text-[11px] mt-1 block">{r.milestones}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tool 2: Salary Calculation Tool */}
          <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
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
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">Monthly CTC (₹)</label>
                <input
                  type="number"
                  value={ctcInput}
                  onChange={(e) => setCtcInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">Basic (% of CTC)</label>
                <input
                  type="number"
                  value={basicPctInput}
                  onChange={(e) => setBasicPctInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">HRA (% of Basic)</label>
                <input
                  type="number"
                  value={hraPctInput}
                  onChange={(e) => setHraPctInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">LOP Days</label>
                <input
                  type="number"
                  value={lopDaysInput}
                  onChange={(e) => setLopDaysInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-sans font-semibold">Monthly TDS (₹)</label>
                <input
                  type="number"
                  value={tdsMonthlyInput}
                  onChange={(e) => setTdsMonthlyInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 dark:border-slate-800 rounded-lg"
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
              <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1A253A]/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                {/* Earnings */}
                <div className="p-3 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                  <h5 className="font-bold text-navy-950 font-sans uppercase text-[11px] pb-1 border-b">Gross Earnings</h5>
                  <div className="flex justify-between"><span>Basic Pay:</span><span>₹{salaryResult.earnings.basic_salary}</span></div>
                  <div className="flex justify-between"><span>HRA:</span><span>₹{salaryResult.earnings.house_rent_allowance}</span></div>
                  <div className="flex justify-between"><span>Special Allowance:</span><span>₹{salaryResult.earnings.special_allowance}</span></div>
                  {salaryResult.earnings.lop_deduction > 0 && (
                    <div className="flex justify-between text-rose-600"><span>(-) LOP Cut:</span><span>₹{salaryResult.earnings.lop_deduction}</span></div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-1 text-slate-900 dark:text-slate-100">
                    <span>Earned Gross:</span><span>₹{salaryResult.earnings.net_gross_earned}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="p-3 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
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
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono border-t border-brand-200 pt-1">
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
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Income Profile *</label>
              <select
                value={itrProfile}
                onChange={(e) => setItrProfile(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={itrEmail}
                onChange={(e) => setItrEmail(e.target.value)}
                placeholder="client@gmail.com"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setCreateCaseModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]"
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
