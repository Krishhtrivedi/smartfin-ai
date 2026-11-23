import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { NavigationTab } from './components/layout/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { GSTReconciliation } from './pages/GSTReconciliation';
import { VendorReconciliation } from './pages/VendorReconciliation';
import { CustomerReconciliation } from './pages/CustomerReconciliation';
import { TDSManagement } from './pages/TDSManagement';
import { BankReconciliation } from './pages/BankReconciliation';
import { OfficeManagement } from './pages/OfficeManagement';
import { ExcelAutomation } from './pages/ExcelAutomation';
import { MISReports } from './pages/MISReports';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { AuditLogs } from './pages/AuditLogs';
import { StatutoryNotices } from './pages/StatutoryNotices';
import { ComplianceHub } from './pages/ComplianceHub';
import { AutomationCenter } from './pages/AutomationCenter';
import { AIAnalytics } from './pages/AIAnalytics';
import { VVPMSCChatbot } from './pages/VVPMSCChatbot';
import { PMSCPublicWebsite } from './pages/PMSCPublicWebsite';
import { FamilyKnowledgeAI } from './pages/portals/FamilyKnowledgeAI';
import { CareerPathwayAI } from './pages/portals/CareerPathwayAI';
import { CollectionAI } from './pages/portals/CollectionAI';
import { CrmPipeline } from './pages/CrmPipeline';
import { ProjectsKanban } from './pages/ProjectsKanban';
import { MeetingsDesk } from './pages/MeetingsDesk';
import { BusinessScanHub } from './pages/BusinessScanHub';
import { DocumentAnalyzer } from './pages/DocumentAnalyzer';
import { SystemSettingsPage } from './pages/SystemSettingsPage';
import { ShieldAlert, KeyRound, AlertCircle, CheckCircle2, Lock, X } from 'lucide-react';

const ADMIN_ONLY_TABS: NavigationTab[] = ['gst', 'tds', 'bank', 'excel', 'mis', 'audit', 'ai_analytics', 'settings'];

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, changePassword, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [showPublicSite, setShowPublicSite] = useState(false);

  // Mandatory Password Change Modal state
  const [dismissedPwdModal, setDismissedPwdModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#E65909] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-[#5D646C]">Authenticating SMARTFIN.AI session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showPublicSite) {
      return (
        <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-8">
          <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 font-bold">PMSC PUBLIC PORTAL</span>
            <button
              onClick={() => setShowPublicSite(false)}
              className="text-xs font-semibold px-4 py-2 bg-[#1A2F46] text-white rounded-lg hover:bg-[#0D2035] transition-colors"
            >
              ← Back to ERP Login
            </button>
          </div>
          <div className="max-w-7xl mx-auto">
            <PMSCPublicWebsite />
          </div>
        </div>
      );
    }
    return <Login onOpenPublicSite={() => setShowPublicSite(true)} />;
  }

  // Handle mandatory password change for first-time login
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);

    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters long.');
      return;
    }

    setIsUpdatingPwd(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  const renderContent = () => {
    const isAdmin = user?.role === 'admin';

    // Route Protection Barrier
    if (!isAdmin && ADMIN_ONLY_TABS.includes(currentTab)) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white border border-[#C5CBD2] rounded-[3px] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-[3px] bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="spec-tag text-rose-600 font-bold">ACCESS RESTRICTED // 403 FORBIDDEN</span>
            <h2 className="font-display font-bold text-xl text-[#1A2F46] mt-1">
              Administrator Privileges Required
            </h2>
            <p className="text-xs text-[#5D646C] mt-1 max-w-md mx-auto">
              You are currently signed in as <strong className="text-[#171E25]">{user?.full_name}</strong> ({user?.role}). This module contains sensitive financial reconciliation controls accessible exclusively to SMARTFIN.AI Administrators.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="btn-signal px-4 py-2 text-xs font-semibold"
            >
              Return to My Workplace Dashboard
            </button>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
      case 'crm_pipeline':
        return <CrmPipeline />;
      case 'projects_kanban':
        return <ProjectsKanban />;
      case 'meetings_desk':
        return <MeetingsDesk />;
      case 'business_scan':
        return <BusinessScanHub />;
      case 'doc_analyzer':
        return <DocumentAnalyzer />;
      case 'settings':
        return <SystemSettingsPage />;
      case 'gst':
        return <GSTReconciliation />;
      case 'vendor':
        return <VendorReconciliation />;
      case 'customer':
        return <CustomerReconciliation />;
      case 'tds':
        return <TDSManagement />;
      case 'bank':
        return <BankReconciliation />;
      case 'office':
        return <OfficeManagement />;
      case 'excel':
        return <ExcelAutomation />;
      case 'mis':
        return <MISReports />;
      case 'ai':
        return <AIAssistantPage onNavigateTab={(tab) => setCurrentTab(tab)} />;
      case 'audit':
        return <AuditLogs />;
      case 'notices':
        return <StatutoryNotices />;
      case 'automation':
        return <AutomationCenter />;
      case 'compliance_hub':
        return <ComplianceHub />;
      case 'ai_analytics':
        return <AIAnalytics />;
      case 'vv_chatbot':
        return <VVPMSCChatbot />;
      case 'pmsc_public':
        return <PMSCPublicWebsite />;
      case 'family_ai':
        return <FamilyKnowledgeAI />;
      case 'career_ai':
        return <CareerPathwayAI />;
      case 'collection_ai':
        return <CollectionAI />;
      default:
        return <Dashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <>
      {/* Optional / First-Time Password Change Overlay Modal */}
      {user?.must_change_password && !dismissedPwdModal && (
        <div className="fixed inset-0 z-50 bg-[#0D2035]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F6F3EE] max-w-md w-full p-6 sm:p-8 rounded-[3px] border border-[#C5CBD2] shadow-2xl text-[#171E25] relative">
            <button
              type="button"
              onClick={() => setDismissedPwdModal(true)}
              className="absolute top-4 right-4 text-[#8B97A3] hover:text-[#171E25]"
              title="Close and continue to dashboard"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-[3px] bg-[#1A2F46] text-[#E65909] flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="spec-tag text-[#E65909] font-bold">SECURITY RECOMMENDATION</span>
                <h3 className="font-display font-bold text-lg text-[#1A2F46]">
                  Change Temporary Password
                </h3>
              </div>
            </div>

            <p className="text-xs text-[#5D646C] leading-relaxed mb-4">
              This account was provisioned with an initial temporary password. You can choose a new password now or proceed directly to your workplace dashboard.
            </p>

            {pwdError && (
              <div className="mb-4 p-3 rounded-[3px] bg-rose-50 border border-rose-200 flex items-center space-x-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{pwdError}</span>
              </div>
            )}

            <form className="space-y-3" onSubmit={handleChangePasswordSubmit}>
              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  Current Temporary Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password (SmartFin@2026!)"
                  className="w-full px-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  New Permanent Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Choose a strong password"
                  className="w-full px-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPwd}
                  className="btn-signal w-full py-2.5 px-4 text-xs font-semibold"
                >
                  {isUpdatingPwd ? 'Saving New Password...' : 'Save Password & Continue'}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-3 border-t border-[#C5CBD2] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDismissedPwdModal(true)}
                className="text-xs font-mono text-[#E65909] hover:underline font-semibold"
              >
                Skip for Now & Access Dashboard →
              </button>
              <button
                onClick={logout}
                className="text-xs font-mono text-[#5D646C] hover:text-rose-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <Layout currentTab={currentTab} onSelectTab={setCurrentTab}>
        {renderContent()}
      </Layout>
    </>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
