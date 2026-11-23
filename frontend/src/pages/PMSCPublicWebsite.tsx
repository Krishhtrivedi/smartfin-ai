import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  Mail,
  Phone,
  ArrowRight,
  CheckCircle2,
  Scale,
  Landmark,
  Briefcase,
  Users2,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Inbox,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PMSCPublicWebsite: React.FC = () => {
  const { user } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    entity_name: '',
    service_type: 'PMS_WEALTH',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any | null>(null);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const fetchInquiries = async () => {
    if (user?.role !== 'admin') return;
    setLoadingInquiries(true);
    try {
      const data = await api.getPublicInquiries();
      setInquiries(data);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoadingInquiries(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await api.submitPublicClientIntake(formData);
      setSubmitResult(res);
      setFormData({
        full_name: '',
        entity_name: '',
        service_type: 'PMS_WEALTH',
        email: '',
        phone: '',
        message: ''
      });
      if (user?.role === 'admin') {
        fetchInquiries();
      }
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-8 ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-[#131C2E] overflow-y-auto p-4 md:p-8' : ''}`}>
      {/* Top Bar with Mode Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
            Public Web Presence
          </span>
          <span className="text-xs font-mono text-slate-400">| Domain: pmsc.vicharvimarsh.com (Institutional Site)</span>
        </div>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="text-xs font-mono text-slate-600 hover:text-slate-900 dark:text-slate-100 flex items-center space-x-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isFullscreen ? 'Exit Standalone View' : 'Preview as Standalone Site'}</span>
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#0D2035] via-[#1A2F46] to-[#0D2035] text-white p-8 md:p-14 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#E65909]/20 border border-[#E65909]/40 text-[#E65909] text-xs font-mono font-bold tracking-wide">
            <span>VICHAR VIMARSH GROUP</span>
            <span>•</span>
            <span>ESTABLISHED 2014</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold font-display leading-tight tracking-tight">
            Institutional Wealth, Statutory Litigation & Corporate Finance Advisory
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
            PMSC provides high-stakes statutory tax defense, SEBI-compliant portfolio management advisory, and credit control automation to family offices, business owners, and corporate leaders across India.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href="#client-intake"
              className="px-6 py-3 bg-[#E65909] hover:bg-[#d04e06] text-white text-xs font-bold rounded-lg transition-colors shadow-md flex items-center space-x-2"
            >
              <span>Schedule Strategic Consultation</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#core-practices"
              className="px-6 py-3 bg-white dark:bg-[#131C2E]/10 hover:bg-white dark:bg-[#131C2E]/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition-colors"
            >
              <span>Explore Practice Areas</span>
            </a>
          </div>
        </div>

        {/* Ambient Decorative Graphic */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#E65909]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Key Practice Pillars */}
      <div id="core-practices" className="space-y-4 w-full max-w-none">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-[11px] font-mono font-bold text-[#E65909] uppercase tracking-wider">
            Our Advisory Capabilities
          </span>
          <h2 className="text-xl md:text-2xl font-bold font-display text-navy-950">
            Institutional Rigor Across Every Financial Domain
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-[#1A2F46] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-950">PMS & Family Office</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              SEBI-aligned portfolio management consulting, capital allocation frameworks, and hurdle-rate structured mandates for HNIs with ₹50L+ investable corpus.
            </p>
            <div className="text-[11px] font-mono text-[#E65909] font-bold">Led by Pinal Shah</div>
          </div>

          <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-[#1A2F46] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-950">Statutory Tax Litigation</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Decisive defense in Section 148A reassessment notices, faceless scrutiny appeals, and GST search/seizure proceedings under Indian tax statutes.
            </p>
            <div className="text-[11px] font-mono text-[#E65909] font-bold">Led by Biraju Bhai</div>
          </div>

          <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-[#1A2F46] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-950">Trade Receivables & DSO</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Structured B2B payment recovery sequences, MSME Section 16 interest protection notices, and debt collection automation for enterprise distributors.
            </p>
            <div className="text-[11px] font-mono text-[#E65909] font-bold">Credit Control Desk</div>
          </div>

          <div className="bg-white dark:bg-[#131C2E] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-[#1A2F46] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-navy-950">Virtual CFO & Bank Audit</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              High-velocity treasury management, bank reconciliation audits, and automated MIS reporting for board-level governance.
            </p>
            <div className="text-[11px] font-mono text-[#E65909] font-bold">Led by Nilesh Jain</div>
          </div>
        </div>
      </div>

      {/* Compliance & Standards Showcase */}
      <div className="bg-slate-50 dark:bg-[#1A253A] p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2 text-emerald-700 text-xs font-mono font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>INSTITUTIONAL GOVERNANCE & PRIVACY</span>
          </div>
          <h3 className="text-base font-bold text-navy-950 font-display">
            Bank-Grade Data Security with Comprehensive Audit Trails
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            All client files, return filings, and communications are secured under 256-bit encryption. Actions are tied to verifiable timestamps and client IPs for uncompromised regulatory assurance.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center text-xs font-mono font-bold w-full md:w-auto">
          <div className="p-3 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-lg text-[#1A2F46] dark:text-slate-100">100%</div>
            <div className="text-[10px] text-slate-500 font-normal">Statutory Compliance</div>
          </div>
          <div className="p-3 bg-white dark:bg-[#131C2E] rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-lg text-[#E65909]">₹50L+</div>
            <div className="text-[10px] text-slate-500 font-normal">SEBI PMS Floor</div>
          </div>
        </div>
      </div>

      {/* Interactive Public Client Intake Form */}
      <div id="client-intake" className="bg-white dark:bg-[#131C2E] p-6 md:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-bold text-[#E65909] uppercase tracking-wider">
            Inbound Client Intake
          </span>
          <h3 className="text-xl font-bold font-display text-navy-950">
            Schedule a Confidential Consultation with PMSC Partners
          </h3>
          <p className="text-xs text-slate-500">
            Fill out the consultation intake form below. Your request will be directly routed to Biraju Bhai, Pinal Shah, or Nilesh Jain.
          </p>
        </div>

        {submitResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Inquiry Registered Successfully! Reference: {submitResult.inquiry_id}</span>
            </div>
            <p className="text-[11px] text-emerald-700">{submitResult.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Rajesh Singhania"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Company / Entity Name (Optional)
              </label>
              <input
                type="text"
                value={formData.entity_name}
                onChange={(e) => setFormData({ ...formData, entity_name: e.target.value })}
                placeholder="e.g. Singhania Logistics LLP"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Primary Advisory Need *
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-[#131C2E] font-medium"
              >
                <option value="PMS_WEALTH">Portfolio Management (₹50L+)</option>
                <option value="TAX_LITIGATION">Statutory Tax & Notice Defense</option>
                <option value="AR_COLLECTIONS">B2B Trade Receivables & DSO</option>
                <option value="VIRTUAL_CFO">Virtual CFO & Bank Audit</option>
                <option value="GENERAL_CONSULTING">General Corporate Advisory</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rajesh@singhania.com"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98250 XXXXX"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Case Brief / Inquiry Details
            </label>
            <textarea
              rows={3}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Outline the matter, pending notices, or corpus size..."
              className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-slate-400 font-mono">
              Confidentiality Guaranteed under Non-Disclosure Protocol
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#1A2F46] hover:bg-[#0D2035] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Registering Intake...' : 'Submit Inquiry to Advisory Desk'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#E65909]" />
            </button>
          </div>
        </form>
      </div>

      {/* Admin Leads Review Desk (Only visible to authenticated administrators/partners) */}
      {user?.role === 'admin' && (
        <div className="bg-white dark:bg-[#131C2E] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-[#E65909]/10 text-[#E65909]">
                <UserCheck className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold font-display text-navy-950 uppercase tracking-wider">
                  Partner Review Desk: Inbound Consultation Inquiries
                </h4>
                <p className="text-[11px] text-slate-500">
                  Live database of confidential consultation leads received from the PMSC public institutional portal.
                </p>
              </div>
            </div>
            <button
              onClick={fetchInquiries}
              disabled={loadingInquiries}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInquiries ? 'animate-spin text-[#E65909]' : ''}`} />
              <span>Refresh Inquiries</span>
            </button>
          </div>

          {inquiries.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-[#1A253A] rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No Inbound Consultation Leads Yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                New inquiries submitted via the form above will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#1A253A] text-slate-600 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Intake Code</th>
                    <th className="py-2.5 px-3">Client / Entity</th>
                    <th className="py-2.5 px-3">Advisory Need</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Details / Notes</th>
                    <th className="py-2.5 px-3">Logged IP</th>
                    <th className="py-2.5 px-3">Received At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {inquiries.map((inq) => (
                    <tr key={inq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-[#E65909]">
                        {inq.intake_code}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-navy-950">{inq.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{inq.entity_name}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {inq.service_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] space-y-0.5">
                        <div className="text-slate-800">{inq.email}</div>
                        <div className="text-slate-500">{inq.phone}</div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {inq.message || <span className="italic text-slate-400">No brief provided</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">
                        {inq.client_ip}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {inq.created_at}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
        <div>
          © 2026 PMSC (Vichar Vimarsh Group). All rights reserved.
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span>Ahmedabad • Mumbai • Delhi</span>
          <span>contact@smartfin.ai</span>
        </div>
      </footer>
    </div>
  );
};
