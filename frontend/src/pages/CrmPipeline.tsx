import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Lead, LeadStage, PipelineSummary } from '../types';
import {
  Users, TrendingUp, DollarSign, Plus, Search, Calendar, Phone, Mail,
  ArrowRight, CheckCircle2, Clock, MessageSquare, AlertCircle, RefreshCw,
  Building, UserCheck, ShieldCheck
} from 'lucide-react';
import { Modal } from '../components/common/Modal';

const STAGES: { key: LeadStage; label: string; color: string; border: string; bg: string }[] = [
  { key: 'NEW', label: 'New Inquiry', color: 'text-sky-700', border: 'border-sky-300', bg: 'bg-sky-50' },
  { key: 'CONTACTED', label: 'Contacted', color: 'text-blue-700', border: 'border-blue-300', bg: 'bg-blue-50' },
  { key: 'MEETING_SCHEDULED', label: 'Meeting Set', color: 'text-indigo-700', border: 'border-indigo-300', bg: 'bg-indigo-50' },
  { key: 'PROPOSAL_SENT', label: 'Proposal Sent', color: 'text-amber-700', border: 'border-amber-300', bg: 'bg-amber-50' },
  { key: 'NEGOTIATION', label: 'Negotiation', color: 'text-purple-700', border: 'border-purple-300', bg: 'bg-purple-50' },
  { key: 'CONVERTED', label: 'Converted Client', color: 'text-emerald-700', border: 'border-emerald-300', bg: 'bg-emerald-50' },
  { key: 'LOST', label: 'Closed / Lost', color: 'text-slate-600 dark:text-slate-400', border: 'border-slate-300', bg: 'bg-slate-100' },
];

export const CrmPipeline: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadActivities, setLeadActivities] = useState<any[]>([]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Lead Form
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceInterest, setServiceInterest] = useState('GST Automation & Virtual CFO');
  const [expectedValue, setExpectedValue] = useState('50000');
  const [source, setSource] = useState('REFERRAL');
  const [notes, setNotes] = useState('');

  // New Activity Form
  const [actType, setActType] = useState<'CALL' | 'EMAIL' | 'WHATSAPP' | 'MEETING' | 'PROPOSAL' | 'NOTE'>('CALL');
  const [actTitle, setActTitle] = useState('');
  const [actDescription, setActDescription] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, summaryData] = await Promise.all([
        api.getLeads({ q: searchQuery || undefined }),
        api.getPipelineSummary()
      ]);
      const list = Array.isArray(leadsData) ? leadsData : ((leadsData as any)?.leads || []);
      setLeads(list);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Error fetching CRM pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const handleSelectLead = async (lead: Lead) => {
    setSelectedLead(lead);
    try {
      const res = await api.getLead(lead.id);
      setLeadActivities(res.activities || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createLead({
        company_name: companyName,
        contact_person: contactPerson || undefined,
        email: email || undefined,
        phone: phone || undefined,
        service_interest: serviceInterest,
        expected_value: parseFloat(expectedValue) || 0,
        source,
        notes: notes || undefined,
        stage: 'NEW'
      });
      setCreateModalOpen(false);
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setNotes('');
      await loadData();
    } catch (err: any) {
      alert(`Failed to create lead: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStage = async (leadId: number, nextStage: LeadStage) => {
    try {
      await api.updateLead(leadId, { stage: nextStage });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: nextStage } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, stage: nextStage } : null);
      }
      const summaryData = await api.getPipelineSummary();
      setSummary(summaryData);
    } catch (err: any) {
      alert(`Failed to update stage: ${err.message}`);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setSubmitting(true);
    try {
      await api.addLeadActivity(selectedLead.id, {
        activity_type: actType,
        title: actTitle,
        description: actDescription || undefined
      });
      setActivityModalOpen(false);
      setActTitle('');
      setActDescription('');
      const res = await api.getLead(selectedLead.id);
      setLeadActivities(res.activities || []);
    } catch (err: any) {
      alert(`Failed to record activity: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertLead = async (leadId: number) => {
    if (!window.confirm('Convert this lead into a Client Master record? This will create an active Customer entry in the database.')) return;
    try {
      const res = await api.convertLead(leadId);
      alert(`Lead successfully converted! Customer ID: ${res.customer_id}`);
      await loadData();
      if (selectedLead && selectedLead.id === leadId) {
        const updated = await api.getLead(leadId);
        setSelectedLead(updated.lead);
      }
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ECE9E3] dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#E65909] font-bold">
              CRM & Advisory Desk
            </span>
            <span className="text-[#8B97A3]">/</span>
            <span className="text-xs text-[#5D646C] dark:text-slate-400">Lead Pipeline & Conversion</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A2F46] dark:text-slate-100 font-bold mt-1">
            Executive Client Pipeline
          </h1>
          <p className="text-xs text-[#5D646C] dark:text-slate-400 mt-0.5">
            Manage prospective client inquiries, advisory proposals, meetings, and 1-click conversion to Client Master.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadData()}
            className="px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 text-[#1A2F46] dark:text-slate-100 text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120] flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[#8B97A3]">Total Inquiries</div>
          <div className="text-xl font-bold font-serif text-[#1A2F46] dark:text-slate-100 mt-1">{summary?.total_leads ?? leads.length}</div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">Active prospects in CRM</div>
        </div>
        <div className="p-3 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[#8B97A3]">Active Pipeline</div>
          <div className="text-xl font-bold font-serif text-blue-700 mt-1">{summary?.active_leads ?? 0}</div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">Under evaluation & discussion</div>
        </div>
        <div className="p-3 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[#8B97A3]">Converted Clients</div>
          <div className="text-xl font-bold font-serif text-emerald-700 mt-1">{summary?.converted_leads ?? 0}</div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">Onboarded to Client Master</div>
        </div>
        <div className="p-3 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm">
          <div className="text-[10px] font-mono uppercase text-[#8B97A3]">Conversion Rate</div>
          <div className="text-xl font-bold font-serif text-purple-700 mt-1">{summary?.conversion_rate_pct ?? 0}%</div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">Lead to customer velocity</div>
        </div>
        <div className="p-3 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm col-span-2 md:col-span-1">
          <div className="text-[10px] font-mono uppercase text-[#8B97A3]">Pipeline Value</div>
          <div className="text-xl font-bold font-serif text-[#E65909] mt-1">₹{(summary?.total_pipeline_value ?? 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5">Estimated advisory fees</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-[#8B97A3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, contact person, phone..."
            className="w-full pl-9 pr-3 py-1.5 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
          />
        </div>
        <div className="text-xs text-[#5D646C] dark:text-slate-400 flex items-center space-x-2">
          <span>Click on any lead card to view full timeline & convert to client</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex overflow-x-auto gap-3.5 pb-4 snap-x min-w-full">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter(l => l.stage === stage.key);
          const stageTotal = stageLeads.reduce((acc, curr) => acc + (curr.expected_value || 0), 0);

          return (
            <div key={stage.key} className="flex flex-col bg-[#F6F3EE] dark:bg-[#0B1120] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 min-w-[280px] sm:min-w-[310px] flex-shrink-0 snap-start">
              {/* Column Header */}
              <div className={`p-2.5 border-b ${stage.border} ${stage.bg} rounded-t-[3px] flex items-center justify-between`}>
                <div>
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>
                    {stage.label}
                  </h3>
                  <div className="text-[10px] text-[#5D646C] dark:text-slate-400 mt-0.5 font-mono">
                    {stageLeads.length} leads · ₹{stageTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Cards List */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[620px]">
                {stageLeads.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[#8B97A3] border border-dashed border-[#C5CBD2] dark:border-slate-800 rounded-[2px]">
                    No leads
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={`p-3 bg-white dark:bg-[#131C2E] border rounded-[2px] cursor-pointer hover:shadow-md transition-all ${
                        selectedLead?.id === lead.id ? 'border-[#E65909] ring-1 ring-[#E65909]' : 'border-[#C5CBD2] dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 line-clamp-1">{lead.company_name}</h4>
                        {lead.expected_value > 0 && (
                          <span className="text-[10px] font-mono font-bold text-[#E65909]">
                            ₹{(lead.expected_value / 1000).toFixed(0)}k
                          </span>
                        )}
                      </div>

                      {lead.contact_person && (
                        <div className="text-[11px] text-[#5D646C] dark:text-slate-400 mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#8B97A3]" />
                          <span>{lead.contact_person}</span>
                        </div>
                      )}

                      {lead.phone && (
                        <div className="text-[10px] font-mono text-[#8B97A3] mt-0.5 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{lead.phone}</span>
                        </div>
                      )}

                      <div className="mt-2 pt-2 border-t border-[#ECE9E3] dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="px-1.5 py-0.5 bg-[#F6F3EE] dark:bg-[#0B1120] rounded text-[#5D646C] dark:text-slate-400 uppercase font-mono">
                          {lead.source}
                        </span>
                        {lead.stage !== 'CONVERTED' && lead.stage !== 'LOST' && (
                          <select
                            value={lead.stage}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleUpdateStage(lead.id, e.target.value as LeadStage);
                            }}
                            className="text-[10px] bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded px-1 py-0.5 text-[#1A2F46] dark:text-slate-100"
                          >
                            {STAGES.map(s => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Lead Drawer / Detail Panel */}
      {selectedLead && (
        <div className="p-4 bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#ECE9E3] dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase">
                  {selectedLead.stage}
                </span>
                <span className="text-xs text-[#8B97A3]">Lead #{selectedLead.id}</span>
              </div>
              <h2 className="text-lg font-bold font-serif text-[#1A2F46] dark:text-slate-100 mt-1">
                {selectedLead.company_name}
              </h2>
              <div className="text-xs text-[#5D646C] dark:text-slate-400 flex items-center space-x-4 mt-0.5">
                <span>Contact: <strong>{selectedLead.contact_person || 'N/A'}</strong></span>
                {selectedLead.phone && <span>Phone: <strong>{selectedLead.phone}</strong></span>}
                {selectedLead.email && <span>Email: <strong>{selectedLead.email}</strong></span>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActivityModalOpen(true)}
                className="px-3 py-1.5 border border-[#C5CBD2] dark:border-slate-800 text-[#1A2F46] dark:text-slate-100 text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120] flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5 text-[#E65909]" />
                <span>Log Activity</span>
              </button>

              {selectedLead.stage !== 'CONVERTED' ? (
                <button
                  onClick={() => handleConvertLead(selectedLead.id)}
                  className="px-4 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded-[2px] hover:bg-emerald-800 flex items-center space-x-1 shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Convert to Client Master</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-[2px] flex items-center space-x-1 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Converted (Customer #{selectedLead.customer_id})</span>
                </span>
              )}
            </div>
          </div>

          {/* Activities Timeline */}
          <div>
            <h3 className="text-xs font-bold font-mono uppercase text-[#1A2F46] dark:text-slate-100 tracking-wider mb-2">
              Communication & Activity History
            </h3>
            {leadActivities.length === 0 ? (
              <div className="text-xs text-[#8B97A3] py-4 text-center border border-dashed border-[#C5CBD2] dark:border-slate-800 rounded-[2px]">
                No logged activities yet. Click "Log Activity" to record a call, meeting, proposal, or note.
              </div>
            ) : (
              <div className="space-y-2">
                {leadActivities.map((act) => (
                  <div key={act.id} className="p-2.5 bg-[#F6F3EE] dark:bg-[#0B1120] rounded-[2px] border border-[#C5CBD2] dark:border-slate-800 text-xs flex items-start space-x-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 text-[#1A2F46] dark:text-slate-100">
                      {act.activity_type}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-[#1A2F46] dark:text-slate-100">{act.title}</div>
                      {act.description && <div className="text-[#5D646C] dark:text-slate-400 text-[11px] mt-0.5">{act.description}</div>}
                    </div>
                    <div className="text-[10px] text-[#8B97A3] font-mono">
                      {new Date(act.created_at).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Prospective Lead"
        subtitle="Capture new inquiry for business scan, tax advisory, or GST automation"
      >
        <form onSubmit={handleCreateLead} className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Company / Entity Legal Name *</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Apex Industrial Solutions LLP"
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Key Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Rajesh Shah (Director)"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Phone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@apex.com"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Estimated Annual Advisory (₹)</label>
              <input
                type="number"
                value={expectedValue}
                onChange={(e) => setExpectedValue(e.target.value)}
                placeholder="50000"
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Primary Interest</label>
              <select
                value={serviceInterest}
                onChange={(e) => setServiceInterest(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="GST Automation & Virtual CFO">GST Automation & Virtual CFO</option>
                <option value="Statutory Audit & Tax Compliance">Statutory Audit & Tax Compliance</option>
                <option value="Vichar Vimarsh Business Diagnostic">Vichar Vimarsh Business Diagnostic</option>
                <option value="TDS Reconciliation & Advisory">TDS Reconciliation & Advisory</option>
                <option value="Corporate Restructuring">Corporate Restructuring</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Inquiry Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="REFERRAL">Client Referral</option>
                <option value="WEBSITE">Vichar Vimarsh Website</option>
                <option value="LINKEDIN">LinkedIn / Professional Network</option>
                <option value="COLD_OUTREACH">Advisory Outreach</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Initial Discovery Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Client requirement, turnover scale, current compliance pain points..."
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Creating Lead...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Activity Modal */}
      <Modal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        title="Log Communication Activity"
        subtitle={`Record client touchpoint for ${selectedLead?.company_name}`}
      >
        <form onSubmit={handleAddActivity} className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Activity Type</label>
            <select
              value={actType}
              onChange={(e) => setActType(e.target.value as any)}
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            >
              <option value="CALL">Phone Call</option>
              <option value="EMAIL">Email Dispatch</option>
              <option value="WHATSAPP">WhatsApp Message</option>
              <option value="MEETING">In-Person / Zoom Meeting</option>
              <option value="PROPOSAL">Advisory Proposal Sent</option>
              <option value="NOTE">Internal Note</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Subject / Summary *</label>
            <input
              type="text"
              required
              value={actTitle}
              onChange={(e) => setActTitle(e.target.value)}
              placeholder="e.g. Discovery call on GST compliance issues"
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A2F46] dark:text-slate-100 mb-1">Detailed Discussion / Action Items</label>
            <textarea
              rows={3}
              value={actDescription}
              onChange={(e) => setActDescription(e.target.value)}
              placeholder="Notes on what was discussed, client objections, next steps..."
              className="w-full px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-[#ECE9E3] dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActivityModalOpen(false)}
              className="px-4 py-2 border border-[#C5CBD2] dark:border-slate-800 text-xs font-semibold rounded-[2px] text-[#5D646C] dark:text-slate-400 hover:bg-[#F6F3EE] dark:hover:bg-[#1A253A] dark:bg-[#0B1120]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Activity'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
