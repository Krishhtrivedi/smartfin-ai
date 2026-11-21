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
  FolderLock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationTab =
  | 'dashboard'
  | 'gst'
  | 'vendor'
  | 'customer'
  | 'tds'
  | 'bank'
  | 'office'
  | 'excel'
  | 'mis'
  | 'ai'
  | 'audit'
  | 'notices'
  | 'compliance_hub'
  | 'automation'
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
      title: 'CORE WORKPLACE & STATUTORY',
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
          label: 'Client Master & Receivables',
          code: '01',
          icon: Users2,
          badge: '2,207 Assessees',
        },
        {
          id: 'compliance_hub',
          label: 'Statutory Automation Hub',
          code: '02',
          icon: FileCheck2,
          badge: 'GSTR / ITR / WA',
        },
        {
          id: 'automation',
          label: 'Automation Center',
          code: 'AC',
          icon: Bot,
          badge: 'GST / IT / WA',
        },
        {
          id: 'notices',
          label: 'Statutory Notices Desk',
          code: '03',
          icon: Scale,
          badge: 'Desk',
        },
        {
          id: 'audit',
          label: 'Audit Trail & Security',
          code: '04',
          icon: ShieldCheck,
          roles: ['admin'],
        },
      ],
    },
    {
      title: 'TAX & RECONCILIATION ENGINES',
      items: [
        {
          id: 'gst',
          label: 'GST 2B Reconciliation',
          code: '05',
          icon: Receipt,
          badge: 'Admin',
          roles: ['admin'],
        },
        {
          id: 'vendor',
          label: 'Vendor Ledgers & Aging',
          code: '06',
          icon: Building2,
        },
        {
          id: 'tds',
          label: 'TDS/TCS 26Q Compliance',
          code: '07',
          icon: FileSpreadsheet,
          badge: 'Admin',
          roles: ['admin'],
        },
        {
          id: 'bank',
          label: 'Bank BRS Statement',
          code: '08',
          icon: Landmark,
          badge: 'Admin',
          roles: ['admin'],
        },
        {
          id: 'excel',
          label: 'Excel Workflow Engine',
          code: '09',
          icon: FileCode2,
          badge: 'Admin',
          roles: ['admin'],
        },
        {
          id: 'mis',
          label: 'MIS Management Reports',
          code: '10',
          icon: BarChart3,
          badge: 'Admin',
          roles: ['admin'],
        },
      ],
    },
    {
      title: 'OFFICE OPERATIONS & ADVISORY',
      items: [
        {
          id: 'office',
          label: 'Office & HR Operations',
          code: '11',
          icon: Briefcase,
        },
        {
          id: 'vv_chatbot',
          label: 'VV-PMSC SOP Assistant',
          code: '12',
          icon: BookOpenCheck,
          badge: 'SOP',
        },
        {
          id: 'pmsc_public',
          label: 'PMSC Public Website',
          code: '13',
          icon: Globe,
          badge: 'Portal',
        },
        {
          id: 'ai',
          label: 'AI Finance Assistant',
          code: '14',
          icon: Bot,
          badge: 'Copilot',
        },
      ],
    },
    {
      title: 'INCUBATOR APPS & EXPERIMENTS',
      badge: 'SIDE / BETA',
      isSideOrPending: true,
      items: [
        {
          id: 'family_ai',
          label: 'Family Knowledge AI',
          code: '15',
          icon: FolderLock,
          badge: 'Beta',
        },
        {
          id: 'career_ai',
          label: 'Career Pathway AI',
          code: '16',
          icon: Compass,
          badge: 'Beta',
        },
        {
          id: 'collection_ai',
          label: 'Collection AI Recovery',
          code: '17',
          icon: Receipt,
          badge: 'Beta',
        },
        {
          id: 'ai_analytics',
          label: 'AI Usage & ROI Study',
          code: '18',
          icon: Cpu,
          badge: 'Telemetry',
          roles: ['admin'],
        },
      ],
    },
  ];

  const filterItem = (item: NavItem) =>
    !item.roles || isAdmin || (user && item.roles.includes(user.role));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0D2035]/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0D2035] text-[#E6ECF2] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-[#364452] shadow-2xl blueprint-grid-navy-deep`}
      >
        {/* Brand Header */}
        <div className="h-20 flex flex-col justify-center px-5 border-b border-[#364452] bg-[#1A2F46]/85 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-[4px] bg-[#0D2035] border border-[#E65909]/60 flex items-center justify-center flex-shrink-0 shadow-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#E65909]/20 to-transparent"></div>
              <Compass className="w-5 h-5 text-[#E65909] transform transition-transform group-hover:rotate-45" />
            </div>

            <div className="overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <span className="font-display font-extrabold text-white text-base tracking-tight uppercase">
                  SMARTFIN.AI
                </span>
                <span className="text-[9px] font-mono font-semibold bg-[#E65909] text-white px-1.5 py-0.2 rounded-sm uppercase tracking-wider">
                  ERP
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#8B97A3] tracking-wider uppercase truncate">
                Finance & Office Automation
              </p>
            </div>
          </div>
        </div>

        {/* Eyebrow System Label */}
        <div className="px-5 pt-3 pb-1.5 flex items-center justify-between border-b border-[#364452]/40 bg-[#0D2035]/60">
          <span className="text-[10px] font-mono text-[#8B97A3] tracking-widest uppercase">
            ORGANISATIONAL SYSTEM
          </span>
          <span className="text-[9px] font-mono text-[#F86927] font-semibold uppercase">
            {user?.role || 'SECURE'}
          </span>
        </div>

        {/* Navigation list (Organized into 4 explicit sections: Core Operations vs Incubator) */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {navSections.map((section, idx) => {
            const visibleItems = section.items.filter(filterItem);
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {/* Section Header */}
                <div className={`px-2 pt-2 pb-1 flex items-center justify-between ${
                  section.isSideOrPending ? 'mt-3 pt-3 border-t border-[#364452]/70' : ''
                }`}>
                  <span className={`text-[9px] font-mono font-bold tracking-widest uppercase ${
                    section.isSideOrPending ? 'text-amber-400' : 'text-[#8B97A3]'
                  }`}>
                    {section.title}
                  </span>
                  {section.badge && (
                    <span className="text-[8px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1 py-0.2 rounded uppercase">
                      {section.badge}
                    </span>
                  )}
                </div>

                {/* Items */}
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
                        className={`w-full group flex items-center justify-between px-2.5 py-2 rounded-[3px] text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#1A2F46] text-white border-l-4 border-[#E65909] shadow-inner font-semibold pl-2'
                            : section.isSideOrPending
                            ? 'text-[#7C8793] hover:text-[#E6ECF2] hover:bg-[#1A2F46]/40'
                            : 'text-[#8B97A3] hover:text-[#E6ECF2] hover:bg-[#1A2F46]/50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={`text-[10px] font-mono ${isActive ? 'text-[#F86927]' : 'text-[#626E7A]'}`}>
                            {item.code}
                          </span>
                          <Icon
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isActive ? 'text-[#E65909]' : 'text-[#8B97A3] group-hover:text-white'
                            }`}
                          />
                          <span className="truncate text-[11px] font-sans">{item.label}</span>
                        </div>

                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {item.badge && (
                            <span
                              className={`text-[8px] px-1 py-0.2 rounded-[2px] font-mono uppercase tracking-wider ${
                                isActive
                                  ? 'bg-[#E65909] text-white font-semibold'
                                  : 'bg-[#1A2F46] text-[#8B97A3] border border-[#364452]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {isActive && <ChevronRight className="w-3 h-3 text-[#E65909]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-[#364452] bg-[#091522]/90 space-y-2.5">
          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-[3px] bg-[#E65909]/20 text-[#F86927] border border-[#E65909]/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.full_name || 'Staff User'}
                </p>
                <p className="text-[10px] font-mono text-[#8B97A3] truncate capitalize">
                  {user?.role} • {user?.department || 'Operations'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-[#8B97A3] hover:text-[#F86927] hover:bg-[#1A2F46] rounded-[3px] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
