import React, { useState, useEffect } from 'react';
import {
  Menu,
  Bell,
  Sparkles,
  AlertTriangle,
  Building
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { NavigationTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavigationTab;
  onOpenMobileMenu: () => void;
  onOpenAI: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileMenu,
  onOpenAI,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const tabTitles: Record<NavigationTab, { title: string; subtitle: string; spec: string }> = {
    dashboard: { 
      spec: '00 / EXECUTIVE', 
      title: 'Executive Financial Dashboard', 
      subtitle: 'Real-time overview of enterprise cash flow, statutory liabilities & reconciliation health' 
    },
    gst: { 
      spec: '01 / GST-2B', 
      title: 'GST Reconciliation System', 
      subtitle: 'Automated 2-way comparison between Purchase Register & GSTR-2B data with ₹1 tolerance' 
    },
    vendor: { 
      spec: '02 / PAYABLES', 
      title: 'Vendor Ledger & Payables Reconciliation', 
      subtitle: 'Purchase bills, payment tracking, supplier ledgers & automated aging bucket analysis' 
    },
    customer: { 
      spec: '03 / RECEIVABLES', 
      title: 'Customer Receivables & Collection Ledger', 
      subtitle: 'Sales invoices, receipts, debit/credit adjustments & outstanding trade balances' 
    },
    tds: { 
      spec: '04 / TAX COMPLIANCE', 
      title: 'TDS / TCS Compliance & Form 26Q Prep', 
      subtitle: 'Statutory threshold validation (194C, 194J, 194I, 194Q, 206C) and deposit tracking' 
    },
    bank: { 
      spec: '05 / BRS ENGINE', 
      title: 'Bank Reconciliation Statement (BRS)', 
      subtitle: 'Algorithmic statement matching, date tolerance checks & uncleared voucher audit' 
    },
    office: { 
      spec: '06 / OPERATIONS', 
      title: 'Office & Human Resource Management', 
      subtitle: 'Employee records, attendance tracking, expense approvals & company document repository' 
    },
    excel: { 
      spec: '07 / AUTOMATION', 
      title: 'Excel Workflow Automation Engine', 
      subtitle: 'Inspect schema, normalize dates/amounts, deduplicate records, compare 2 sheets & export' 
    },
    mis: { 
      spec: '08 / REPORTING', 
      title: 'MIS Management Reporting', 
      subtitle: 'Management P&L, cash flows, GST/TDS summaries & multi-tab OpenPyXL Excel export' 
    },
    ai: { 
      spec: '09 / AI ASSISTANT', 
      title: 'AI Financial Assistant & Diagnostic Copilot', 
      subtitle: 'Traceable financial reasoning, anomaly detection & data queries grounded in ledger facts' 
    },
    audit: { 
      spec: '10 / GOVERNANCE', 
      title: 'Audit Trails, Security & Role Management', 
      subtitle: 'Immutable system audit logs, tamper-proof tracking & role-based access control' 
    },
    notices: { 
      spec: '11 / BIRJU SIR DESK', 
      title: 'Statutory Notice Management & Legal Response Desk', 
      subtitle: 'Income Tax & GST notices, limitation countdowns, risk assessments, draft replies & tracking' 
    },
    compliance_hub: { 
      spec: '12 / AUTOMATION HUB', 
      title: 'Compliance, Tax Engine & Office Automation Hub', 
      subtitle: 'Auto-Send GSTR PDFs, GSTR AI Filing Agent, ITR Intake Bot, 3-Yr Dossier, Capital Gains & Salary Tools' 
    },
    ai_analytics: { 
      spec: '13 / TELEMETRY', 
      title: 'AI Usage Study & Optimization Analytics', 
      subtitle: 'Telemetry on prompt volume, token economics, man-hours saved, ROI & prompt optimization metrics' 
    },
    vv_chatbot: {
      spec: '14 / INTERNAL CHATBOT',
      title: 'VV-PMSC Internal SOP & Policy Assistant',
      subtitle: 'Authoritative guidance on firm checklists, 148A protocols, PMS mandates, and office HR policies'
    },
    pmsc_public: {
      spec: '15 / PUBLIC PORTAL',
      title: 'PMSC Institutional Consulting & Advisory',
      subtitle: 'Public-facing firm presence, wealth management philosophy, statutory defense, and client intake'
    },
    family_ai: {
      spec: '16 / WMFSK AI',
      title: 'What My Family Should Know AI',
      subtitle: 'Encrypted family estate preparedness, asset inventory checklists, and real-time cyber fraud scanner'
    },
    career_ai: {
      spec: '17 / CAREER AI',
      title: 'Career Pathway AI Acceleration',
      subtitle: 'Skill gap mapping, 12-month career progression milestones, certification navigator & salary ROI benchmarks'
    },
    collection_ai: {
      spec: '18 / COLLECTION AI',
      title: 'Collection AI Trade Receivables Recovery',
      subtitle: 'Automated B2B credit recovery sequences, aging tiers, and MSME Act statutory interest notices'
    },
  };

  useEffect(() => {
    async function fetchNotifs() {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
      } catch {
        // quiet fallback
      }
    }
    fetchNotifs();
  }, [currentTab]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // quiet
    }
  };

  const current = tabTitles[currentTab] || { spec: 'SYSTEM', title: 'Dashboard', subtitle: '' };

  return (
    <header className="h-18 bg-[#F6F3EE] border-b border-[#C5CBD2] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left Title & Mobile Button */}
      <div className="flex items-center space-x-3 overflow-hidden">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 text-[#4A545D] hover:text-[#171E25] hover:bg-[#ECE9E3] rounded-[3px] lg:hidden border border-[#C5CBD2]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2">
            <span className="spec-tag text-[#E65909] font-bold bg-[#E65909]/10 px-1.5 py-0.5 rounded-[2px] border border-[#E65909]/20">
              {current.spec}
            </span>
            <h1 className="text-base sm:text-lg font-display font-bold text-[#1A2F46] truncate">
              {current.title}
            </h1>
            <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-medium bg-[#ECE9E3] text-[#4A545D] px-2 py-0.5 rounded-[2px] border border-[#C5CBD2]">
              FY 2026-27
            </span>
          </div>
          <p className="hidden md:block text-xs font-sans text-[#4A545D] truncate mt-0.5">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Action Icons & Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Production System Org Badge */}
        <div className="hidden xl:flex items-center bg-[#ECE9E3] px-2.5 py-1 rounded-[3px] border border-[#C5CBD2] space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-mono text-[#1A2F46] font-bold uppercase tracking-wider">
            SMARTFIN.AI // LIVE PRODUCTION
          </span>
        </div>

        {/* Quick AI Assistant Trigger */}
        <button
          onClick={onOpenAI}
          className="btn-signal flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask SmartFin AI</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-[#4A545D] hover:text-[#171E25] hover:bg-[#ECE9E3] rounded-[3px] border border-[#C5CBD2] transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E65909] text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-[3px] shadow-xl border border-[#C5CBD2] py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-[#ECE9E3] flex items-center justify-between">
                <span className="font-display font-bold text-xs text-[#1A2F46] uppercase tracking-wider">
                  Audit & Compliance Alerts
                </span>
                <span className="text-[10px] font-mono text-[#8B97A3]">
                  {notifications.length} alerts
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#ECE9E3]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#8B97A3]">
                    No unread notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`p-3.5 hover:bg-[#F6F3EE] cursor-pointer transition-colors ${
                        !n.is_read ? 'bg-[#E65909]/5' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <AlertTriangle className="w-4 h-4 text-[#E65909] flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-[#171E25] font-sans">{n.title}</p>
                          <p className="text-[11px] text-[#4A545D] mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] font-mono text-[#8B97A3] mt-1 inline-block">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#C5CBD2]">
          <div className="w-8 h-8 rounded-[3px] bg-[#1A2F46] text-[#F6F3EE] flex items-center justify-center font-bold text-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-[#171E25] leading-tight">
              {user?.full_name}
            </p>
            <span className="text-[9px] uppercase font-mono font-bold text-[#E65909] bg-[#E65909]/10 px-1 py-0.2 rounded-[2px] border border-[#E65909]/20">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
