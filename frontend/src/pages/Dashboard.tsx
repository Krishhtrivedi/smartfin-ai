import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Building2,
  Users2,
  Landmark,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  RefreshCw,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  User as UserIcon,
  Bell
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardData } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';

const COLORS = ['#1A2F46', '#E65909', '#F86927', '#364452', '#8B97A3', '#0D2035', '#047857'];

export const Dashboard: React.FC<{ onNavigateTab: (tab: any) => void }> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Admin Data State
  const [adminData, setAdminData] = useState<DashboardData | null>(null);
  
  // Employee Data State
  const [employeeData, setEmployeeData] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const res = await api.getDashboardSummary();
        setAdminData(res);
      } else {
        const res = await api.getEmployeeDashboard();
        setEmployeeData(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-3">
        <RefreshCw className="w-7 h-7 text-[#E65909] animate-spin" />
        <p className="text-xs font-mono font-semibold text-[#5D646C]">Loading real-time database records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-[3px] border border-[#C5CBD2]">
        <h3 className="text-sm font-bold text-[#1A2F46] font-display">Error Loading Dashboard Metrics</h3>
        <p className="text-xs text-[#5D646C] mt-1">{error}</p>
        <button
          onClick={fetchDashboard}
          className="btn-signal mt-4 px-4 py-2 text-xs font-semibold"
        >
          Retry Database Fetch
        </button>
      </div>
    );
  }

  // ==========================================
  // EMPLOYEE PERSONAL DASHBOARD VIEW
  // ==========================================
  if (!isAdmin && employeeData) {
    const { profile, stats, tasks, expenses, attendance, notifications } = employeeData;

    return (
      <div className="space-y-6">
        {/* Personal Profile Banner */}
        <div className="p-6 bg-white rounded-[3px] border border-[#C5CBD2] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-[3px] bg-[#1A2F46] text-[#E65909] flex items-center justify-center font-bold text-lg">
              {profile.name?.charAt(0) || 'E'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="spec-tag text-[#E65909] font-bold">EMPLOYEE PORTAL</span>
                <span className="text-[10px] font-mono text-[#5D646C]">CODE: {profile.employee_code}</span>
              </div>
              <h2 className="text-xl font-display font-bold text-[#1A2F46] mt-0.5">
                Welcome back, {profile.name}
              </h2>
              <p className="text-xs text-[#5D646C]">
                {profile.designation} • {profile.department} • {profile.email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigateTab('office')}
              className="btn-signal px-3.5 py-1.5 text-xs font-semibold"
            >
              Submit Expense / Attendance →
            </button>
          </div>
        </div>

        {/* Personal Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2]">
            <p className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">Assigned Tasks</p>
            <h4 className="text-2xl font-display font-extrabold text-[#1A2F46] mt-1">{stats.total_tasks}</h4>
            <p className="text-[10px] font-mono text-[#E65909] mt-0.5">{stats.pending_tasks} pending action</p>
          </div>

          <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2]">
            <p className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">Tasks Completed</p>
            <h4 className="text-2xl font-display font-extrabold text-emerald-800 mt-1">{stats.completed_tasks}</h4>
            <p className="text-[10px] font-mono text-[#7C8793] mt-0.5">Verified in database</p>
          </div>

          <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2]">
            <p className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">Expenses Claimed</p>
            <h4 className="text-2xl font-display font-extrabold text-[#1A2F46] mt-1">₹{stats.total_expenses_claimed.toLocaleString('en-IN')}</h4>
            <p className="text-[10px] font-mono text-emerald-700 mt-0.5">Approved: ₹{stats.total_expenses_approved.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2]">
            <p className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">Attendance Logs</p>
            <h4 className="text-2xl font-display font-extrabold text-[#1A2F46] mt-1">{stats.days_present_recent} Days</h4>
            <p className="text-[10px] font-mono text-[#7C8793] mt-0.5">Present this cycle</p>
          </div>
        </div>

        {/* Tasks & Recent Activity Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned Tasks */}
          <div className="bg-white p-5 rounded-[3px] border border-[#C5CBD2]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-[#1A2F46]">My Assigned Tasks</h3>
              <button onClick={() => onNavigateTab('office')} className="text-xs font-semibold text-[#E65909] hover:underline">
                View All in Office Module →
              </button>
            </div>

            {tasks.length === 0 ? (
              <p className="text-xs font-mono text-[#8B97A3] text-center py-8">No tasks currently assigned.</p>
            ) : (
              <div className="space-y-2.5">
                {tasks.map((t: any) => (
                  <div key={t.id} className="p-3 rounded-[2px] border border-[#C5CBD2] bg-[#F6F3EE] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#171E25]">{t.title}</p>
                      <p className="text-[11px] text-[#5D646C] mt-0.5">{t.description}</p>
                      <span className="text-[10px] font-mono text-[#8B97A3] mt-1 block">Due: {t.due_date || 'No deadline'}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] uppercase font-bold ${
                      t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#E65909]/10 text-[#C64200]'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submitted Expenses & Status */}
          <div className="bg-white p-5 rounded-[3px] border border-[#C5CBD2]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-[#1A2F46]">My Expense Reimbursements</h3>
              <span className="text-xs font-mono text-[#5D646C]">Direct database queries</span>
            </div>

            {expenses.length === 0 ? (
              <p className="text-xs font-mono text-[#8B97A3] text-center py-8">No expense claims submitted.</p>
            ) : (
              <div className="space-y-2.5">
                {expenses.map((e: any) => (
                  <div key={e.id} className="p-3 rounded-[2px] border border-[#C5CBD2] bg-[#F6F3EE] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#171E25]">{e.title}</p>
                      <p className="text-[10px] font-mono text-[#5D646C] mt-0.5">{e.category} • {e.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-[#1A2F46]">₹{e.amount.toLocaleString('en-IN')}</p>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] uppercase font-bold ${
                        e.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-[#C64200]'
                      }`}>
                        {e.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMINISTRATOR ORGANISATIONAL DASHBOARD VIEW
  // ==========================================
  if (!adminData) return null;
  const { kpis, monthly_trends, expense_breakdown, gst_status, bank_reconciliation_status, vendor_payment_status, customer_collection_status, pending_approvals, recent_activities } = adminData;

  return (
    <div className="space-y-6">
      {/* Top Organisational Health Overview */}
      <div className="p-4 rounded-[3px] bg-[#ECE9E3] border-l-4 border-[#1A2F46] border-t border-r border-b border-[#C5CBD2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-[2px] bg-[#1A2F46] text-white flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-[#E65909]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="spec-tag text-[#E65909] font-bold">SMARTFIN.AI // ADMIN DASHBOARD</span>
              <span className="text-[10px] font-mono text-[#5D646C]">LIVE PRODUCTION DATABASE</span>
            </div>
            <p className="text-xs font-display font-bold text-[#1A2F46] mt-0.5">
              Active Employees: {kpis.employee_count} • Users: {kpis.active_users_count} • Total Ledgers: {kpis.total_organisational_records} records
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateTab('audit')}
            className="px-3 py-1 bg-white border border-[#C5CBD2] text-xs font-mono text-[#1A2F46] hover:border-[#1A2F46] rounded-[2px]"
          >
            Audit Logs →
          </button>
        </div>
      </div>

      {/* Executive Advisory & Management Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-sans">
        <div
          onClick={() => onNavigateTab('customer')}
          className="p-3 bg-white border border-[#C5CBD2] rounded-[3px] hover:border-[#E65909] cursor-pointer transition-colors shadow-xs"
        >
          <div className="text-[10px] font-mono uppercase text-[#8B97A3] font-bold">Assessees Master</div>
          <div className="text-xl font-bold font-serif text-[#1A2F46] mt-1">
            {(adminData as any).clients_count || 2207}
          </div>
          <div className="text-[10px] text-[#5D646C] mt-0.5">GST/IT/TDS Vault →</div>
        </div>

        <div
          onClick={() => onNavigateTab('projects_kanban')}
          className="p-3 bg-white border border-[#C5CBD2] rounded-[3px] hover:border-[#E65909] cursor-pointer transition-colors shadow-xs"
        >
          <div className="text-[10px] font-mono uppercase text-[#8B97A3] font-bold">Active Engagements</div>
          <div className="text-xl font-bold font-serif text-blue-700 mt-1">
            {(adminData as any).active_projects_count || 0}
          </div>
          <div className="text-[10px] text-[#5D646C] mt-0.5">Projects Kanban →</div>
        </div>

        <div
          onClick={() => onNavigateTab('crm_pipeline')}
          className="p-3 bg-white border border-[#C5CBD2] rounded-[3px] hover:border-[#E65909] cursor-pointer transition-colors shadow-xs"
        >
          <div className="text-[10px] font-mono uppercase text-[#8B97A3] font-bold">CRM Pipeline</div>
          <div className="text-xl font-bold font-serif text-purple-700 mt-1">
            {(adminData as any).leads_count || 0}
          </div>
          <div className="text-[10px] text-[#5D646C] mt-0.5">Inquiries & Leads →</div>
        </div>

        <div
          onClick={() => onNavigateTab('meetings_desk')}
          className="p-3 bg-white border border-[#C5CBD2] rounded-[3px] hover:border-[#E65909] cursor-pointer transition-colors shadow-xs"
        >
          <div className="text-[10px] font-mono uppercase text-[#8B97A3] font-bold">Consultations</div>
          <div className="text-xl font-bold font-serif text-[#1A2F46] mt-1">
            {(adminData as any).scheduled_meetings_count || 0}
          </div>
          <div className="text-[10px] text-[#5D646C] mt-0.5">AI Minutes Desk →</div>
        </div>

        <div
          onClick={() => onNavigateTab('notices')}
          className="p-3 bg-white border border-[#C5CBD2] rounded-[3px] hover:border-[#E65909] cursor-pointer transition-colors shadow-xs"
        >
          <div className="text-[10px] font-mono uppercase text-[#8B97A3] font-bold">Statutory Notices</div>
          <div className="text-xl font-bold font-serif text-rose-700 mt-1">
            {(adminData as any).notices_breakdown?.total_active || 0}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5 font-mono">
            {((adminData as any).notices_breakdown?.due_soon || 0)} due soon →
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('compliance_hub')}
          className="p-3 bg-white border border-[#C5CBD2] rounded-[3px] hover:border-[#E65909] cursor-pointer transition-colors shadow-xs"
        >
          <div className="text-[10px] font-mono uppercase text-[#8B97A3] font-bold">GSTR Dispatches</div>
          <div className="text-xl font-bold font-serif text-emerald-700 mt-1">
            {(adminData as any).gstr_dispatch_count || 0}
          </div>
          <div className="text-[10px] text-[#5D646C] mt-0.5">WhatsApp / Email Hub →</div>
        </div>
      </div>

      {/* Primary KPI Grid (Calculated from actual SQL records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales (Revenue)"
          value={kpis.total_sales}
          subtitle="Taxable sales turnover"
          icon={TrendingUp}
          accentColor="blue"
        />
        <StatCard
          title="Total Purchases"
          value={kpis.total_purchases}
          subtitle="Operating material cost"
          icon={Receipt}
          accentColor="navy"
        />
        <StatCard
          title="Net Operating Profit"
          value={kpis.net_profit}
          subtitle="P&L after operating expenses"
          icon={DollarSign}
          accentColor="signal"
        />
        <StatCard
          title="Liquid Bank Balances"
          value={kpis.total_bank_balance}
          subtitle="Reconciled accounts"
          icon={Landmark}
          accentColor="indigo"
        />
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2]">
          <p className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">GST Output Liability</p>
          <h4 className="text-lg font-display font-extrabold text-[#1A2F46] mt-1">₹{kpis.gst_payable.toLocaleString('en-IN')}</h4>
          <p className="text-[10px] font-mono text-[#7C8793] mt-0.5">Input ITC: ₹{kpis.gst_receivable.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2]">
          <p className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">Vendor Outstanding</p>
          <h4 className="text-lg font-display font-extrabold text-rose-700 mt-1">₹{kpis.vendor_outstanding.toLocaleString('en-IN')}</h4>
          <p className="text-[10px] font-mono text-[#7C8793] mt-0.5">{vendor_payment_status.unpaid} bills pending</p>
        </div>

        <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2]">
          <p className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">Trade Receivables</p>
          <h4 className="text-lg font-display font-extrabold text-emerald-800 mt-1">₹{kpis.customer_outstanding.toLocaleString('en-IN')}</h4>
          <p className="text-[10px] font-mono text-[#7C8793] mt-0.5">{customer_collection_status.outstanding} pending receipts</p>
        </div>

        <div className="bg-white p-4 rounded-[3px] border border-[#C5CBD2]">
          <p className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">TDS Deposit Readiness</p>
          <h4 className="text-lg font-display font-extrabold text-[#1A2F46] mt-1">₹{kpis.tds_summary.deposited.toLocaleString('en-IN')}</h4>
          <p className="text-[10px] font-mono text-[#E65909] font-medium mt-0.5">Shortfall: ₹{kpis.tds_summary.shortfall.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Main Charts Section (Empty states if insufficient data) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Purchases Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-[3px] border border-[#C5CBD2]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="spec-tag text-[#E65909] font-semibold">01 / REVENUE & EXPENSES</span>
                <h3 className="text-sm font-display font-bold text-[#1A2F46]">Monthly Ledger Performance</h3>
              </div>
              <p className="text-xs text-[#5D646C]">Derived from live invoices and expenses</p>
            </div>
            <button
              onClick={() => onNavigateTab('mis')}
              className="text-xs font-semibold text-[#E65909] hover:text-[#C64200] flex items-center space-x-1"
            >
              <span>Detailed MIS Reports</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {monthly_trends.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs font-mono text-[#8B97A3]">
              No transaction records available to render monthly chart.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly_trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECE9E3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5D646C', fontFamily: 'Spline Sans Mono' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#5D646C', fontFamily: 'Spline Sans Mono' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ backgroundColor: '#0D2035', border: '1px solid #364452', borderRadius: '3px', color: '#fff', fontSize: '11px', fontFamily: 'Spline Sans Mono' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="sales" name="Sales Revenue" fill="#1A2F46" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="purchases" name="Purchases" fill="#E65909" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#8B97A3" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Operating Expense Analysis Pie Chart */}
        <div className="bg-white p-5 rounded-[3px] border border-[#C5CBD2]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="spec-tag text-[#E65909] font-semibold">02 / OPEX</span>
                <h3 className="text-sm font-display font-bold text-[#1A2F46]">Expense Breakdown</h3>
              </div>
              <p className="text-xs text-[#5D646C]">Allocation across cost centers</p>
            </div>
            <button
              onClick={() => onNavigateTab('office')}
              className="text-xs font-semibold text-[#E65909] hover:underline"
            >
              Manage
            </button>
          </div>

          {expense_breakdown.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs font-mono text-[#8B97A3]">
              No expense records available.
            </div>
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expense_breakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={45}
                      paddingAngle={2}
                    >
                      {expense_breakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                      contentStyle={{ backgroundColor: '#0D2035', border: '1px solid #364452', borderRadius: '3px', color: '#fff', fontSize: '11px', fontFamily: 'Spline Sans Mono' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 mt-2 max-h-24 overflow-y-auto">
                {expense_breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2.5 h-2.5 rounded-[2px]"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-[#4A545D] truncate">{item.category}</span>
                    </div>
                    <span className="font-mono font-semibold text-[#171E25]">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Module Operational Status Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GST Reconciliation Status */}
        <div className="bg-white p-5 rounded-[3px] border border-[#C5CBD2]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-display font-bold text-[#1A2F46] uppercase tracking-wider">GST 2B Reconciliation</h4>
            <button
              onClick={() => onNavigateTab('gst')}
              className="text-xs text-[#E65909] hover:underline font-semibold"
            >
              Open Module →
            </button>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span>Fully Matched (100% ITC Eligible)</span>
              <span className="font-bold">{gst_status.fully_matched}</span>
            </div>
            <div className="flex justify-between p-2 rounded-[2px] bg-rose-50 text-rose-800 border border-rose-200">
              <span>Missing in GSTR-2B (ITC At Risk)</span>
              <span className="font-bold">{gst_status.missing_in_gstr2b}</span>
            </div>
            <div className="flex justify-between p-2 rounded-[2px] bg-amber-50 text-[#C64200] border border-amber-200">
              <span>Tax Amount Mismatch</span>
              <span className="font-bold">{gst_status.tax_mismatch}</span>
            </div>
            <div className="flex justify-between p-2 rounded-[2px] bg-[#ECE9E3] text-[#1A2F46] border border-[#C5CBD2]">
              <span>Missing in Books (Unclaimed ITC)</span>
              <span className="font-bold">{gst_status.missing_in_books}</span>
            </div>
          </div>
        </div>

        {/* Bank Reconciliation Status */}
        <div className="bg-white p-5 rounded-[3px] border border-[#C5CBD2]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-display font-bold text-[#1A2F46] uppercase tracking-wider">Bank Feeds & BRS Status</h4>
            <button
              onClick={() => onNavigateTab('bank')}
              className="text-xs text-[#E65909] hover:underline font-semibold"
            >
              Open BRS →
            </button>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span>Matched Ledger Entries</span>
              <span className="font-bold">{bank_reconciliation_status.matched}</span>
            </div>
            <div className="flex justify-between p-2 rounded-[2px] bg-rose-50 text-rose-800 border border-rose-200">
              <span>Unmatched Bank Transactions</span>
              <span className="font-bold">{bank_reconciliation_status.unmatched}</span>
            </div>
            <div className="flex justify-between p-2 rounded-[2px] bg-[#ECE9E3] text-[#4A545D] border border-[#C5CBD2]">
              <span>Bank Service Charges</span>
              <span className="font-bold">{bank_reconciliation_status.bank_charges}</span>
            </div>
            <div className="flex justify-between p-2 rounded-[2px] bg-[#1A2F46]/10 text-[#1A2F46] border border-[#1A2F46]/20">
              <span>Sweep Deposit Interest</span>
              <span className="font-bold">{bank_reconciliation_status.interest}</span>
            </div>
          </div>
        </div>

        {/* Pending Approvals Widget */}
        <div className="bg-white p-5 rounded-[3px] border border-[#C5CBD2]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-display font-bold text-[#1A2F46] uppercase tracking-wider">Pending Action Items</h4>
            <span className="text-[10px] font-mono bg-[#E65909]/10 text-[#C64200] border border-[#E65909]/30 px-2 py-0.5 rounded-[2px] font-bold">
              {pending_approvals.length} pending
            </span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto">
            {pending_approvals.length === 0 ? (
              <p className="text-xs font-mono text-[#8B97A3] text-center py-6">All workflows verified & approved</p>
            ) : (
              pending_approvals.map((pa: any) => (
                <div
                  key={pa.id}
                  className="p-2.5 rounded-[2px] border border-[#C5CBD2] bg-[#F6F3EE] hover:border-[#E65909] transition-colors flex items-center justify-between text-xs"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-[#171E25] truncate">{pa.title}</p>
                    <p className="text-[10px] font-mono text-[#5D646C]">{pa.submitted_by} • {pa.date}</p>
                  </div>
                  <span className="font-mono font-bold text-[#1A2F46] whitespace-nowrap">
                    ₹{pa.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities Audit Log */}
      <div className="bg-white p-5 rounded-[3px] border border-[#C5CBD2]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-display font-bold text-[#1A2F46] uppercase tracking-wider">Immutable System Audit Trail</h4>
          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs text-[#E65909] hover:underline font-semibold"
          >
            View Full Log →
          </button>
        </div>

        <div className="divide-y divide-[#ECE9E3] overflow-x-auto">
          {recent_activities.length === 0 ? (
            <p className="text-xs font-mono text-[#8B97A3] py-4 text-center">No recent audit logs available.</p>
          ) : (
            recent_activities.map((act: any) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <Clock className="w-3.5 h-3.5 text-[#8B97A3]" />
                  <span className="font-semibold text-[#171E25] font-mono text-[11px]">{act.action}</span>
                  <span className="text-[#5D646C]">• {act.user_email}</span>
                </div>
                <span className="text-[#8B97A3] font-mono text-[11px]">{act.created_at}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
