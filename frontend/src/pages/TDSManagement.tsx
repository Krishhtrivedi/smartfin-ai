import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { TDSRecord } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const TDSManagement: React.FC = () => {
  const [records, setRecords] = useState<TDSRecord[]>([]);
  const [rules, setRules] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [quarter, setQuarter] = useState('Q3');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Challan mapping modal
  const [challanModalOpen, setChallanModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TDSRecord | null>(null);
  const [bsrCode, setBsrCode] = useState('0210001');
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recList, rulesData] = await Promise.all([
        api.getTDSRecords({
          quarter,
          section: sectionFilter !== 'ALL' ? sectionFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        api.getTDSRules(),
      ]);
      setRecords(recList);
      setRules(rulesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [quarter, sectionFilter, statusFilter]);

  const handleRunCompliance = async () => {
    setReconciling(true);
    try {
      await api.runTDSReconciliation(quarter);
      await fetchData();
    } catch (err: any) {
      alert(`Error running TDS compliance: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  const handleChallanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !challanNo) return;
    try {
      await api.updateTDSChallan(selectedRecord.id, bsrCode, challanNo, challanDate);
      setChallanModalOpen(false);
      setSelectedRecord(null);
      setChallanNo('');
      await fetchData();
    } catch (err: any) {
      alert(`Error updating challan: ${err.message}`);
    }
  };

  // Stats
  const totalBase = records.reduce((s, r) => s + r.base_amount, 0);
  const totalExpected = records.reduce((s, r) => s + r.expected_tds, 0);
  const totalActual = records.reduce((s, r) => s + r.actual_deducted, 0);
  const shortfall = Math.max(0, totalExpected - totalActual);
  const shortCount = records.filter((r) => r.status === 'SHORT_DEDUCTED').length;
  const lateCount = records.filter((r) => r.status === 'LATE_DEPOSIT').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FILING_READY':
        return <Badge variant="success">Filing Ready (Challan Mapped)</Badge>;
      case 'DEPOSITED':
        return <Badge variant="info">Deposited in Bank</Badge>;
      case 'VERIFIED':
        return <Badge variant="neutral">Verified</Badge>;
      case 'SHORT_DEDUCTED':
        return <Badge variant="danger">Short Deduction</Badge>;
      case 'LATE_DEPOSIT':
        return <Badge variant="warning">Late Deposit Alert</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none">
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-brand-600" />
            <span>TDS / TCS Statutory Compliance & Form 26Q Preparation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable section rules, deduction thresholds, challan mapping & short deduction alerts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunCompliance}
            disabled={reconciling}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            <span>{reconciling ? 'Checking...' : 'Run Compliance Engine'}</span>
          </button>

          <button
            onClick={() => api.exportTDS26Q(quarter)}
            className="px-3.5 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Form 26Q Excel</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Base Turnover</p>
          <p className="text-xl font-bold text-navy-950 mt-1">₹{totalBase.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statutory Expected TDS</p>
          <p className="text-xl font-bold text-navy-950 mt-1">₹{totalExpected.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Actual Deducted</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">₹{totalActual.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Shortfall / Short Deductions</p>
          <p className="text-xl font-bold text-rose-600 mt-1">{shortCount} ({`₹${shortfall.toLocaleString('en-IN')}`})</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Late Deposit Alerts</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{lateCount} entries</p>
        </div>
      </div>

      {/* Statutory Section Master Badges */}
      <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2">
          Applicable Statutory Sections & Configured Rates
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {Object.entries(rules).map(([sec, r]: [string, any]) => (
            <div key={sec} className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#1A253A] border border-slate-200 dark:border-slate-800">
              <span className="font-bold font-mono text-brand-700">Sec {sec}</span>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">{r.description}</p>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">
                Rate: {r.default_rate}% • Threshold: ₹{(r.threshold_single / 1000).toFixed(0)}k
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#131C2E] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quarter:</span>
          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuarter(q)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                quarter === q
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {q} (FY 2026-27)
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 ml-auto">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-[#1A253A] focus:outline-none"
          >
            <option value="ALL">All Sections</option>
            <option value="194C">194C (Contractors)</option>
            <option value="194J">194J (Professional / Tech)</option>
            <option value="194I">194I (Rent)</option>
            <option value="194Q">194Q (Goods &gt; 50L)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-[#1A253A] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SHORT_DEDUCTED">Short Deductions</option>
            <option value="LATE_DEPOSIT">Late Deposit Alerts</option>
            <option value="FILING_READY">Filing Ready</option>
          </select>
        </div>
      </div>

      {/* TDS Records Table */}
      <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1A253A]/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Deductee & PAN</th>
                <th className="py-3 px-4">Invoice / Date</th>
                <th className="py-3 px-4 text-right">Base Amount</th>
                <th className="py-3 px-4 text-right">Expected @ Rate</th>
                <th className="py-3 px-4 text-right">Actual Deducted</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Compliance Status</th>
                <th className="py-3 px-4 text-center">Challan 281</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
                    Checking TDS & TCS statutory compliance...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No TDS records found for {quarter}.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]/60">
                    <td className="py-3 px-4">
                      <span className="font-bold font-mono text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        {r.section}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">{r.entity_name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{r.entity_pan}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{r.invoice_number || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">{r.transaction_date}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      ₹{r.base_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-400">
                      ₹{r.expected_tds.toLocaleString('en-IN')} ({r.applicable_rate}%)
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      r.expected_tds > r.actual_deducted ? 'text-rose-600' : 'text-navy-950'
                    }`}>
                      ₹{r.actual_deducted.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.deposit_due_date || '7th of month'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {r.challan_no ? (
                        <span className="text-[11px] font-mono font-semibold text-slate-700">
                          #{r.challan_no}
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRecord(r);
                            setChallanModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded border border-brand-200 transition-colors"
                        >
                          Map Challan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Challan Mapping Modal */}
      <Modal
        isOpen={challanModalOpen}
        onClose={() => setChallanModalOpen(false)}
        title="Map Challan 281 Payment for Form 26Q"
        subtitle={`Deductee: ${selectedRecord?.entity_name} • Tax: ₹${selectedRecord?.actual_deducted.toLocaleString('en-IN')}`}
      >
        <form onSubmit={handleChallanSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bank BSR Code (7 Digits)</label>
            <input
              type="text"
              required
              maxLength={7}
              value={bsrCode}
              onChange={(e) => setBsrCode(e.target.value)}
              placeholder="0210001"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Challan Sequence Number (5 Digits)</label>
            <input
              type="text"
              required
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              placeholder="98712"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit Date</label>
            <input
              type="date"
              required
              value={challanDate}
              onChange={(e) => setChallanDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setChallanModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-xs font-semibold text-white rounded-lg shadow-xs"
            >
              Save & Make Filing Ready
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
