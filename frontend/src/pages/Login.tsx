import React, { useState } from 'react';
import { Compass, ArrowRight, Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const Login: React.FC = () => {
  const { login, quickLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    }
  };

  const demoRoles: Array<{
    role: UserRole;
    code: string;
    name: string;
    title: string;
    email: string;
    badgeColor: string;
  }> = [
    {
      role: 'admin',
      code: '01',
      name: 'Rajesh Mehta',
      title: 'Chief Financial Officer (Admin)',
      email: 'admin@smartfin.ai',
      badgeColor: 'bg-[#1A2F46] text-[#E6ECF2]',
    },
    {
      role: 'accountant',
      code: '02',
      name: 'Priya Nair',
      title: 'Lead Chartered Accountant',
      email: 'accountant@smartfin.ai',
      badgeColor: 'bg-[#E65909] text-white',
    },
    {
      role: 'manager',
      code: '03',
      name: 'Vikram Seth',
      title: 'Finance & Planning Manager',
      email: 'manager@smartfin.ai',
      badgeColor: 'bg-[#364452] text-white',
    },
    {
      role: 'employee',
      code: '04',
      name: 'Sneha Patel',
      title: 'Office Executive',
      email: 'employee@smartfin.ai',
      badgeColor: 'bg-[#8B97A3] text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0D2035] blueprint-grid-navy-deep flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Brand Bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-[#364452] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-[3px] bg-[#1A2F46] border border-[#E65909]/60 flex items-center justify-center text-[#E65909] shadow-md">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-extrabold text-white text-lg tracking-tight uppercase">
                Vichar Vimarsh
              </span>
              <span className="text-[10px] font-mono font-semibold bg-[#E65909] text-white px-1.5 py-0.5 rounded-[2px] uppercase">
                SmartFin AI
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#8B97A3] uppercase tracking-wider">
              Finance & Office Automation Systems
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
          <span className="text-[#8B97A3]">AHMEDABAD, GUJARAT</span>
          <span className="text-[#364452]">|</span>
          <span className="text-[#F86927] font-semibold">THINK. ACT. ACHIEVE.</span>
        </div>
      </div>

      {/* Main Hero & Login Split Container */}
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-8">
        {/* Left Column: Vichar Vimarsh Architectural Statement */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-[3px] bg-[#1A2F46] border border-[#364452] text-[11px] font-mono text-[#F86927]">
            <span>V—V</span>
            <span className="text-[#8B97A3]">/</span>
            <span>SYSTEMS RUNNING BY DESIGN</span>
          </div>

          <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-[1.08]">
            A business that no longer needs you{' '}
            <span className="text-[#F86927]">in every room.</span>
          </h1>

          <p className="font-sans text-sm sm:text-base text-[#8B97A3] max-w-xl leading-relaxed">
            Eliminate repetitive manual accounting, 2-way GST reconciliation gaps, TDS calculation errors, and Excel chaos. SmartFin AI transitions enterprise operations from owner dependence to automated, verifiable systems.
          </p>

          {/* 3 Step Indicators matching Vichar Vimarsh Website Design */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#364452]">
            <div className="border-t-2 border-[#E65909] pt-2">
              <span className="font-mono text-[10px] text-[#F86927] font-bold block">01 / RECON</span>
              <span className="font-display font-semibold text-xs text-[#E6ECF2] block mt-0.5">GST 2B & Bank BRS</span>
              <span className="text-[10px] text-[#7C8793] block">Automatic ₹1 tolerance</span>
            </div>
            <div className="border-t-2 border-[#E65909] pt-2">
              <span className="font-mono text-[10px] text-[#F86927] font-bold block">02 / COMPLY</span>
              <span className="font-display font-semibold text-xs text-[#E6ECF2] block mt-0.5">TDS & Ledgers</span>
              <span className="text-[10px] text-[#7C8793] block">194C, 194J, 206C checks</span>
            </div>
            <div className="border-t-2 border-[#E65909] pt-2">
              <span className="font-mono text-[10px] text-[#E65909] pt-2 block">03 / ACHIEVE</span>
              <span className="font-display font-semibold text-xs text-[#E6ECF2] block mt-0.5">MIS Reports & AI</span>
              <span className="text-[10px] text-[#7C8793] block">Actionable cashflow</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Login & 1-Click Role Switcher */}
        <div className="lg:col-span-5 bg-[#F6F3EE] p-6 sm:p-8 rounded-[3px] border border-[#C5CBD2] shadow-2xl text-[#171E25]">
          <div className="border-b border-[#C5CBD2] pb-4 mb-5">
            <span className="font-mono text-[10px] text-[#E65909] uppercase tracking-wider font-semibold block">
              ENTERPRISE ACCESS PORTAL
            </span>
            <h2 className="font-display font-bold text-xl text-[#1A2F46] mt-1">
              Sign In to SmartFin AI
            </h2>
            <p className="text-xs text-[#5D646C] mt-0.5">
              Role-based accounting, compliance & management controls.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-[3px] bg-rose-50 border border-rose-200 flex items-center space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8B97A3] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smartfin.ai"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#4A545D] uppercase tracking-wider mb-1 font-semibold">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8B97A3] absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-[3px] border border-[#C5CBD2] bg-white focus:outline-none focus:border-[#E65909] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-signal w-full py-2.5 px-4 flex items-center justify-center space-x-2 text-xs font-semibold mt-2"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* 1-Click Instant Demo Access */}
          <div className="mt-5 pt-4 border-t border-[#C5CBD2]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] text-[#5D646C] uppercase tracking-wider font-semibold">
                1-Click Demo Profiles:
              </span>
              <span className="text-[10px] font-mono text-[#E65909]">Instant Access</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {demoRoles.map((dr) => (
                <button
                  key={dr.role}
                  onClick={() => quickLogin(dr.role)}
                  className="group flex items-center justify-between p-2 rounded-[3px] border border-[#C5CBD2] bg-white hover:border-[#E65909] hover:bg-[#ECE9E3] text-left transition-all"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="font-mono text-[10px] text-[#8B97A3] group-hover:text-[#E65909]">
                      {dr.code}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-[#1A2F46] leading-tight truncate">{dr.name}</p>
                      <p className="text-[10px] text-[#5D646C] truncate">{dr.title}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-[2px] ${dr.badgeColor}`}>
                    {dr.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Credo & Location Bar */}
      <div className="max-w-6xl w-full mx-auto border-t border-[#364452] pt-4 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-[#8B97A3] gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#E65909]" />
          <span>Vichar Vimarsh · 701, Mauryansh Elanza, Satellite, Ahmedabad</span>
        </div>
        <div className="flex items-center space-x-3">
          <span>Powered by Quick HR Solution</span>
          <span className="text-[#364452]">•</span>
          <a href="https://vicharvimarsh.com/" target="_blank" rel="noreferrer" className="text-[#F86927] hover:underline">
            vicharvimarsh.com
          </a>
        </div>
      </div>
    </div>
  );
};
