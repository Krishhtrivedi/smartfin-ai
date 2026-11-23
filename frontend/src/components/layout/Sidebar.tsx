import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Building2,
  Users2,
  FileSpreadsheet,
  Landmark,
  Briefcase,
  FileCode2,
  BarChart3,
  Bot,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Compass,
  Scale,
  FileCheck2,
  Cpu,
  BookOpenCheck,
  Globe,
  FolderLock,
  TrendingUp,
  FolderKanban,
  Calendar,
  FileText,
  Settings,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'customer'
  | 'crm_pipeline'
  | 'projects_kanban'
  | 'meetings_desk'
  | 'compliance_hub'
  | 'automation'
  | 'notices'
  | 'business_scan'
  | 'doc_analyzer'
  | 'ai'
  | 'gst'
  | 'vendor'
  | 'tds'
  | 'bank'
  | 'excel'
  | 'mis'
  | 'office'
  | 'settings'
  | 'audit'
  | 'ai_analytics'
  | 'vv_chatbot'
  | 'pmsc_public'
  | 'family_ai'
  | 'career_ai'
  | 'collection_ai';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  interface NavItem {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    code: string;
    roles?: string[];
    badge?: string;
  }

  interface NavSection {
    title: string;
    badge?: string;
    isSideOrPending?: boolean;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: 'EXECUTIVE & CLIENT MANAGEMENT',
      items: [
        {
          id: 'dashboard',
          label: isAdmin ? 'Executive Dashboard' : 'My Workplace Dashboard',
          code: '00',
          icon: LayoutDashboard,
          badge: 'Live',
        },
        {
          id: 'customer',
          label: 'Client Master & Vault',
          code: '01',
          icon: Users2,
          badge: '2,207 Assessees',
        },
        {
          id: 'crm_pipeline',
          label: 'CRM Lead Pipeline',
          code: '02',
          icon: TrendingUp,
          badge: 'Kanban',
        },
        {
          id: 'projects_kanban',
          label: 'Projects & Tasks Kanban',
          code: '03',
          icon: FolderKanban,
          badge: 'Delivery',
        },
        {
          id: 'meetings_desk',
          label: 'Executive Meetings Desk',
          code: '04',
          icon: Calendar,
          badge: 'AI Minutes',
        },
      ],
    },
    {
      title: 'STATUTORY AUTOMATION & NOTICES',
      items: [
        {
          id: 'compliance_hub',
          label: 'Statutory Automation Hub',
          code: '05',
          icon: FileCheck2,
          badge: 'GSTR/ITR/WA',
        },
        {
          id: 'notices',
          label: 'Statutory Notices Desk',
          code: '06',
          icon: Scale,
          badge: '7d/15d/30d',
        },
        {
          id: 'automation',
          label: 'Automation Center',
          code: '07',
          icon: Bot,
          badge: 'Desktop Sync',
        },
      ],
    },
    {
      title: 'DIAGNOSTICS & COGNITIVE AI',
      items: [
        {
          id: 'business_scan',
          label: 'Business Scan Hub',
          code: '08',
          icon: Compass,
          badge: '7 Domains',
        },
        {
          id: 'doc_analyzer',
          label: 'AI Document Analyzer',
          code: '09',
          icon: FileText,
          badge: 'Parser & Chat',
        },
        {
          id: 'ai',
          label: 'Vichar AI Copilot',
          code: '10',
          icon: Cpu,
          badge: 'Advisor',
        },
      ],
    },
    {
      title: 'TAX & RECONCILIATION ENGINES',
      items: [
        {
          id: 'gst',
          label: 'GST 2B Reconciliation',
          code: '11',
          icon: Receipt,
          badge: 'Admin',
          roles: ['admin'],
        },
        {
          id: 'vendor',
          label: 'Vendor Ledgers & Aging',
          code: '12',
          icon: Building2,
        },
        {
          id: 'tds',
          label: 'TDS/TCS 26Q Compliance',
          code: '13',
          icon: FileSpreadsheet,
          badge: 'Admin',
          roles: ['admin'],
        },
        {
          id: 'bank',
          label: 'Bank BRS Statement',
          code: '14',
          icon: Landmark,
          badge: 'Admin',
          roles: ['admin'],
        },
        {
          id: 'excel',
          label: 'Excel Workflow Engine',
          code: '15',
          icon: FileCode2,
          badge: 'Admin',
          roles: ['admin'],
        },
        {
          id: 'mis',
          label: 'MIS Management Reports',
          code: '16',
          icon: BarChart3,
          badge: 'Admin',
          roles: ['admin'],
        },
      ],
    },
    {
      title: 'OFFICE, SECURITY & SETTINGS',
      items: [
        {
          id: 'office',
          label: 'Office & HR Operations',
          code: '17',
          icon: Briefcase,
        },
        {
          id: 'settings',
          label: 'Settings & Diagnostics',
          code: '18',
          icon: Settings,
          badge: 'SMTP/WA/AI',
          roles: ['admin'],
        },
        {
          id: 'audit',
          label: 'Audit Trail & Security',
          code: '19',
          icon: ShieldCheck,
          roles: ['admin'],
        },
        {
          id: 'vv_chatbot',
          label: 'VV-PMSC SOP Assistant',
          code: '20',
          icon: BookOpenCheck,
        },
        {
          id: 'pmsc_public',
          label: 'PMSC Public Website',
          code: '21',
          icon: Globe,
        },
      ],
    },
    {
      title: 'INCUBATOR PRODUCTS',
      badge: 'SIDE / BETA',
      isSideOrPending: true,
      items: [
        {
          id: 'family_ai',
          label: 'Family Knowledge AI',
          code: '22',
          icon: FolderLock,
        },
        {
          id: 'career_ai',
          label: 'Career Pathway AI',
          code: '23',
          icon: Compass,
        },
        {
          id: 'collection_ai',
          label: 'Collection AI Sequence',
          code: '24',
          icon: Briefcase,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: Fixed on desktop, sliding drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 h-full w-64 xl:w-72 bg-[#1A2F46] dark:bg-[#0D2035] text-[#F6F3EE] flex flex-col justify-between border-r border-[#0D2035] dark:border-slate-800 transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="p-4 border-b border-[#0D2035]/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-[3px] bg-[#E65909] text-white flex items-center justify-center font-serif font-bold text-base shadow-sm">
              VV
            </div>
            <div>
              <div className="font-serif font-bold text-sm tracking-wide text-white">
                VICHAR VIMARSH
              </div>
              <div className="text-[10px] font-mono tracking-widest text-[#E65909] font-bold uppercase">
                SmartFin.AI Enterprise
              </div>
            </div>
          </div>

          {/* Close Button on Mobile Drawer */}
          <button
            onClick={onClose}
            className="p-1.5 text-[#8B97A3] hover:text-white hover:bg-white/10 rounded-[3px] lg:hidden transition-colors"
            title="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs font-sans">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              item => !item.roles || (user && item.roles.includes(user.role))
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-mono tracking-wider font-bold text-[#8B97A3] uppercase">
                  <span>{section.title}</span>
                  {section.badge && (
                    <span className="px-1 py-0.2 rounded text-[9px] bg-[#0D2035] text-[#E65909] border border-[#0D2035]">
                      {section.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectTab(item.id);
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[2px] text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-[#E65909] text-white shadow-sm font-semibold'
                            : 'text-[#C5CBD2] hover:bg-[#0D2035] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span
                            className={`text-[10px] font-mono font-bold shrink-0 ${
                              isActive ? 'text-white/80' : 'text-[#8B97A3]'
                            }`}
                          >
                            {item.code}
                          </span>
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[#8B97A3]'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-[#0D2035] text-[#C5CBD2] border border-[#2A3E54]'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-[#0D2035]/80 bg-[#0D2035]/40 flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <div className="text-xs font-bold text-white truncate">{user?.full_name || 'Advisor'}</div>
            <div className="text-[10px] font-mono text-[#8B97A3] uppercase truncate">
              {user?.role} · {user?.department || 'Executive'}
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Sign out of system"
            className="p-1.5 rounded hover:bg-[#0D2035] text-[#8B97A3] hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
