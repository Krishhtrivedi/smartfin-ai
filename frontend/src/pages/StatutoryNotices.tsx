import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Clock,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Filter,
  Paperclip,
  CheckSquare,
  Square,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';

export const StatutoryNotices: React.FC = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'LAST_7_DAYS' | 'LAST_15_DAYS' | 'LAST_1_MONTH' | 'DUE_SOON' | 'OVERDUE'>('ALL');
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [noticeNumber, setNoticeNumber] = useState('');
  const [noticeType, setNoticeType] = useState('INCOME_TAX');
  const [section, setSection] = useState('143(1)');
  const [clientName, setClientName] = useState('');
  const [clientPanGstin, setClientPanGstin] = useState('');
  const [ay, setAy] = useState('2026-27');
  const [fy, setFy] = useState('2025-26');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [riskLevel, setRiskLevel] = useState('HIGH');
  const [assignedOwner, setAssignedOwner] = useState('Biraju Bhai (Birju Sir)');
  const [demandAmount, setDemandAmount] = useState('0');
  const [description, setDescription] = useState('');

  // Response notes in detail view
  const [activeNotes, setActiveNotes] = useState('');

  const fetchNotices = async () => {
    setLoading(true);
    try {
      const data = await api.getNotices();
      setNotices(data);
      if (data.length > 0 && !selectedNotice) {
        setSelectedNotice(data[0]);
        setActiveNotes(data[0].response_notes || '');
      } else if (selectedNotice) {
        const updated = data.find((n: any) => n.id === selectedNotice.id);
        if (updated) {
          setSelectedNotice(updated);
          setActiveNotes(updated.response_notes || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createNotice({
        notice_number: noticeNumber || `NOT-${Date.now()}`,
        notice_type: noticeType,
        section,
        client_name: clientName,
        client_pan_gstin: clientPanGstin.toUpperCase(),
        assessment_year: ay,
        financial_year: fy,
        issue_date: issueDate,
        due_date: dueDate,
        risk_level: riskLevel,
        assigned_owner: assignedOwner,
        demand_amount: parseFloat(demandAmount) || 0.0,
        description
      });
      setCreateModalOpen(false);
      // Reset form
      setNoticeNumber('');
      setClientName('');
      setClientPanGstin('');
      setDescription('');
      await fetchNotices();
    } catch (err: any) {
      alert(`Error registering notice: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedNotice) return;
    try {
      await api.updateNoticeStatus(selectedNotice.id, {
        status: newStatus,
        response_notes: activeNotes
      });
      await fetchNotices();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleToggleChecklist = async (index: number) => {
    if (!selectedNotice || !selectedNotice.checklist) return;
    const updatedChecklist = [...selectedNotice.checklist];
    updatedChecklist[index].done = !updatedChecklist[index].done;
    try {
      await api.updateNoticeStatus(selectedNotice.id, {
        checklist: updatedChecklist,
        response_notes: activeNotes
      });
      setSelectedNotice({ ...selectedNotice, checklist: updatedChecklist });
    } catch (err: any) {
      alert(`Failed to update checklist: ${err.message}`);
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (filterType !== 'ALL' && n.notice_type !== filterType) return false;
    if (filterRisk !== 'ALL' && n.risk_level !== filterRisk) return false;
    if (timeFilter === 'LAST_7_DAYS') {
      const d = (Date.now() - new Date(n.created_at || n.issue_date).getTime()) / (1000 * 3600 * 24);
      if (d > 7) return false;
    } else if (timeFilter === 'LAST_15_DAYS') {
      const d = (Date.now() - new Date(n.created_at || n.issue_date).getTime()) / (1000 * 3600 * 24);
      if (d > 15) return false;
    } else if (timeFilter === 'LAST_1_MONTH') {
      const d = (Date.now() - new Date(n.created_at || n.issue_date).getTime()) / (1000 * 3600 * 24);
      if (d > 30) return false;
    } else if (timeFilter === 'DUE_SOON') {
      if (n.days_remaining < 0 || n.days_remaining > 7) return false;
    } else if (timeFilter === 'OVERDUE') {
      if (n.days_remaining >= 0) return false;
    }
    return true;
  });

  const getUrgencyBadge = (days: number, status: string) => {
    if (status === 'CLOSED') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">CLOSED</span>;
    }
    if (days < 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
          <AlertOctagon className="w-3 h-3" /> OVERDUE ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1 animate-pulse">
          <Clock className="w-3 h-3" /> {days} DAYS LEFT (CRITICAL)
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {days} DAYS LEFT (URGENT)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 flex items-center gap-1">
        <Clock className="w-3 h-3" /> {days} days remaining
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-mono font-bold uppercase tracking-wider">
              Statutory Response Desk
            </span>
            <span className="text-xs font-mono text-slate-400">| Assigned Lead: Biraju Bhai (Birju Sir)</span>
          </div>
          <h2 className="text-base font-bold text-navy-950 mt-1 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <span>Statutory Notice Intake, Due-Date Tracker & Legal Response Workflow</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            End-to-end monitoring of Income Tax (143/148), GST (DRC-01/ASMT-10) and corporate compliance notices.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Intake New Notice</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Notices</p>
          <p className="text-xl font-bold text-navy-950 mt-1 font-mono">{notices.filter(n => n.status !== 'CLOSED').length}</p>
          <span className="text-[10px] text-slate-500">Under active monitoring</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Urgent / Critical (&lt;7d)</p>
          <p className="text-xl font-bold text-rose-600 mt-1 font-mono">
            {notices.filter(n => n.status !== 'CLOSED' && n.days_remaining <= 7).length}
          </p>
          <span className="text-[10px] text-rose-600">Immediate filing attention</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned to Birju Sir</p>
          <p className="text-xl font-bold text-brand-900 mt-1 font-mono">
            {notices.filter(n => n.assigned_owner.includes('Birju')).length}
          </p>
          <span className="text-[10px] text-slate-500">Senior partner oversight</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Disputed Demand</p>
          <p className="text-xl font-bold text-navy-950 mt-1 font-mono">
            ₹{notices.reduce((sum, n) => sum + (n.demand_amount || 0), 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-500">Aggregate claim value</span>
        </div>
      </div>

      {/* Main 2-Column Split: List on Left, Detail & Response on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Notice Registry (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Statutory Notice Registry ({filteredNotices.length})
            </h3>
            
            <div className="flex items-center space-x-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50"
              >
                <option value="ALL">All Authorities</option>
                <option value="INCOME_TAX">Income Tax</option>
                <option value="GST">GST Authority</option>
                <option value="ROC">ROC / MCA</option>
              </select>

              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Time Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold mr-1">Time Horizon:</span>
            {[
              { key: 'ALL', label: 'All Notices' },
              { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { key: 'LAST_15_DAYS', label: 'Last 15 Days' },
              { key: 'LAST_1_MONTH', label: 'Last 1 Month' },
              { key: 'DUE_SOON', label: 'Due Soon (≤7d)' },
              { key: 'OVERDUE', label: 'Overdue' },
            ].map(chip => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setTimeFilter(chip.key as any)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                  timeFilter === chip.key
                    ? 'bg-[#1A2F46] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredNotices.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-400">
                No statutory notices currently in queue. Click "+ Intake New Notice" to register one.
              </div>
            ) : (
              filteredNotices.map((n) => {
                const isSelected = selectedNotice?.id === n.id;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setSelectedNotice(n);
                      setActiveNotes(n.response_notes || '');
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/30 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {n.notice_type} // Sec {n.section}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{n.client_name}</h4>
                      </div>
                      {getUrgencyBadge(n.days_remaining, n.status)}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>PAN/GSTIN: <strong className="text-slate-800">{n.client_pan_gstin}</strong></span>
                      <span>AY: {n.assessment_year}</span>
                      <span>Due: <strong className="text-navy-950">{n.due_date}</strong></span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3 text-brand-600" />
                        <strong className="text-slate-800">{n.assigned_owner}</strong>
                      </span>
                      <div className="flex items-center space-x-2">
                        {n.demand_amount > 0 && (
                          <span className="font-mono text-rose-600 font-bold text-[11px]">
                            Demand: ₹{n.demand_amount.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          n.status === 'FILED' ? 'bg-emerald-100 text-emerald-800' :
                          n.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {n.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Notice Workspace & Response Builder (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 space-y-5 shadow-xs">
          {selectedNotice ? (
            <>
              {/* Header */}
              <div className="pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-brand-600 font-bold uppercase">
                    Notice ID: {selectedNotice.notice_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedNotice.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                    selectedNotice.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedNotice.risk_level} RISK
                  </span>
                </div>
                <h3 className="text-sm font-bold text-navy-950 mt-1">
                  {selectedNotice.client_name} — Section {selectedNotice.section}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned to: <strong className="text-slate-800">{selectedNotice.assigned_owner}</strong>
                </p>
              </div>

              {/* Status Workflow Progression */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Response Workflow Progression
                </label>
                <div className="grid grid-cols-5 gap-1 text-[10px] font-semibold text-center">
                  {[
                    { key: 'RECEIVED', label: 'Received' },
                    { key: 'UNDER_REVIEW', label: 'Reviewing' },
                    { key: 'DRAFTING_REPLY', label: 'Drafting' },
                    { key: 'FILED', label: 'Filed' },
                    { key: 'CLOSED', label: 'Closed' }
                  ].map((step) => {
                    const isCurrent = selectedNotice.status === step.key;
                    return (
                      <button
                        key={step.key}
                        onClick={() => handleStatusChange(step.key)}
                        className={`py-1.5 px-1 rounded transition-colors ${
                          isCurrent
                            ? 'bg-brand-600 text-white font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Checklist */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Statutory Checklist & Defense Prep
                </label>
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  {(selectedNotice.checklist || []).map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      onClick={() => handleToggleChecklist(idx)}
                      className="flex items-center space-x-2 cursor-pointer hover:text-brand-700"
                    >
                      {item.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className={item.done ? 'line-through text-slate-400' : 'text-slate-700'}>
                        {item.task}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal Reply & Response Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Draft Reply Notes & Legal Grounds
                </label>
                <textarea
                  rows={4}
                  value={activeNotes}
                  onChange={(e) => setActiveNotes(e.target.value)}
                  placeholder="Enter legal defense grounds, cross-examination points, judicial citations (e.g. Supreme Court ruling on Section 148)..."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600 font-sans"
                />
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedNotice.status)}
                  className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
                >
                  Save Response Notes
                </button>
              </div>

              {/* Attachments Section */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Attachments & Working Sheets
                </label>
                <div className="space-y-1.5">
                  {(selectedNotice.attachments || []).map((file: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs"
                    >
                      <span className="flex items-center gap-1.5 text-slate-700 truncate max-w-[220px]">
                        <Paperclip className="w-3.5 h-3.5 text-brand-600" />
                        {file}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        ATTACHED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs font-mono text-slate-400">
              Select a statutory notice from the registry to inspect working notes, checklist & defense reply.
            </div>
          )}
        </div>
      </div>

      {/* Intake Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Intake Statutory Notice"
        subtitle="Register incoming Income Tax, GST, or Corporate statutory notice"
      >
        <form onSubmit={handleCreateNotice} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Authority / Type *</label>
              <select
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value="INCOME_TAX">Income Tax Department</option>
                <option value="GST">GST Department</option>
                <option value="ROC">Registrar of Companies (ROC)</option>
                <option value="PF_ESIC">EPFO / ESIC</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Section / Form *</label>
              <input
                type="text"
                required
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. 143(1), 148, DRC-01"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Zenith Global LLP"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client PAN / GSTIN *</label>
              <input
                type="text"
                required
                value={clientPanGstin}
                onChange={(e) => setClientPanGstin(e.target.value.toUpperCase())}
                placeholder="AAACZ1234F"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date *</label>
              <input
                type="date"
                required
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Statutory Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Lead / Owner *</label>
              <select
                value={assignedOwner}
                onChange={(e) => setAssignedOwner(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value="Biraju Bhai (Birju Sir)">Biraju Bhai (Birju Sir)</option>
                <option value="Pinal Shah">Pinal Shah</option>
                <option value="Nilesh Jain">Nilesh Jain</option>
                <option value="Operations Staff">Operations Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Risk / Priority Level *</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
              >
                <option value="CRITICAL">Critical (High Demand / Penalty Risk)</option>
                <option value="HIGH">High (Disallowance proposed)</option>
                <option value="MEDIUM">Medium (Data verification request)</option>
                <option value="LOW">Low (Routine intimation)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Disputed Demand Amount (₹)</label>
            <input
              type="number"
              value={demandAmount}
              onChange={(e) => setDemandAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Summary & Allegations</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of discrepancy or mismatch alleged by the assessing officer..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Notice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
