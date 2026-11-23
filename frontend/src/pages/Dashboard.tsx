import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  Building2,
  Users2,
  Landmark,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  User as UserIcon,
  Bell,
  FolderKanban,
  FileText,
  Compass,
  Scale,
  Bot,
  Plus,
  Zap,
  BarChart3,
  ChevronRight
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
import { useTheme } from '../context/ThemeContext';
import { DashboardData } from '../types';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';

const COLORS = ['#1A2F46', '#E65909', '#F86927', '#364452', '#8B97A3', '#0D2035', '#047857'];

export const Dashboard: React.FC<{ onNavigateTab: (tab: any) => void }> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
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
        <p className="text-xs font-mono font-semibold text-[#5D646C] dark:text-slate-400">Loading real-time executive records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#131C2E] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs max-w-xl mx-auto my-12">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-[#1A2F46] dark:text-slate-100 font-display">Error Loading Dashboard Metrics</h3>
        <p className="text-xs text-[#5D646C] dark:text-slate-400 mt-1.5">{error}</p>
        <button
          onClick={fetchDashboard}
          className="btn-signal mt-4 px-4 py-2 text-xs font-semibold inline-flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Database Connection</span>
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
      <div className="space-y-6 w-full max-w-none">
        {/* Personal Profile Banner */}
        <div className="p-6 bg-white dark:bg-[#131C2E] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-[3px] bg-[#1A2F46] dark:bg-[#0D2035] text-[#E65909] flex items-center justify-center font-bold text-lg border border-white/5">
              {profile.name?.charAt(0) || 'E'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="spec-tag text-[#E65909] font-bold">EMPLOYEE PORTAL</span>
                <span className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400">CODE: {profile.employee_code}</span>
              </div>
              <h2 className="text-xl font-display font-bold text-[#1A2F46] dark:text-slate-100 mt-0.5">
                Welcome back, {profile.name}
              </h2>
              <p className="text-xs text-[#5D646C] dark:text-slate-400">
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
          <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800">
            <p className="font-mono text-[11px] font-semibold text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">Assigned Tasks</p>
            <h4 className="text-2xl font-display font-extrabold text-[#1A2F46] dark:text-slate-100 mt-1">{stats.total_tasks}</h4>
            <p className="text-[10px] font-mono text-[#E65909] mt-0.5">{stats.pending_tasks} pending action</p>
          </div>

          <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800">
            <p className="font-mono text-[11px] font-semibold text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">Tasks Completed</p>
            <h4 className="text-2xl font-display font-extrabold text-emerald-800 dark:text-emerald-400 mt-1">{stats.completed_tasks}</h4>
            <p className="text-[10px] font-mono text-[#7C8793] dark:text-slate-400 mt-0.5">Verified in database</p>
          </div>

          <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800">
            <p className="font-mono text-[11px] font-semibold text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">Expenses Claimed</p>
            <h4 className="text-2xl font-display font-extrabold text-[#1A2F46] dark:text-slate-100 mt-1">₹{stats.total_expenses_claimed.toLocaleString('en-IN')}</h4>
            <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">Approved: ₹{stats.total_expenses_approved.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800">
            <p className="font-mono text-[11px] font-semibold text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">Attendance Logs</p>
            <h4 className="text-2xl font-display font-extrabold text-[#1A2F46] dark:text-slate-100 mt-1">{stats.days_present_recent} Days</h4>
            <p className="text-[10px] font-mono text-[#7C8793] dark:text-slate-400 mt-0.5">Present this cycle</p>
          </div>
        </div>

        {/* Tasks & Recent Activity Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assigned Tasks */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-[#1A2F46] dark:text-slate-100">My Assigned Tasks</h3>
              <button onClick={() => onNavigateTab('office')} className="text-xs font-semibold text-[#E65909] hover:underline">
                View All in Office Module →
              </button>
            </div>

            {tasks.length === 0 ? (
              <p className="text-xs font-mono text-[#8B97A3] dark:text-slate-400 text-center py-8">No tasks currently assigned.</p>
            ) : (
              <div className="space-y-2.5">
                {tasks.map((t: any) => (
                  <div key={t.id} className="p-3 rounded-[2px] border border-[#C5CBD2] dark:border-slate-800 bg-[#F6F3EE] dark:bg-[#1A253A] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#171E25] dark:text-slate-100">{t.title}</p>
                      <p className="text-[11px] text-[#5D646C] dark:text-slate-400 mt-0.5">{t.description}</p>
                      <span className="text-[10px] font-mono text-[#8B97A3] dark:text-slate-400 mt-1 block">Due: {t.due_date || 'No deadline'}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] uppercase font-bold ${
                      t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-[#E65909]/10 text-[#C64200] dark:bg-[#E65909]/20 dark:text-[#F96E31]'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submitted Expenses & Status */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-sm text-[#1A2F46] dark:text-slate-100">My Expense Reimbursements</h3>
              <span className="text-xs font-mono text-[#5D646C] dark:text-slate-400">Direct database queries</span>
            </div>

            {expenses.length === 0 ? (
              <p className="text-xs font-mono text-[#8B97A3] dark:text-slate-400 text-center py-8">No expense claims submitted.</p>
            ) : (
              <div className="space-y-2.5">
                {expenses.map((e: any) => (
                  <div key={e.id} className="p-3 rounded-[2px] border border-[#C5CBD2] dark:border-slate-800 bg-[#F6F3EE] dark:bg-[#1A253A] flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#171E25] dark:text-slate-100">{e.title}</p>
                      <p className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400 mt-0.5">{e.category} • {e.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-[#1A2F46] dark:text-slate-100">₹{e.amount.toLocaleString('en-IN')}</p>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] uppercase font-bold ${
                        e.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-[#C64200] dark:bg-amber-500/10 dark:text-amber-400'
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
  const {
    kpis,
    monthly_trends,
    expense_breakdown,
    gst_status,
    bank_reconciliation_status,
    vendor_payment_status,
    customer_collection_status,
    pending_approvals,
    recent_activities,
    upcoming_meetings = [],
    active_projects = [],
    pipeline_counts = {}
  } = adminData;

  const totalClients = (adminData as any).clients_count || kpis.clients_count || 2207;
  const activeProjectsCount = (adminData as any).active_projects_count || kpis.active_projects_count || 0;
  const activeLeadsCount = (adminData as any).leads_count || kpis.inquiries_and_leads_count || 0;
  const scheduledMeetingsCount = (adminData as any).scheduled_meetings_count || kpis.meetings_scheduled_count || 0;
  const noticesTotal = (adminData as any).notices_breakdown?.total_active ?? kpis.notices_summary?.total ?? 0;
  const noticesDueSoon = (adminData as any).notices_breakdown?.due_soon ?? kpis.notices_summary?.due_within_15_days ?? 0;
  const gstrDispatchCount = (adminData as any).gstr_dispatch_count ?? kpis.gst_dispatch_summary?.sent ?? 0;

  // Pipeline stages progression calculation
  const pipelineStages = [
    { label: 'New Inquiries', count: pipeline_counts['NEW'] || 0, color: 'bg-blue-600' },
    { label: 'Contacted', count: pipeline_counts['CONTACTED'] || 0, color: 'bg-indigo-600' },
    { label: 'Meeting Set', count: pipeline_counts['MEETING_SCHEDULED'] || 0, color: 'bg-amber-600' },
    { label: 'Proposal Sent', count: pipeline_counts['PROPOSAL_SENT'] || 0, color: 'bg-purple-600' },
    { label: 'Negotiation', count: pipeline_counts['NEGOTIATION'] || 0, color: 'bg-[#E65909]' },
    { label: 'Converted', count: pipeline_counts['CONVERTED'] || 0, color: 'bg-emerald-600' }
  ];

  return (
    <div className="space-y-6 w-full max-w-none">
      {/* 1. EXECUTIVE COMMAND HERO BAR */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#131C2E] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <span className="spec-tag text-[#E65909] font-bold tracking-wider">
                VICHAR VIMARSH // SMARTFIN.AI
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-[2px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-semibold border border-emerald-200 dark:border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE PRODUCTION VAULT</span>
              </span>
              <span className="text-[11px] font-mono text-[#5D646C] dark:text-slate-400">
                FY 2026-27
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1A2F46] dark:text-slate-50 mt-1.5">
              Executive Management & Advisory Desk
            </h1>
            <p className="text-xs text-[#5D646C] dark:text-slate-400 mt-1">
              Institutional intelligence across {totalClients.toLocaleString('en-IN')} Assessees • {kpis.total_organisational_records || 0} Ledger Records • {kpis.employee_count || 0} Team Staff
            </p>
          </div>

          {/* Quick Action Command Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateTab('customer')}
              className="px-3.5 py-2 bg-[#1A2F46] dark:bg-slate-800 text-white hover:bg-[#0D2035] dark:hover:bg-slate-700 rounded-[3px] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#E65909]" />
              <span>Assessee Vault</span>
            </button>
            <button
              onClick={() => onNavigateTab('crm_pipeline')}
              className="px-3.5 py-2 bg-white dark:bg-[#1A253A] border border-[#C5CBD2] dark:border-slate-700 text-[#1A2F46] dark:text-slate-100 hover:border-[#1A2F46] hover:bg-[#F6F3EE] dark:hover:bg-slate-800 rounded-[3px] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Users2 className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
              <span>+ Log Lead</span>
            </button>
            <button
              onClick={() => onNavigateTab('meetings_desk')}
              className="px-3.5 py-2 bg-white dark:bg-[#1A253A] border border-[#C5CBD2] dark:border-slate-700 text-[#1A2F46] dark:text-slate-100 hover:border-[#1A2F46] hover:bg-[#F6F3EE] dark:hover:bg-slate-800 rounded-[3px] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Calendar className="w-3.5 h-3.5 text-[#E65909]" />
              <span>Consultations</span>
            </button>
            <button
              onClick={() => onNavigateTab('compliance_hub')}
              className="px-3.5 py-2 bg-white dark:bg-[#1A253A] border border-[#C5CBD2] dark:border-slate-700 text-[#1A2F46] dark:text-slate-100 hover:border-[#1A2F46] hover:bg-[#F6F3EE] dark:hover:bg-slate-800 rounded-[3px] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>GSTR Auto</span>
            </button>
            <button
              onClick={fetchDashboard}
              title="Refresh database records"
              className="p-2 bg-white dark:bg-[#1A253A] border border-[#C5CBD2] dark:border-slate-700 text-[#5D646C] dark:text-slate-300 hover:text-[#1A2F46] dark:hover:text-white rounded-[3px] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE STRATEGIC OVERVIEW STRIP (6 Core Pillars) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Assessees Master */}
        <div
          onClick={() => onNavigateTab('customer')}
          className="p-3.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] hover:border-[#E65909] dark:hover:border-[#E65909] hover:shadow-xs cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#8B97A3] dark:text-slate-400 font-bold group-hover:text-[#E65909] transition-colors">
              Assessees Vault
            </span>
            <Building2 className="w-3.5 h-3.5 text-[#8B97A3] dark:text-slate-400 group-hover:text-[#E65909]" />
          </div>
          <div className="text-xl font-bold font-serif text-[#1A2F46] dark:text-slate-100 mt-1.5">
            {totalClients.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>GST / IT Master</span>
            <ChevronRight className="w-3 h-3 text-[#8B97A3] dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Active Engagements */}
        <div
          onClick={() => onNavigateTab('projects_kanban')}
          className="p-3.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] hover:border-blue-700 dark:hover:border-blue-500 hover:shadow-xs cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#8B97A3] dark:text-slate-400 font-bold group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              Engagements
            </span>
            <FolderKanban className="w-3.5 h-3.5 text-[#8B97A3] dark:text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400" />
          </div>
          <div className="text-xl font-bold font-serif text-blue-700 dark:text-blue-400 mt-1.5">
            {activeProjectsCount}
          </div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Projects Kanban</span>
            <ChevronRight className="w-3 h-3 text-[#8B97A3] dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* CRM Pipeline */}
        <div
          onClick={() => onNavigateTab('crm_pipeline')}
          className="p-3.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] hover:border-purple-700 dark:hover:border-purple-500 hover:shadow-xs cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#8B97A3] dark:text-slate-400 font-bold group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
              Sales Pipeline
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-[#8B97A3] dark:text-slate-400 group-hover:text-purple-700 dark:group-hover:text-purple-400" />
          </div>
          <div className="text-xl font-bold font-serif text-purple-700 dark:text-purple-400 mt-1.5">
            {activeLeadsCount}
          </div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Inquiries & Leads</span>
            <ChevronRight className="w-3 h-3 text-[#8B97A3] dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Consultations */}
        <div
          onClick={() => onNavigateTab('meetings_desk')}
          className="p-3.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] hover:border-[#1A2F46] dark:hover:border-slate-500 hover:shadow-xs cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#8B97A3] dark:text-slate-400 font-bold group-hover:text-[#1A2F46] dark:group-hover:text-slate-200 transition-colors">
              Consultations
            </span>
            <Calendar className="w-3.5 h-3.5 text-[#8B97A3] dark:text-slate-400 group-hover:text-[#1A2F46] dark:group-hover:text-slate-200" />
          </div>
          <div className="text-xl font-bold font-serif text-[#1A2F46] dark:text-slate-100 mt-1.5">
            {scheduledMeetingsCount}
          </div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>AI Minutes Desk</span>
            <ChevronRight className="w-3 h-3 text-[#8B97A3] dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Statutory Notices */}
        <div
          onClick={() => onNavigateTab('notices')}
          className="p-3.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] hover:border-rose-600 dark:hover:border-rose-500 hover:shadow-xs cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#8B97A3] dark:text-slate-400 font-bold group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              Statutory Notices
            </span>
            <Scale className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-xl font-bold font-serif text-rose-700 dark:text-rose-400 mt-1.5">
            {noticesTotal}
          </div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono mt-1 flex items-center justify-between">
            <span>{noticesDueSoon} due soon</span>
            <ChevronRight className="w-3 h-3 text-rose-400 dark:text-rose-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* GSTR Dispatches */}
        <div
          onClick={() => onNavigateTab('compliance_hub')}
          className="p-3.5 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] hover:border-emerald-600 dark:hover:border-emerald-500 hover:shadow-xs cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#8B97A3] dark:text-slate-400 font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              GSTR Dispatches
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-serif text-emerald-700 dark:text-emerald-400 mt-1.5">
            {gstrDispatchCount}
          </div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>WhatsApp / Email</span>
            <ChevronRight className="w-3 h-3 text-[#8B97A3] dark:text-slate-500 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. TIER 1: PRIMARY INSTITUTIONAL METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Taxable Sales Revenue"
          value={kpis.total_sales}
          subtitle="Turnover from live sales ledgers"
          icon={TrendingUp}
          accentColor="blue"
        />
        <StatCard
          title="Total Operating Purchases"
          value={kpis.total_purchases}
          subtitle="Material & procurement invoices"
          icon={Receipt}
          accentColor="navy"
        />
        <StatCard
          title="Net Operating Profit"
          value={kpis.net_profit}
          subtitle={
            kpis.total_sales > 0
              ? `Margin: ${((kpis.net_profit / kpis.total_sales) * 100).toFixed(1)}% after expenses`
              : 'P&L after operating expenses'
          }
          icon={DollarSign}
          accentColor="signal"
        />
        <StatCard
          title="Liquid Treasury Balances"
          value={kpis.total_bank_balance}
          subtitle="Reconciled active accounts"
          icon={Landmark}
          accentColor="indigo"
        />
      </div>

      {/* 4. FINANCIAL HEALTH INDICATOR RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
          <p className="font-mono text-[11px] font-semibold text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">GST Output Liability</p>
          <h4 className="text-lg font-display font-extrabold text-[#1A2F46] dark:text-slate-100 mt-1">₹{kpis.gst_payable.toLocaleString('en-IN')}</h4>
          <p className="text-[10px] font-mono text-[#7C8793] dark:text-slate-400 mt-0.5">Input ITC: ₹{kpis.gst_receivable.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
          <p className="font-mono text-[11px] font-semibold text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">Vendor Outstanding</p>
          <h4 className="text-lg font-display font-extrabold text-rose-700 dark:text-rose-400 mt-1">₹{kpis.vendor_outstanding.toLocaleString('en-IN')}</h4>
          <p className="text-[10px] font-mono text-[#7C8793] dark:text-slate-400 mt-0.5">{vendor_payment_status.unpaid} bills pending</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
          <p className="font-mono text-[11px] font-semibold text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">Trade Receivables</p>
          <h4 className="text-lg font-display font-extrabold text-emerald-800 dark:text-emerald-400 mt-1">₹{kpis.customer_outstanding.toLocaleString('en-IN')}</h4>
          <p className="text-[10px] font-mono text-[#7C8793] dark:text-slate-400 mt-0.5">{customer_collection_status.outstanding} pending receipts</p>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-4 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
          <p className="font-mono text-[11px] font-semibold text-[#5D646C] dark:text-slate-400 uppercase tracking-wider">TDS Deposit Readiness</p>
          <h4 className="text-lg font-display font-extrabold text-[#1A2F46] dark:text-slate-100 mt-1">₹{kpis.tds_summary.deposited.toLocaleString('en-IN')}</h4>
          <p className="text-[10px] font-mono text-[#E65909] font-medium mt-0.5">Shortfall: ₹{kpis.tds_summary.shortfall.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* 5. TIER 2: TWO-COLUMN MAIN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT WORKSPACE (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Client Engagements & Project Delivery */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="spec-tag text-[#E65909] font-semibold">DELIVERY & MILESTONES</span>
                  <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100">Active Client Engagements</h3>
                </div>
                <p className="text-xs text-[#5D646C] dark:text-slate-400">Real-time audit & tax engagement progress</p>
              </div>
              <button
                onClick={() => onNavigateTab('projects_kanban')}
                className="text-xs font-semibold text-[#E65909] hover:underline flex items-center space-x-1"
              >
                <span>Open Kanban Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {active_projects.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-[#C5CBD2] dark:border-slate-800 rounded-[3px] bg-[#F6F3EE] dark:bg-[#1A253A]">
                <p className="text-xs font-mono text-[#5D646C] dark:text-slate-400">No active project engagements recorded in database.</p>
                <button
                  onClick={() => onNavigateTab('projects_kanban')}
                  className="mt-2 text-xs font-semibold text-[#E65909] hover:underline"
                >
                  + Create First Engagement
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {active_projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => onNavigateTab('projects_kanban')}
                    className="p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 hover:border-[#1A2F46] dark:hover:border-slate-600 bg-[#F6F3EE]/50 dark:bg-[#1A253A]/50 hover:bg-white dark:hover:bg-[#1A253A] cursor-pointer transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-bold text-xs text-[#1A2F46] dark:text-slate-100">{proj.name}</span>
                          {proj.code && (
                            <span className="text-[10px] font-mono bg-[#ECE9E3] dark:bg-[#0B1120] text-[#5D646C] dark:text-slate-300 px-1.5 py-0.2 rounded-[2px]">
                              {proj.code}
                            </span>
                          )}
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] font-bold uppercase ${
                            proj.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' :
                            proj.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400' :
                            'bg-amber-100 text-[#C64200] dark:bg-amber-500/10 dark:text-amber-400'
                          }`}>
                            {proj.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5D646C] dark:text-slate-400 mt-0.5">
                          Assessee: <strong className="text-[#171E25] dark:text-slate-200">{proj.client_name}</strong>
                          {proj.due_date && ` • Deadline: ${proj.due_date}`}
                        </p>
                      </div>

                      <div className="sm:text-right flex items-center sm:flex-col sm:items-end justify-between">
                        <span className="text-xs font-mono font-bold text-[#1A2F46] dark:text-slate-100">
                          {proj.completion_percentage}%
                        </span>
                        <div className="w-24 bg-[#C5CBD2] dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                          <div
                            className="bg-[#E65909] h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, proj.completion_percentage)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CRM Lead Conversion Funnel */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="spec-tag text-purple-700 dark:text-purple-400 font-semibold">CRM PIPELINE</span>
                  <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100">Client Acquisition & Lead Funnel</h3>
                </div>
                <p className="text-xs text-[#5D646C] dark:text-slate-400">Conversion velocity across 6 consultative stages</p>
              </div>
              <button
                onClick={() => onNavigateTab('crm_pipeline')}
                className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline flex items-center space-x-1"
              >
                <span>Manage Leads</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
              {pipelineStages.map((stage, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigateTab('crm_pipeline')}
                  className="p-3 bg-[#F6F3EE] dark:bg-[#1A253A] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 hover:border-purple-600 dark:hover:border-purple-500 cursor-pointer text-center transition-colors"
                >
                  <span className="text-[10px] font-mono font-semibold text-[#5D646C] dark:text-slate-400 uppercase block truncate">
                    {stage.label}
                  </span>
                  <span className="text-xl font-bold font-serif text-[#1A2F46] dark:text-slate-50 mt-1 block">
                    {stage.count}
                  </span>
                  <div className="w-full bg-[#C5CBD2]/60 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full ${stage.color}`}
                      style={{ width: stage.count > 0 ? '100%' : '15%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Ledger Performance Chart & Cost Allocation */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Sales vs Purchases Bar Chart */}
            <div className="xl:col-span-2 bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="spec-tag text-[#E65909] font-semibold">REVENUE DYNAMICS</span>
                    <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100">Monthly Ledger Trends</h3>
                  </div>
                  <p className="text-xs text-[#5D646C] dark:text-slate-400">Derived directly from live verified invoices</p>
                </div>
                <button
                  onClick={() => onNavigateTab('mis')}
                  className="text-xs font-semibold text-[#E65909] hover:underline flex items-center space-x-1"
                >
                  <span>MIS Reports</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {monthly_trends.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs font-mono text-[#8B97A3] dark:text-slate-400 bg-[#F6F3EE] dark:bg-[#1A253A] rounded-[3px]">
                  No invoice records available to render monthly chart.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly_trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1E293B' : '#ECE9E3'} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme === 'dark' ? '#94A3B8' : '#5D646C', fontFamily: 'Spline Sans Mono' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: theme === 'dark' ? '#94A3B8' : '#5D646C', fontFamily: 'Spline Sans Mono' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${val / 1000}k`}`}
                      />
                      <Tooltip
                        formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                        contentStyle={{ backgroundColor: theme === 'dark' ? '#0F172A' : '#0D2035', border: theme === 'dark' ? '1px solid #334155' : '1px solid #364452', borderRadius: '3px', color: '#fff', fontSize: '11px', fontFamily: 'Spline Sans Mono' }}
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

            {/* Operating Expense Allocation Pie */}
            <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="spec-tag text-[#E65909] font-semibold">OPEX</span>
                    <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100">Expense Mix</h3>
                  </div>
                  <p className="text-xs text-[#5D646C] dark:text-slate-400">Cost center breakdown</p>
                </div>
                <button
                  onClick={() => onNavigateTab('office')}
                  className="text-xs font-semibold text-[#E65909] hover:underline"
                >
                  Manage
                </button>
              </div>

              {expense_breakdown.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs font-mono text-[#8B97A3] dark:text-slate-400 bg-[#F6F3EE] dark:bg-[#1A253A] rounded-[3px]">
                  No expense claims recorded.
                </div>
              ) : (
                <>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expense_breakdown}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={65}
                          innerRadius={40}
                          paddingAngle={2}
                        >
                          {expense_breakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                          contentStyle={{ backgroundColor: theme === 'dark' ? '#0F172A' : '#0D2035', border: theme === 'dark' ? '1px solid #334155' : '1px solid #364452', borderRadius: '3px', color: '#fff', fontSize: '11px', fontFamily: 'Spline Sans Mono' }}
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
                          <span className="text-[#4A545D] dark:text-slate-300 truncate">{item.category}</span>
                        </div>
                        <span className="font-mono font-semibold text-[#171E25] dark:text-slate-100">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Statutory Compliance Matrix (GST 2B & Bank Reconciliation) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GST 2B Reconciliation Status */}
            <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-display font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider">
                    GST 2B ITC Matching Engine
                  </h4>
                  <p className="text-[11px] text-[#5D646C] dark:text-slate-400">GSTR-2B vs Books Reconciliation</p>
                </div>
                <button
                  onClick={() => onNavigateTab('gst')}
                  className="text-xs text-[#E65909] hover:underline font-semibold"
                >
                  Open GST Module →
                </button>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-[2px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <span>Fully Matched (100% ITC Eligible)</span>
                  <span className="font-bold">{gst_status.fully_matched}</span>
                </div>
                <div className="flex justify-between p-2 rounded-[2px] bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                  <span>Missing in GSTR-2B (ITC At Risk)</span>
                  <span className="font-bold">{gst_status.missing_in_gstr2b}</span>
                </div>
                <div className="flex justify-between p-2 rounded-[2px] bg-amber-50 dark:bg-amber-500/10 text-[#C64200] dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  <span>Tax Amount Mismatch</span>
                  <span className="font-bold">{gst_status.tax_mismatch}</span>
                </div>
                <div className="flex justify-between p-2 rounded-[2px] bg-[#ECE9E3] dark:bg-[#1A253A] text-[#1A2F46] dark:text-slate-200 border border-[#C5CBD2] dark:border-slate-700">
                  <span>Missing in Books (Unclaimed ITC)</span>
                  <span className="font-bold">{gst_status.missing_in_books}</span>
                </div>
              </div>
            </div>

            {/* Bank Feeds & BRS Status */}
            <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-display font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider">
                    Bank Feeds & Treasury BRS
                  </h4>
                  <p className="text-[11px] text-[#5D646C] dark:text-slate-400">Automated ledger matching & bank sweeps</p>
                </div>
                <button
                  onClick={() => onNavigateTab('bank')}
                  className="text-xs text-[#E65909] hover:underline font-semibold"
                >
                  Open BRS Module →
                </button>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-[2px] bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <span>Matched Ledger Entries</span>
                  <span className="font-bold">{bank_reconciliation_status.matched}</span>
                </div>
                <div className="flex justify-between p-2 rounded-[2px] bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                  <span>Unmatched Bank Transactions</span>
                  <span className="font-bold">{bank_reconciliation_status.unmatched}</span>
                </div>
                <div className="flex justify-between p-2 rounded-[2px] bg-[#ECE9E3] dark:bg-[#1A253A] text-[#4A545D] dark:text-slate-400 border border-[#C5CBD2] dark:border-slate-700">
                  <span>Bank Service Charges</span>
                  <span className="font-bold">{bank_reconciliation_status.bank_charges}</span>
                </div>
                <div className="flex justify-between p-2 rounded-[2px] bg-[#1A2F46]/10 dark:bg-blue-500/10 text-[#1A2F46] dark:text-blue-400 border border-[#1A2F46]/20 dark:border-blue-500/20">
                  <span>Sweep Deposit Interest</span>
                  <span className="font-bold">{bank_reconciliation_status.interest}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT WORKSPACE (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Strategic Advisory Suite */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#E65909]" />
              <h4 className="text-xs font-display font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider">
                Strategic Advisory Hub
              </h4>
            </div>
            <p className="text-xs text-[#5D646C] dark:text-slate-400 mb-3.5">
              Proprietary diagnostic & intelligence engines
            </p>

            <div className="space-y-2.5">
              <div
                onClick={() => onNavigateTab('business_scan')}
                className="p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 hover:border-[#E65909] dark:hover:border-[#E65909] bg-[#F6F3EE] dark:bg-[#1A253A] hover:bg-white dark:hover:bg-[#131C2E] cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#E65909]" />
                    <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100">7-Domain Business Scan</span>
                  </div>
                  <p className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">
                    Multi-dimensional institutional diagnostic
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8B97A3] group-hover:text-[#E65909] group-hover:translate-x-0.5 transition-all" />
              </div>

              <div
                onClick={() => onNavigateTab('doc_analyzer')}
                className="p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 hover:border-[#1A2F46] dark:hover:border-slate-500 bg-[#F6F3EE] dark:bg-[#1A253A] hover:bg-white dark:hover:bg-[#131C2E] cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100">AI Document Analyzer</span>
                  </div>
                  <p className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">
                    P&L, Balance Sheet & PDF extractor
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8B97A3] group-hover:text-blue-700 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div
                onClick={() => onNavigateTab('vv_pmsc_bot')}
                className="p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 hover:border-[#1A2F46] dark:hover:border-slate-500 bg-[#F6F3EE] dark:bg-[#1A253A] hover:bg-white dark:hover:bg-[#131C2E] cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Bot className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100">Vichar Vimarsh SOP Bot</span>
                  </div>
                  <p className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">
                    Tax, statutory & firm knowledge AI
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8B97A3] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div
                onClick={() => onNavigateTab('notices')}
                className="p-3 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 hover:border-rose-600 dark:hover:border-rose-500 bg-[#F6F3EE] dark:bg-[#1A253A] hover:bg-white dark:hover:bg-[#131C2E] cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <Scale className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100">Statutory Demands Radar</span>
                  </div>
                  <p className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">
                    7/15/30-day notice response tracker
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#8B97A3] group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>

          {/* Upcoming Consultations & AI Minutes */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-display font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider">
                  Upcoming Consultations
                </h4>
                <p className="text-[11px] text-[#5D646C] dark:text-slate-400">Client meetings & advisory sessions</p>
              </div>
              <button
                onClick={() => onNavigateTab('meetings_desk')}
                className="text-xs text-[#E65909] hover:underline font-semibold"
              >
                Schedule →
              </button>
            </div>

            {upcoming_meetings.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-[#C5CBD2] dark:border-slate-800 rounded-[3px] bg-[#F6F3EE] dark:bg-[#1A253A]">
                <p className="text-xs font-mono text-[#8B97A3] dark:text-slate-400">No consultations scheduled today.</p>
                <button
                  onClick={() => onNavigateTab('meetings_desk')}
                  className="mt-1 text-xs font-semibold text-[#E65909] hover:underline"
                >
                  + Add New Consultation
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcoming_meetings.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onNavigateTab('meetings_desk')}
                    className="p-2.5 rounded-[2px] border border-[#C5CBD2] dark:border-slate-800 bg-[#F6F3EE] dark:bg-[#1A253A] hover:border-[#1A2F46] dark:hover:border-slate-600 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-bold text-[#171E25] dark:text-slate-100 truncate">{m.title}</p>
                      <span className="font-mono text-[10px] text-[#E65909] font-semibold whitespace-nowrap ml-2">
                        {m.scheduled_time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#5D646C] dark:text-slate-400 mt-1">
                      <span className="truncate">{m.client_name}</span>
                      <span className="text-[9px] font-mono bg-white dark:bg-[#0B1120] border border-[#C5CBD2] dark:border-slate-700 px-1 py-0.2 rounded-[2px] text-[#1A2F46] dark:text-slate-200">
                        {m.meeting_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Verification & Approvals */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-display font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider">
                  Pending Verification
                </h4>
                <p className="text-[11px] text-[#5D646C] dark:text-slate-400">Expenses & GST reconciliation flags</p>
              </div>
              <span className="text-[10px] font-mono bg-[#E65909]/10 text-[#C64200] dark:bg-[#E65909]/20 dark:text-[#F96E31] border border-[#E65909]/30 px-2 py-0.5 rounded-[2px] font-bold">
                {pending_approvals.length} pending
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {pending_approvals.length === 0 ? (
                <p className="text-xs font-mono text-[#8B97A3] dark:text-slate-400 text-center py-6">All workflows verified & approved</p>
              ) : (
                pending_approvals.map((pa: any) => (
                  <div
                    key={pa.id}
                    className="p-2.5 rounded-[2px] border border-[#C5CBD2] dark:border-slate-800 bg-[#F6F3EE] dark:bg-[#1A253A] hover:border-[#E65909] transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="overflow-hidden pr-2">
                      <p className="font-bold text-[#171E25] dark:text-slate-100 truncate">{pa.title}</p>
                      <p className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400">{pa.submitted_by} • {pa.date}</p>
                    </div>
                    <span className="font-mono font-bold text-[#1A2F46] dark:text-slate-100 whitespace-nowrap">
                      ₹{pa.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Immutable System Audit Trail */}
          <div className="bg-white dark:bg-[#131C2E] p-5 rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-display font-bold text-[#1A2F46] dark:text-slate-100 uppercase tracking-wider">
                  System Audit Trail
                </h4>
                <p className="text-[11px] text-[#5D646C] dark:text-slate-400">Cryptographic tamper-evident activity log</p>
              </div>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-xs text-[#E65909] hover:underline font-semibold"
              >
                Full Trail →
              </button>
            </div>

            <div className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
              {recent_activities.length === 0 ? (
                <p className="text-xs font-mono text-[#8B97A3] dark:text-slate-400 py-4 text-center">No recent audit logs available.</p>
              ) : (
                recent_activities.slice(0, 5).map((act: any) => (
                  <div key={act.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate pr-2">
                      <Clock className="w-3.5 h-3.5 text-[#8B97A3] dark:text-slate-400 flex-shrink-0" />
                      <span className="font-semibold text-[#171E25] dark:text-slate-100 font-mono text-[11px] truncate">
                        {act.action}
                      </span>
                    </div>
                    <span className="text-[#8B97A3] dark:text-slate-400 font-mono text-[10px] whitespace-nowrap">
                      {act.created_at}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
