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

  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    code: string;
    roles?: string[];
    badge?: string;
  }> = [
    { 
      id: 'dashboard', 
      label: isAdmin ? 'Executive Dashboard' : 'My Workplace Dashboard', 
      code: '00', 
      icon: LayoutDashboard 
    },
    { 
      id: 'gst', 
      label: 'GST 2B Reconciliation', 
      code: '01', 
      icon: Receipt, 
      badge: 'Admin',
      roles: ['admin'] 
    },
    { 
      id: 'vendor', 
      label: 'Vendor Ledgers & Aging', 
      code: '02', 
      icon: Building2 
    },
    { 
      id: 'customer', 
      label: 'Customer Receivables', 
      code: '03', 
      icon: Users2 
    },
    { 
      id: 'tds', 
      label: 'TDS/TCS 26Q Compliance', 
      code: '04', 
      icon: FileSpreadsheet,
      badge: 'Admin',
      roles: ['admin'] 
    },
    { 
      id: 'bank', 
      label: 'Bank BRS Statement', 
      code: '05', 
      icon: Landmark, 
      badge: 'Admin',
      roles: ['admin'] 
    },
    { 
      id: 'office', 
      label: 'Office & HR Operations', 
      code: '06', 
      icon: Briefcase 
    },
    { 
      id: 'excel', 
      label: 'Excel Workflow Engine', 
      code: '07', 
      icon: FileCode2, 
      badge: 'Admin',
      roles: ['admin'] 
    },
    { 
      id: 'mis', 
      label: 'MIS Management Reports', 
      code: '08', 
      icon: BarChart3,
      badge: 'Admin',
      roles: ['admin'] 
    },
    { 
      id: 'ai', 
      label: 'AI Finance Assistant', 
      code: '09', 
      icon: Bot, 
      badge: 'AI' 
    },
    { 
      id: 'audit', 
      label: 'Audit Trail & RBAC', 
      code: '10', 
      icon: ShieldCheck, 
      roles: ['admin'] 
    },
    { 
      id: 'notices', 
      label: 'Statutory Notices (Birju Sir)', 
      code: '11', 
      icon: Scale, 
      badge: 'Desk' 
    },
    { 
      id: 'compliance_hub', 
      label: 'Compliance Automation Hub', 
      code: '12', 
      icon: FileCheck2, 
      badge: 'Hub' 
    },
    { 
      id: 'ai_analytics', 
      label: 'AI Usage & ROI Study', 
      code: '13', 
      icon: Cpu, 
      badge: 'Telemetry',
      roles: ['admin'] 
    },
    { 
      id: 'vv_chatbot', 
      label: 'VV-PMSC SOP Assistant', 
      code: '14', 
      icon: BookOpenCheck, 
      badge: 'SOP' 
    },
    { 
      id: 'pmsc_public', 
      label: 'PMSC Public Website', 
      code: '15', 
      icon: Globe, 
      badge: 'Portal' 
    },
    { 
      id: 'family_ai', 
      label: 'Family Knowledge AI', 
      code: '16', 
      icon: FolderLock, 
      badge: 'WMFSK' 
    },
    { 
      id: 'career_ai', 
      label: 'Career Pathway AI', 
      code: '17', 
      icon: Compass, 
      badge: 'Careers' 
    },
    { 
      id: 'collection_ai', 
      label: 'Collection AI Recovery', 
      code: '18', 
      icon: Receipt, 
      badge: 'DSO' 
    },
  ];

  const allowedItems = navItems.filter(
    (item) => !item.roles || isAdmin || (user && item.roles.includes(user.role))
  );

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

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-[3px] text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1A2F46] text-white border-l-4 border-[#E65909] shadow-inner font-semibold pl-2.5'
                    : 'text-[#8B97A3] hover:text-[#E6ECF2] hover:bg-[#1A2F46]/50'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className={`text-[10px] font-mono ${isActive ? 'text-[#F86927]' : 'text-[#7C8793]'}`}>
                    {item.code}
                  </span>
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-[#E65909]' : 'text-[#8B97A3] group-hover:text-white'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-[2px] font-mono uppercase tracking-wider ${
                        isActive
                          ? 'bg-[#E65909] text-white font-semibold'
                          : 'bg-[#1A2F46] text-[#8B97A3] border border-[#364452]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#E65909]" />}
                </div>
              </button>
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
