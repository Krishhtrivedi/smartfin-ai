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

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
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
      default:
        return <Dashboard onNavigateTab={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <Layout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {renderContent()}
    </Layout>
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
