import React, { useState } from 'react';
import { Sidebar, NavigationTab } from './Sidebar';
import { Header } from './Header';
import { AIAssistantDrawer } from '../common/AIAssistantDrawer';
import { ExternalLink, Compass } from 'lucide-react';

interface LayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F3EE] flex">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all">
        <Header
          currentTab={currentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAI={() => setAiDrawerOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Vichar Vimarsh Architectural Footer */}
        <footer className="border-t border-[#C5CBD2] bg-[#ECE9E3] py-6 px-6 mt-12 text-[#4A545D]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-center md:text-left">
              <div className="w-8 h-8 rounded-[3px] bg-[#1A2F46] flex items-center justify-center text-[#E65909] font-bold text-xs flex-shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <p className="font-display font-bold text-sm text-[#1A2F46] tracking-tight">
                  Vichar Vimarsh · SmartFin AI Automation
                </p>
                <p className="text-xs text-[#5D646C]">
                  "Great organizations are not built by chance. They are built by clarity of thought."
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs font-mono">
              <span className="text-[#E65909] font-bold uppercase tracking-wider">
                Think. Act. Achieve.
              </span>
              <span className="text-[#8B97A3] hidden sm:inline">•</span>
              <a 
                href="https://vicharvimarsh.com/" 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center space-x-1 text-[#1A2F46] hover:text-[#E65909] font-medium transition-colors"
              >
                <span>vicharvimarsh.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[#8B97A3] hidden sm:inline">•</span>
              <span className="text-[#5D646C]">Powered by Quick HR Solution</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Slide-out AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      />
    </div>
  );
};
