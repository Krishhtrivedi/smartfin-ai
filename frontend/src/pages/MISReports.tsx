import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';

export const MISReports: React.FC = () => {
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2026-11-30');

  const fetchMIS = async () => {
    setLoading(true);
    try {
      const data = await api.getMISReport(
        periodType,
        periodType === 'CUSTOM' ? startDate : undefined,
        periodType === 'CUSTOM' ? endDate : undefined
      );
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMIS();
  }, [periodType]);

  const handleExport = async () => {
    await api.exportMISExcel(
      periodType === 'CUSTOM' ? startDate : undefined,
      periodType === 'CUSTOM' ? endDate : undefined
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-600" />
            <span>Management Information System (MIS) Reports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated Profit & Loss, Cash Flow Statements, Tax Summaries & Executive Financial Analysis.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodType(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                  periodType === p ? 'bg-navy-900 text-white' : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                {p.toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="px-3.5 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel MIS</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers if CUSTOM selected */}
      {periodType === 'CUSTOM' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center space-x-3 text-xs">
          <span className="font-semibold text-slate-600">Custom Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-lg text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-lg text-xs"
          />
          <button
            onClick={fetchMIS}
            className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700"
          >
            Apply Range
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-16 rounded-xl border border-slate-200 text-center text-slate-400">
          <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-brand-600" />
          Compiling financial statement from database records...
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Sales Turnover</span>
              <p className="text-xl font-bold text-navy-950 mt-1">₹{report.pnl.sales_revenue.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{report.sales_summary.invoices_count} invoices issued</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchases & Raw Materials</span>
              <p className="text-xl font-bold text-navy-950 mt-1">₹{report.pnl.cost_of_purchases.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{report.purchase_summary.invoices_count} bills booked</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Office & Op Expenses</span>
              <p className="text-xl font-bold text-navy-950 mt-1">₹{report.pnl.operating_expenses.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Approved vouchers</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Net Profit (Margin)</span>
              <p className="text-xl font-bold text-emerald-600 mt-1">₹{report.pnl.net_profit.toLocaleString('en-IN')}</p>
              <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">{report.pnl.profit_margin_pct}% net margin</p>
            </div>
          </div>

          {/* Financial Statements Grid: P&L and Cash Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit & Loss Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-navy-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">Statement of Profit & Loss</h3>
                  <p className="text-[11px] text-slate-300">Period: {report.period.start_date} to {report.period.end_date}</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Net: ₹{report.pnl.net_profit.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-4 space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex items-center justify-between py-1.5 font-medium">
                  <span className="text-slate-700">Gross Sales Revenue</span>
                  <span className="font-bold text-slate-900">₹{report.pnl.sales_revenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 font-medium">
                  <span className="text-slate-700">Less: Direct Cost of Purchases</span>
                  <span className="text-rose-600 font-semibold">(₹{report.pnl.cost_of_purchases.toLocaleString('en-IN')})</span>
                </div>
                <div className="flex items-center justify-between py-2 font-bold bg-slate-50 px-2 rounded">
                  <span className="text-navy-950">Gross Operating Profit</span>
                  <span className="text-navy-950">₹{report.pnl.gross_profit.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 font-medium">
                  <span className="text-slate-700">Less: Indirect & Office Expenses</span>
                  <span className="text-rose-600 font-semibold">(₹{report.pnl.operating_expenses.toLocaleString('en-IN')})</span>
                </div>
                <div className="flex items-center justify-between py-2.5 font-bold bg-emerald-50 text-emerald-900 px-2 rounded border border-emerald-200 text-sm">
                  <span>Net Profit Before Tax</span>
                  <span>₹{report.pnl.net_profit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Cash Flow Statement */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">Cash Flow Statement</h3>
                  <p className="text-[11px] text-slate-300">Operational Inflows vs Outflows</p>
                </div>
                <span className={`text-xs font-mono font-bold ${
                  report.cash_flow.net_cash_flow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  Net Cash: ₹{report.cash_flow.net_cash_flow.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-4 space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex items-center justify-between py-1.5 font-medium">
                  <span className="text-slate-700">(+) Collections received from Customers</span>
                  <span className="text-emerald-600 font-bold">₹{report.cash_flow.cash_inflows_from_customers.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 font-medium">
                  <span className="text-slate-700">(-) Disbursements & Payments to Vendors</span>
                  <span className="text-rose-600 font-semibold">(₹{report.cash_flow.cash_outflows_to_vendors.toLocaleString('en-IN')})</span>
                </div>
                <div className="flex items-center justify-between py-1.5 font-medium">
                  <span className="text-slate-700">(-) Cash paid for Office & Operating Expenses</span>
                  <span className="text-rose-600 font-semibold">(₹{report.cash_flow.cash_outflows_for_expenses.toLocaleString('en-IN')})</span>
                </div>
                <div className="flex items-center justify-between py-2.5 font-bold bg-blue-50 text-brand-900 px-2 rounded border border-blue-200 text-sm">
                  <span>Net Operating Cash Flow</span>
                  <span>₹{report.cash_flow.net_cash_flow.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Compliance Health Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2">GST Compliance Health</h4>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-600">Total Eligible ITC Claimed:</span>
                <span className="font-bold text-slate-900">₹{report.gst_compliance.total_itc_claimed.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-600">Fully Matched 2B Invoices:</span>
                <span className="font-bold text-emerald-600">{report.gst_compliance.matched_count}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-600">ITC At Risk (Missing in GSTR-2B):</span>
                <span className="font-bold text-rose-600">{report.gst_compliance.missing_in_gstr2b}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2">TDS Statutory Compliance Health</h4>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-600">Expected Deductions:</span>
                <span className="font-bold text-slate-900">₹{report.tds_compliance.expected_tds.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                <span className="text-slate-600">Actual Deducted:</span>
                <span className="font-bold text-emerald-600">₹{report.tds_compliance.actual_deducted.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-600">Shortfall Pending Deposit:</span>
                <span className="font-bold text-amber-600">₹{report.tds_compliance.shortfall.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
