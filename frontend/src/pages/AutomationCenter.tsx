import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot, Laptop, MessageCircle, Mail, FileDown, Landmark, ClipboardList, Settings2, RefreshCw, Loader2,
  CheckCircle2, XCircle, AlertTriangle, Clock, Hand, Search, Send, Download, Ban, ChevronDown, ChevronUp,
  Folder, Users2, Info,
} from 'lucide-react';
import { api } from '../services/api';

// ------------------------------------------------------------------ shared bits
type Tab = 'overview' | 'gstr1' | 'income_tax' | 'reports' | 'setup';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const card = 'bg-white dark:bg-[#131C2E] rounded-[3px] border border-[#C5CBD2] dark:border-slate-800 shadow-xs';
const label = 'text-[10px] font-mono text-[#5D646C] dark:text-slate-400 uppercase tracking-wider';
const input = 'w-full min-w-0 px-3 py-2 text-xs bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] focus:outline-none focus:border-[#E65909]';
const btnNavy = 'bg-[#1A2F46] hover:bg-[#23374d] text-white px-3 py-1.5 text-xs font-semibold rounded-[3px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50';
const btnGhost = 'border border-[#C5CBD2] dark:border-slate-800 bg-white dark:bg-[#131C2E] hover:bg-[#ECE9E3] dark:bg-[#1A253A] text-[#1A2F46] dark:text-slate-100 px-3 py-1.5 text-xs font-semibold rounded-[3px] flex items-center justify-center gap-1.5 disabled:opacity-50';

const STATUS: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  QUEUED: { label: 'Queued', cls: 'bg-slate-100 text-slate-700', icon: Clock },
  RUNNING: { label: 'Running', cls: 'bg-blue-50 text-blue-700', icon: Loader2 },
  WAITING_FOR_HUMAN: { label: 'Needs you on the Mac', cls: 'bg-amber-100 text-amber-800', icon: Hand },
  SUCCESS: { label: 'Done & verified', cls: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  NEEDS_REVIEW: { label: 'Check before use', cls: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
  FAILED: { label: 'Failed', cls: 'bg-rose-100 text-rose-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500', icon: Ban },
};

const Pill: React.FC<{ status: string }> = ({ status }) => {
  const s = STATUS[status] || { label: status, cls: 'bg-slate-100 text-slate-700', icon: Info };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-bold whitespace-nowrap ${s.cls}`}>
      <Icon className={`w-3 h-3 ${status === 'RUNNING' ? 'animate-spin' : ''}`} /> {s.label}
    </span>
  );
};

const Notice: React.FC<{ kind: 'error' | 'ok' | 'warn'; children: React.ReactNode; onClose?: () => void }> = ({ kind, children, onClose }) => {
  const cls = kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : kind === 'ok' ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400' : 'border-amber-200 bg-amber-50 text-amber-900';
  const Icon = kind === 'error' ? XCircle : kind === 'ok' ? CheckCircle2 : AlertTriangle;
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-[3px] border p-3 text-xs ${cls}`}>
      <Icon className="w-4 h-4 shrink-0 mt-px" /><div className="flex-1 min-w-0 break-words">{children}</div>
      {onClose && <button onClick={onClose} className="font-semibold shrink-0">Dismiss</button>}
    </div>
  );
};

const when = (iso?: string | null) => (iso ? new Date(iso.endsWith('Z') ? iso : iso + 'Z').toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

// Client search box (Client Master)
const ClientPicker: React.FC<{ value: any | null; onChange: (c: any | null) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => {
  const [q, setQ] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try { setList(await api.searchAutomationClients(q)); } catch { setList([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);
  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 border border-[#C5CBD2] dark:border-slate-800 rounded-[2px] bg-[#F6F3EE] dark:bg-[#0B1120] min-w-0">
        <div className="min-w-0">
          <div className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 truncate">{value.trade_name || value.name}</div>
          <div className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400 truncate">{value.gstin || value.pan || 'No GSTIN / PAN'}</div>
        </div>
        <button onClick={() => onChange(null)} className="text-[11px] font-semibold text-[#C64200] shrink-0">Change</button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="w-3.5 h-3.5 text-[#8B97A3] absolute left-3 top-1/2 -translate-y-1/2" />
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={placeholder || 'Search client name, GSTIN or PAN'} className={`${input} pl-9`} />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-[#131C2E] border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] shadow-lg">
          {loading && <div className="p-2 text-[11px] text-[#5D646C] dark:text-slate-400">Searching…</div>}
          {!loading && list.length === 0 && <div className="p-2 text-[11px] text-[#5D646C] dark:text-slate-400">No matching client.</div>}
          {list.map(c => (
            <button key={c.id} onMouseDown={() => { onChange(c); setQ(''); setOpen(false); }} className="w-full text-left px-3 py-2 hover:bg-[#ECE9E3] dark:bg-[#1A253A] border-b border-[#ECE9E3] dark:border-slate-800 last:border-0">
              <div className="text-xs font-semibold text-[#171E25] dark:text-slate-200 truncate">{c.trade_name || c.name}</div>
              <div className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400 truncate">{[c.gstin, c.pan, c.phone].filter(Boolean).join(' · ') || '—'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ page
export const AutomationCenter: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [ovErr, setOvErr] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try { setOverview(await api.getAutomationOverview()); setOvErr(null); } catch (e) { setOvErr(errText(e)); }
  }, []);
  useEffect(() => { loadOverview(); const t = setInterval(loadOverview, 15000); return () => clearInterval(t); }, [loadOverview]);

  const agentOnline = !!overview?.agents?.some((a: any) => a.online);
  const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: Bot },
    { id: 'gstr1', label: 'GSTR-1 Download & Send', icon: FileDown },
    { id: 'income_tax', label: 'Income Tax Notices', icon: Landmark },
    { id: 'reports', label: 'TDS / GST Reports', icon: ClipboardList },
    { id: 'setup', label: 'Setup', icon: Settings2 },
  ];

  return (
    <div className="space-y-5 w-full max-w-none min-w-0">
      <div className="bg-[#0D2035] text-white p-4 rounded-[3px] border border-[#364452] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="spec-tag text-[#E65909] font-bold bg-[#E65909]/10 px-2 py-0.5 rounded-[2px] border border-[#E65909]/30 text-[10px] tracking-wider">AC / AUTOMATION CENTER</span>
            <span className="text-[10px] font-mono text-[#8B97A3] uppercase tracking-wider">GST · Income Tax · WhatsApp · Client folders</span>
          </div>
          <h2 className="text-base font-display font-bold text-white mt-1">Automation Center</h2>
          <p className="text-xs text-[#8B97A3] mt-0.5">Portal work runs on the office Mac; every result here is checked before it is marked done.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold flex items-center gap-1.5 border ${agentOnline ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-400/40 text-rose-300'}`}>
            <Laptop className="w-3.5 h-3.5" /> Mac agent {agentOnline ? 'online' : 'offline'}
          </span>
          <span className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold flex items-center gap-1.5 border ${overview?.whatsapp?.connected ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-400/40 text-rose-300'}`}>
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp {overview?.whatsapp?.connected ? 'connected' : 'not connected'}
          </span>
          <button onClick={loadOverview} className="bg-[#1A2F46] hover:bg-[#23374d] border border-[#364452] px-2.5 py-1 rounded-[3px] text-[11px] flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#C5CBD2] dark:border-slate-800 pb-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 sm:px-4 py-2 text-xs font-semibold rounded-[3px] flex items-center gap-2 whitespace-nowrap transition-all ${tab === t.id ? 'bg-[#1A2F46] text-white font-bold' : 'text-[#5D646C] hover:text-[#1A2F46] dark:text-slate-100 hover:bg-[#ECE9E3] dark:bg-[#1A253A]'}`}>
            <t.icon className="w-4 h-4 text-[#E65909]" /> {t.label}
          </button>
        ))}
      </div>

      {ovErr && <Notice kind="error">Could not load status: {ovErr}</Notice>}
      {overview && !overview.agent_configured && tab !== 'setup' && (
        <Notice kind="warn">The Mac agent can't connect yet: <b>AGENT_API_TOKEN</b> is not set on the server. See <button className="underline font-semibold" onClick={() => setTab('setup')}>Setup</button>.</Notice>
      )}

      {tab === 'overview' && <OverviewTab overview={overview} goTo={setTab} />}
      {tab === 'gstr1' && <Gstr1Tab agentOnline={agentOnline} whatsappOk={!!overview?.whatsapp?.connected} smtpOk={!!overview?.smtp_configured} onChange={loadOverview} />}
      {tab === 'income_tax' && <IncomeTaxTab agentOnline={agentOnline} onChange={loadOverview} />}
      {tab === 'reports' && <ReportsTab whatsappOk={!!overview?.whatsapp?.can_send} onChange={loadOverview} />}
      {tab === 'setup' && <SetupTab overview={overview} />}
    </div>
  );
};

// ------------------------------------------------------------------ overview
const OverviewTab: React.FC<{ overview: any; goTo: (t: Tab) => void }> = ({ overview, goTo }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => { api.getAutomationJobs().then(setJobs).catch(() => setJobs([])); }, [overview]);
  if (!overview) return <div className="flex items-center gap-2 text-xs text-[#5D646C] dark:text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading status…</div>;
  const agent = overview.agents?.[0];
  const attention = jobs.filter(j => ['WAITING_FOR_HUMAN', 'NEEDS_REVIEW', 'FAILED'].includes(j.status)).slice(0, 8);
  const tiles = [
    { k: 'Mac agent', v: overview.agents?.some((a: any) => a.online) ? 'Online' : 'Offline', s: agent ? `Last seen ${when(agent.last_seen_at)}` : 'Never connected', ok: overview.agents?.some((a: any) => a.online), tab: 'setup' as Tab },
    { k: 'WhatsApp', v: overview.whatsapp?.connected ? 'Connected' : 'Not connected', s: 'Office number', ok: overview.whatsapp?.connected, tab: 'setup' as Tab },
    { k: 'Email (SMTP)', v: overview.smtp_configured ? 'Configured' : 'Not configured', s: 'GSTR-1 PDF emails', ok: overview.smtp_configured, tab: 'setup' as Tab },
    { k: `Reports ${overview.reports?.period}`, v: `${overview.reports?.received} / ${overview.reports?.total_clients}`, s: 'Clients who sent a file', ok: true, tab: 'reports' as Tab },
    { k: 'IT items open', v: overview.it_items_open, s: `${overview.it_items_review} need a check`, ok: !overview.it_items_review, tab: 'income_tax' as Tab },
    { k: 'Jobs waiting on you', v: (overview.jobs?.WAITING_FOR_HUMAN || 0) + (overview.jobs?.NEEDS_REVIEW || 0), s: `${overview.jobs?.QUEUED || 0} queued · ${overview.jobs?.FAILED || 0} failed`, ok: !((overview.jobs?.WAITING_FOR_HUMAN || 0) + (overview.jobs?.NEEDS_REVIEW || 0)), tab: 'gstr1' as Tab },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
        {tiles.map(t => (
          <button key={t.k} onClick={() => goTo(t.tab)} className={`${card} p-3 text-left hover:border-[#E65909] min-w-0`}>
            <span className={`${label} block truncate`}>{t.k}</span>
            <p className={`text-base font-display font-bold mt-0.5 truncate ${t.ok ? 'text-[#1A2F46] dark:text-slate-100' : 'text-[#C64200]'}`}>{t.v}</p>
            <span className="text-[10px] text-[#8B97A3] block truncate">{t.s}</span>
          </button>
        ))}
      </div>
      <div className={`${card} p-4`}>
        <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100 mb-3">Needs attention</h3>
        {attention.length === 0 ? <p className="text-xs text-[#5D646C] dark:text-slate-400">Nothing waiting. Queue work from the GSTR-1 or Income Tax tabs.</p> : (
          <ul className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
            {attention.map(j => (
              <li key={j.id} className="py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                <Pill status={j.status} />
                <span className="text-xs font-semibold text-[#171E25] dark:text-slate-200 truncate">#{j.id} {j.job_type === 'GSTR1_DOWNLOAD' ? 'GSTR-1' : 'Income Tax'} · {j.client_name}</span>
                <span className="text-[11px] text-[#5D646C] dark:text-slate-400 sm:ml-auto break-words min-w-0">{j.status_message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ job list (shared)
const JobRow: React.FC<{ j: any; onChanged: () => void; whatsappOk?: boolean; smtpOk?: boolean }> = ({ j, onChanged, whatsappOk, smtpOk }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error' | 'warn'; text: React.ReactNode } | null>(null);
  const [email, setEmail] = useState(true);
  const [wa, setWa] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const p = j.params || {};
  const periodLabel = p.period ? `${MONTHS[Number(p.period.slice(0, 2)) - 1]} ${p.period.slice(2)}` : '';

  const act = async (fn: () => Promise<any>, ok: (r: any) => React.ReactNode) => {
    setBusy(true); setMsg(null);
    try { const r = await fn(); setMsg({ kind: r?.sent === 0 ? 'warn' : 'ok', text: ok(r) }); onChanged(); }
    catch (e) { setMsg({ kind: 'error', text: errText(e) }); }
    finally { setBusy(false); }
  };
  const download = async () => {
    try {
      const blob = await api.downloadAutomationJobFile(j.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `GSTR1_${j.gstin}_${p.period}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setMsg({ kind: 'error', text: errText(e) }); }
  };
  const canSend = j.job_type === 'GSTR1_DOWNLOAD' && j.has_file && (j.status === 'SUCCESS' || j.status === 'NEEDS_REVIEW');

  return (
    <li className="py-3 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[10px] font-mono text-[#8B97A3] shrink-0">#{j.id}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#1A2F46] dark:text-slate-100 truncate">{j.client_name}</span>
              <Pill status={j.status} />
            </div>
            <div className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400 truncate">{j.job_type === 'GSTR1_DOWNLOAD' ? `${j.gstin} · ${periodLabel} · FY ${p.financial_year}` : `PAN ${j.pan}`}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {j.has_file && <button onClick={download} className={btnGhost}><Download className="w-3.5 h-3.5" /> PDF</button>}
          {['QUEUED', 'RUNNING', 'WAITING_FOR_HUMAN'].includes(j.status) && (
            <button disabled={busy} onClick={() => act(() => api.cancelAutomationJob(j.id), () => 'Job cancelled.')} className={btnGhost}><Ban className="w-3.5 h-3.5" /> Cancel</button>
          )}
          <button onClick={() => setOpen(o => !o)} className={btnGhost} aria-expanded={open}>{open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Details</button>
        </div>
      </div>
      {j.status_message && <p className={`mt-1.5 text-[11px] break-words ${j.status === 'WAITING_FOR_HUMAN' ? 'text-amber-900 font-semibold' : j.status === 'FAILED' ? 'text-rose-700' : 'text-[#4A545D] dark:text-slate-300'}`}>{j.status_message}</p>}
      {msg && <div className="mt-2"><Notice kind={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Notice></div>}
      {open && (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-[#F6F3EE] dark:bg-[#0B1120] border border-[#ECE9E3] dark:border-slate-800 rounded-[3px] p-3 text-[11px] space-y-1 min-w-0">
            <div><span className="text-[#5D646C] dark:text-slate-400">Queued by</span> {j.created_by_email} · {when(j.created_at)}</div>
            <div><span className="text-[#5D646C] dark:text-slate-400">Agent</span> {j.agent_name || '—'} · last update {when(j.last_update_at)}</div>
            {j.desktop_path && <div className="break-all"><Folder className="w-3 h-3 inline" /> {j.desktop_path}</div>}
            {j.file_sha256 && <div className="font-mono break-all text-[10px] text-[#5D646C] dark:text-slate-400">SHA-256 {j.file_sha256}</div>}
            {j.checks?.length > 0 && (
              <ul className="pt-1 space-y-0.5">{j.checks.map((c: any, i: number) => (
                <li key={i} className="flex gap-1.5">
                  {c.result === 'PASS' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : c.result === 'FAIL' ? <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  <span>{c.check}{c.detail ? ` — ${c.detail}` : ''}</span>
                </li>))}
              </ul>
            )}
            {j.dispatch?.length > 0 && (
              <ul className="pt-1 space-y-0.5">{j.dispatch.map((d: any, i: number) => (
                <li key={i} className="break-words">{d.channel === 'email' ? <Mail className="w-3 h-3 inline" /> : <MessageCircle className="w-3 h-3 inline" />} {d.status}{d.to ? ` → ${d.to}` : ''}{d.message_id ? ` (ID ${d.message_id})` : ''}{d.error ? ` — ${d.error}` : ''} · {when(d.at)}</li>))}
              </ul>
            )}
          </div>
          {canSend && (
            <div className="border border-[#C5CBD2] dark:border-slate-800 rounded-[3px] p-3 space-y-2">
              <div className="text-xs font-bold text-[#1A2F46] dark:text-slate-100">Send to client</div>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} className="accent-[#E65909]" /> Email {smtpOk ? '' : <span className="text-[#C64200]">(SMTP not configured)</span>}</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={wa} onChange={e => setWa(e.target.checked)} className="accent-[#E65909]" /> WhatsApp {whatsappOk ? '' : <span className="text-[#C64200]">(not connected)</span>}</label>
              {j.status === 'NEEDS_REVIEW' && (
                <label className="flex items-start gap-2 text-xs text-amber-900"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="accent-[#E65909] mt-0.5" /> I opened the PDF and it is the right client and period.</label>
              )}
              <button disabled={busy || (!email && !wa) || (j.status === 'NEEDS_REVIEW' && !confirmed)}
                onClick={() => act(() => api.sendAutomationJob(j.id, { email, whatsapp: wa, confirm_reviewed: confirmed }),
                  r => <>{r.sent} of {r.requested} sent. {r.results.map((x: any) => `${x.channel}: ${x.status}${x.error ? ` (${x.error})` : ''}`).join(' · ')}</>)}
                className="btn-signal px-3 py-1.5 text-xs font-semibold rounded-[3px] flex items-center gap-1.5 disabled:opacity-50">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send now
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

const useJobs = (jobType: string) => {
  const [jobs, setJobs] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setJobs(await api.getAutomationJobs(jobType)); setErr(null); } catch (e) { setErr(errText(e)); }
  }, [jobType]);
  const active = useMemo(() => (jobs || []).some(j => ['QUEUED', 'RUNNING', 'WAITING_FOR_HUMAN'].includes(j.status)), [jobs]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!active) return; const t = setInterval(load, 5000); return () => clearInterval(t); }, [active, load]);
  return { jobs, err, load };
};

// ------------------------------------------------------------------ GSTR-1
const Gstr1Tab: React.FC<{ agentOnline: boolean; whatsappOk: boolean; smtpOk: boolean; onChange: () => void }> = ({ agentOnline, whatsappOk, smtpOk, onChange }) => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const fyStart = prev.getMonth() >= 3 ? prev.getFullYear() : prev.getFullYear() - 1;
  const [clientSel, setClientSel] = useState<any | null>(null);
  const [month, setMonth] = useState(prev.getMonth() + 1);
  const [year, setYear] = useState(prev.getFullYear());
  const [autoSend, setAutoSend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const { jobs, err, load } = useJobs('GSTR1_DOWNLOAD');
  const fy = (() => { const s = month >= 4 ? year : year - 1; return `${s}-${String((s + 1) % 100).padStart(2, '0')}`; })();
  const years = [fyStart + 1, fyStart, fyStart - 1, fyStart - 2];

  const queue = async () => {
    if (!clientSel) return;
    setBusy(true); setMsg(null);
    try {
      const j = await api.createAutomationJob({ job_type: 'GSTR1_DOWNLOAD', customer_id: clientSel.id, financial_year: fy, period: `${String(month).padStart(2, '0')}${year}`, auto_send: autoSend });
      setMsg({ kind: 'ok', text: `Job #${j.id} queued. ${agentOnline ? 'The Mac agent will open the GST portal shortly.' : 'The Mac agent is offline, so it will start when the agent is running.'}` });
      setClientSel(null); load(); onChange();
    } catch (e) { setMsg({ kind: 'error', text: errText(e) }); } finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 min-w-0">
      <div className={`${card} p-4 space-y-3 h-fit`}>
        <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100">Download GSTR-1</h3>
        <div><span className={label}>Client</span><div className="mt-1"><ClientPicker value={clientSel} onChange={setClientSel} /></div></div>
        {clientSel && !clientSel.gstin && <Notice kind="error">This client has no GSTIN in the Client Master.</Notice>}
        {clientSel && clientSel.gstin && !clientSel.has_gst_login && <Notice kind="warn">No GST username saved; staff will type it on the Mac.</Notice>}
        <div className="grid grid-cols-2 gap-2">
          <div><span className={label}>Month</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className={`${input} mt-1`}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
          <div><span className={label}>Year</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${input} mt-1`}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
        </div>
        <p className="text-[11px] text-[#5D646C] dark:text-slate-400">Financial year <b>{fy}</b> · saved to <span className="font-mono">Desktop/{clientSel?.folder_name || '<client folder>'}/GST/{fy}/</span></p>
        <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={autoSend} onChange={e => setAutoSend(e.target.checked)} className="accent-[#E65909] mt-0.5" />
          <span>Email + WhatsApp it to the client automatically <b>only if every check passes</b>.</span></label>
        <button onClick={queue} disabled={!clientSel || !clientSel.gstin || busy} className="btn-signal w-full px-3 py-2 text-xs font-semibold rounded-[3px] flex items-center justify-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Queue download
        </button>
        {msg && <Notice kind={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Notice>}
        <p className="text-[11px] text-[#5D646C] dark:text-slate-400 border-t border-[#ECE9E3] dark:border-slate-800 pt-2">Staff type the GST CAPTCHA/OTP on the office Mac when it asks. The PDF is then checked for the right GSTIN, month and year before it can be marked done.</p>
      </div>
      <div className={`${card} p-4 xl:col-span-2 min-w-0`}>
        <div className="flex items-center justify-between mb-1"><h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100">GSTR-1 jobs</h3>
          <button onClick={load} className={btnGhost}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button></div>
        {err && <Notice kind="error">{err}</Notice>}
        {!jobs && !err && <div className="text-xs text-[#5D646C] dark:text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
        {jobs && jobs.length === 0 && <p className="text-xs text-[#5D646C] dark:text-slate-400 py-6 text-center">No GSTR-1 jobs yet.</p>}
        <ul className="divide-y divide-[#ECE9E3] dark:divide-slate-800">{jobs?.map(j => <JobRow key={j.id} j={j} onChanged={() => { load(); onChange(); }} whatsappOk={whatsappOk} smtpOk={smtpOk} />)}</ul>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ Income Tax
const IncomeTaxTab: React.FC<{ agentOnline: boolean; onChange: () => void }> = ({ agentOnline, onChange }) => {
  const [clientSel, setClientSel] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [show, setShow] = useState<'open' | 'review' | 'all'>('open');
  const [items, setItems] = useState<any[] | null>(null);
  const [itemsErr, setItemsErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { jobs, err, load } = useJobs('IT_NOTICES_FETCH');
  const prevDone = useRef<number>(0);

  const loadItems = useCallback(async () => {
    try { setItems(await api.getPortalNotices(show)); setItemsErr(null); } catch (e) { setItemsErr(errText(e)); }
  }, [show]);
  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { // refresh the table when a fetch finishes
    const done = (jobs || []).filter(j => ['SUCCESS', 'NEEDS_REVIEW'].includes(j.status)).length;
    if (done !== prevDone.current) { prevDone.current = done; loadItems(); }
  }, [jobs, loadItems]);

  const queue = async () => {
    if (!clientSel) return;
    setBusy(true); setMsg(null);
    try {
      const j = await api.createAutomationJob({ job_type: 'IT_NOTICES_FETCH', customer_id: clientSel.id });
      setMsg({ kind: 'ok', text: `Job #${j.id} queued. ${agentOnline ? 'Watch the office Mac for the login window.' : 'It will start when the Mac agent is running.'}` });
      setClientSel(null); load(); onChange();
    } catch (e) { setMsg({ kind: 'error', text: errText(e) }); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`${card} p-4 space-y-3 h-fit`}>
          <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100">Fetch notices from the portal</h3>
          <ClientPicker value={clientSel} onChange={setClientSel} />
          {clientSel && !clientSel.pan && <Notice kind="error">This client has no PAN in the Client Master.</Notice>}
          {clientSel && clientSel.pan && !clientSel.has_it_password && <Notice kind="warn">No Income Tax password saved; staff will type it on the Mac.</Notice>}
          <button onClick={queue} disabled={!clientSel || !clientSel.pan || busy} className="btn-signal w-full px-3 py-2 text-xs font-semibold rounded-[3px] flex items-center justify-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Landmark className="w-3.5 h-3.5" />} Queue fetch
          </button>
          {msg && <Notice kind={msg.kind} onClose={() => setMsg(null)}>{msg.text}</Notice>}
          <p className="text-[11px] text-[#5D646C] dark:text-slate-400 border-t border-[#ECE9E3] dark:border-slate-800 pt-2">Reads Pending Actions → e-Proceedings exactly as shown. Anything the portal doesn't show stays blank and is flagged for a check.</p>
        </div>
        <div className={`${card} p-4 xl:col-span-2 min-w-0`}>
          <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100 mb-1">Fetch jobs</h3>
          {err && <Notice kind="error">{err}</Notice>}
          {jobs && jobs.length === 0 && <p className="text-xs text-[#5D646C] dark:text-slate-400 py-4 text-center">No fetches yet.</p>}
          <ul className="divide-y divide-[#ECE9E3] dark:divide-slate-800 max-h-72 overflow-y-auto">{jobs?.slice(0, 20).map(j => <JobRow key={j.id} j={j} onChanged={() => { load(); onChange(); }} />)}</ul>
        </div>
      </div>

      <div className={`${card} p-4 min-w-0`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100">Notices & demands from the portal</h3>
          <div className="flex gap-1.5">
            {(['open', 'review', 'all'] as const).map(k => (
              <button key={k} onClick={() => setShow(k)} className={`px-2.5 py-1 rounded-[3px] text-[11px] font-semibold border ${show === k ? 'bg-[#1A2F46] text-white border-[#1A2F46]' : 'border-[#C5CBD2] dark:border-slate-800 text-[#1A2F46] dark:text-slate-100'}`}>
                {k === 'open' ? 'On portal now' : k === 'review' ? 'Needs a check' : 'All'}
              </button>))}
          </div>
        </div>
        {itemsErr && <Notice kind="error">{itemsErr}</Notice>}
        {items && items.length === 0 && <p className="text-xs text-[#5D646C] dark:text-slate-400 py-6 text-center">Nothing here yet. Fetched items appear after a job finishes.</p>}
        <ul className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
          {items?.map(n => (
            <li key={n.id} className="py-2.5 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-3 items-start text-xs">
                <div className="md:col-span-3 min-w-0"><div className="font-bold text-[#1A2F46] dark:text-slate-100 truncate">{n.client_name}</div><div className="text-[10px] font-mono text-[#5D646C] dark:text-slate-400">{n.pan} · {n.kind === 'DEMAND' ? 'Demand' : 'Notice'}</div></div>
                <div className="md:col-span-3 min-w-0"><div className="font-mono text-[11px] break-all">{n.portal_ref || <span className="text-[#C64200]">No DIN shown</span>}</div><div className="text-[10px] text-[#5D646C] dark:text-slate-400">{[n.section && `Sec ${n.section}`, n.assessment_year && `AY ${n.assessment_year}`].filter(Boolean).join(' · ') || '—'}</div></div>
                <div className="md:col-span-2">{n.due_date ? <><div className="font-semibold">{new Date(n.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div className={`text-[10px] ${n.days_left < 0 ? 'text-rose-700 font-bold' : n.days_left <= 7 ? 'text-amber-700 font-bold' : 'text-[#5D646C] dark:text-slate-400'}`}>{n.days_left < 0 ? `${-n.days_left} days overdue` : `${n.days_left} days left`}</div></> : <span className="text-[#C64200]">Due date not shown</span>}</div>
                <div className="md:col-span-2">{n.response_status === 'RESPONDED' ? <span className="text-emerald-700 font-semibold">Responded</span> : n.response_status === 'PENDING' ? <span className="text-amber-800 font-semibold">Response pending</span> : <span className="text-[#5D646C] dark:text-slate-400">Status not shown</span>}{n.amount != null && <div className="text-[10px]">₹{n.amount.toLocaleString('en-IN')}</div>}</div>
                <div className="md:col-span-2 flex md:justify-end gap-1.5 flex-wrap">
                  {n.needs_review && <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold bg-amber-100 text-amber-800">Check</span>}
                  {!n.seen_on_last_fetch && <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold bg-slate-100 text-slate-600 dark:text-slate-400">No longer on portal</span>}
                  <button onClick={() => setExpanded(expanded === n.id ? null : n.id)} className="text-[11px] font-semibold text-[#C64200]">{expanded === n.id ? 'Hide' : 'As read'}</button>
                </div>
              </div>
              {expanded === n.id && (
                <div className="mt-2 bg-[#F6F3EE] dark:bg-[#0B1120] border border-[#ECE9E3] dark:border-slate-800 rounded-[3px] p-2 text-[11px] space-y-1 min-w-0">
                  {n.review_reasons?.length > 0 && <ul className="list-disc ml-4 text-amber-900">{n.review_reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>}
                  <div className="font-mono break-words text-[#4A545D] dark:text-slate-300">{(n.raw_cells || []).join(' | ')}</div>
                  <div className="text-[#8B97A3]">Last seen on portal {when(n.last_seen_at)}</div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ TDS / GST reports
const ReportsTab: React.FC<{ whatsappOk: boolean; onChange: () => void }> = ({ whatsappOk, onChange }) => {
  const [data, setData] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [onlyWithPhone, setOnlyWithPhone] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [view, setView] = useState<'pending' | 'received' | 'unmatched'>('pending');
  const [assignFor, setAssignFor] = useState<number | null>(null);
  const [assignClient, setAssignClient] = useState<any | null>(null);
  const [savePhone, setSavePhone] = useState(true);

  const load = useCallback(async () => {
    try { setData(await api.getClientReportsTracker()); setErr(null); } catch (e) { setErr(errText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const pending = useMemo(() => (data?.pending || []).filter((p: any) => (!onlyWithPhone || p.has_valid_phone) && (!search || p.client_name.toLowerCase().includes(search.toLowerCase()))), [data, onlyWithPhone, search]);
  const withPhone = (data?.pending || []).filter((p: any) => p.has_valid_phone).length;
  const toggle = (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const send = async (ids: number[]) => {
    setBusy(true); setResult(null);
    try { const r = await api.sendClientReportReminders({ client_ids: ids }); setResult(r); setSelected(new Set()); load(); onChange(); }
    catch (e) { setResult({ error: errText(e) }); } finally { setBusy(false); }
  };
  const assign = async (subId: number) => {
    if (!assignClient) return;
    try { await api.assignUnmatchedReport(subId, assignClient.id, savePhone); setAssignFor(null); setAssignClient(null); load(); onChange(); }
    catch (e) { setResult({ error: errText(e) }); }
  };

  if (err) return <Notice kind="error">{err}</Notice>;
  if (!data) return <div className="text-xs text-[#5D646C] dark:text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  return (
    <div className="space-y-4 min-w-0">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className={`${card} p-3`}><span className={label}>Period</span><p className="text-base font-display font-bold text-[#1A2F46] dark:text-slate-100">{data.period}</p></div>
        <div className={`${card} p-3`}><span className={`${label} text-emerald-700`}>Received</span><p className="text-base font-display font-bold text-emerald-700">{data.received_count}</p></div>
        <div className={`${card} p-3`}><span className={`${label} text-[#C64200]`}>Pending</span><p className="text-base font-display font-bold text-[#C64200]">{data.pending_count}</p><span className="text-[10px] text-[#8B97A3]">{withPhone} have a WhatsApp number</span></div>
        <div className={`${card} p-3`}><span className={label}>Unknown numbers</span><p className="text-base font-display font-bold text-[#1A2F46] dark:text-slate-100">{data.unmatched?.length || 0}</p><span className="text-[10px] text-[#8B97A3]">Files to assign</span></div>
      </div>
      {!whatsappOk && <Notice kind="warn">WhatsApp is not connected, so reminders can't be sent. Connect it in Compliance Hub → WhatsApp.</Notice>}
      {result?.error && <Notice kind="error" onClose={() => setResult(null)}>{result.error}</Notice>}
      {result && !result.error && (
        <Notice kind={result.sent_count ? 'ok' : 'warn'} onClose={() => setResult(null)}>
          Sent {result.sent_count}. Skipped {result.ignored_already_received_count} who already sent a file.
          {result.details?.filter((d: any) => d.status !== 'SENT').length > 0 && <> Not sent: {result.details.filter((d: any) => d.status !== 'SENT').map((d: any) => `${d.client} (${d.status === 'SKIPPED_NO_PHONE' ? 'no valid number' : d.error || d.status})`).join(', ')}.</>}
        </Notice>
      )}

      <div className="flex gap-2 border-b border-[#C5CBD2] dark:border-slate-800 pb-1 overflow-x-auto">
        {([['pending', `Not received (${data.pending_count})`], ['received', `Received (${data.received_count})`], ['unmatched', `Unknown numbers (${data.unmatched?.length || 0})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 text-xs font-semibold rounded-[3px] whitespace-nowrap ${view === k ? 'bg-[#1A2F46] text-white' : 'text-[#5D646C] dark:text-slate-400 hover:bg-[#ECE9E3] dark:bg-[#1A253A]'}`}>{l}</button>))}
      </div>

      {view === 'pending' && (
        <div className={`${card} p-4 min-w-0`}>
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
            <div className="relative flex-1"><Search className="w-3.5 h-3.5 text-[#8B97A3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by client name" className={`${input} pl-9`} /></div>
            <label className="flex items-center gap-2 text-xs whitespace-nowrap"><input type="checkbox" checked={onlyWithPhone} onChange={e => setOnlyWithPhone(e.target.checked)} className="accent-[#E65909]" /> Only with a WhatsApp number</label>
            <div className="flex gap-2">
              <button disabled={!whatsappOk || busy || selected.size === 0} onClick={() => send([...selected])} className={btnNavy}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Remind selected ({selected.size})</button>
              <button disabled={!whatsappOk || busy || withPhone === 0} onClick={() => { if (window.confirm(`Send the WhatsApp reminder to all ${withPhone} pending clients with a number?`)) send((data.pending || []).filter((p: any) => p.has_valid_phone).map((p: any) => p.customer_id)); }} className="btn-signal px-3 py-1.5 text-xs font-semibold rounded-[3px] disabled:opacity-50 whitespace-nowrap">Remind all pending</button>
            </div>
          </div>
          <ul className="divide-y divide-[#ECE9E3] dark:divide-slate-800 max-h-[480px] overflow-y-auto">
            {pending.slice(0, 300).map((p: any) => (
              <li key={p.customer_id} className="py-2 flex items-center gap-3 min-w-0 text-xs">
                <input type="checkbox" disabled={!p.has_valid_phone} checked={selected.has(p.customer_id)} onChange={() => toggle(p.customer_id)} className="accent-[#E65909] shrink-0" aria-label={`Select ${p.client_name}`} />
                <div className="min-w-0 flex-1"><div className="font-semibold text-[#171E25] dark:text-slate-200 truncate">{p.client_name}</div><div className="text-[10px] text-[#5D646C] dark:text-slate-400 truncate">{p.phone || 'No phone'}{p.has_valid_phone ? '' : p.phone ? ' (not a valid mobile)' : ''}</div></div>
                <span className="text-[10px] text-[#5D646C] dark:text-slate-400 text-right shrink-0">{p.reminder_sent ? `Reminded ${p.last_reminder_at}` : 'Not reminded'}</span>
              </li>))}
          </ul>
          {pending.length > 300 && <p className="text-[11px] text-[#5D646C] dark:text-slate-400 mt-2">Showing 300 of {pending.length}. Use the filter to narrow down.</p>}
        </div>
      )}

      {view === 'received' && (
        <div className={`${card} p-4 min-w-0`}>
          {data.received.length === 0 && <p className="text-xs text-[#5D646C] dark:text-slate-400 text-center py-6">No files received this period yet.</p>}
          <ul className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
            {data.received.map((r: any) => (
              <li key={r.customer_id} className="py-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs min-w-0">
                <span className="font-semibold text-[#171E25] dark:text-slate-200 truncate sm:w-1/3">{r.client_name}</span>
                <span className="truncate text-[#4A545D] dark:text-slate-300 flex-1">{r.file_name} · {r.received_at}</span>
                <span className={`text-[10px] font-semibold shrink-0 ${r.saved_to_desktop ? 'text-emerald-700' : 'text-amber-700'}`}>{r.saved_to_desktop ? 'Saved to Mac Desktop' : 'Waiting for Mac agent to save'}</span>
              </li>))}
          </ul>
        </div>
      )}

      {view === 'unmatched' && (
        <div className={`${card} p-4 min-w-0`}>
          <p className="text-[11px] text-[#5D646C] dark:text-slate-400 mb-2">Files from numbers not in the Client Master. They are not counted as received until you assign them.</p>
          {(data.unmatched || []).length === 0 && <p className="text-xs text-[#5D646C] dark:text-slate-400 text-center py-6">None.</p>}
          <ul className="divide-y divide-[#ECE9E3] dark:divide-slate-800">
            {(data.unmatched || []).map((u: any) => (
              <li key={u.submission_id} className="py-2 text-xs min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="font-mono">{u.phone || 'Unknown'}</span><span className="text-[#5D646C] dark:text-slate-400 truncate flex-1">{u.sender_name} · {u.file_name} · {u.received_at}</span>
                  <button onClick={() => setAssignFor(assignFor === u.submission_id ? null : u.submission_id)} className="text-[11px] font-semibold text-[#C64200] text-left">Assign to client</button>
                </div>
                {assignFor === u.submission_id && (
                  <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="flex-1"><ClientPicker value={assignClient} onChange={setAssignClient} /></div>
                    <label className="flex items-center gap-1.5 text-[11px] whitespace-nowrap"><input type="checkbox" checked={savePhone} onChange={e => setSavePhone(e.target.checked)} className="accent-[#E65909]" /> Save this number if the client has none</label>
                    <button disabled={!assignClient} onClick={() => assign(u.submission_id)} className={btnNavy}>Assign</button>
                  </div>
                )}
              </li>))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ setup
const SetupTab: React.FC<{ overview: any }> = ({ overview }) => {
  const agentOnline = !!overview?.agents?.some((a: any) => a.online);
  const steps = [
    { ok: !!overview?.agent_configured, title: 'Agent token on Render', body: 'Render → your service → Environment → add AGENT_API_TOKEN (a long random value) and BRIDGE_WEBHOOK_SECRET. Save and redeploy.' },
    { ok: agentOnline, title: 'Mac agent running', body: 'On the office Mac: cd desktop_agent, copy agent.env.example to agent.env, paste the same AGENT_API_TOKEN, then run python3 smartfin_agent.py. Keep the Mac awake.' },
    { ok: !!overview?.whatsapp?.connected, title: 'WhatsApp connected', body: 'Compliance Hub → WhatsApp → scan the QR code with the office phone.' },
    { ok: !!overview?.smtp_configured, title: 'Email (SMTP) configured', body: 'Render → Environment → SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL.' },
  ];
  return (
    <div className={`${card} p-4 space-y-3`}>
      <h3 className="text-sm font-display font-bold text-[#1A2F46] dark:text-slate-100 flex items-center gap-2"><Users2 className="w-4 h-4 text-[#E65909]" /> Setup checklist</h3>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 items-start border border-[#ECE9E3] dark:border-slate-800 rounded-[3px] p-3">
            {s.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            <div className="min-w-0"><div className="text-xs font-bold text-[#1A2F46] dark:text-slate-100">{i + 1}. {s.title} <span className={`ml-1 text-[10px] ${s.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{s.ok ? 'Done' : 'Not done'}</span></div>
              <p className="text-[11px] text-[#4A545D] dark:text-slate-300 mt-0.5 break-words">{s.body}</p></div>
          </li>))}
      </ol>
      <p className="text-[11px] text-[#5D646C] dark:text-slate-400">Ticks come from live checks, not from saved settings.</p>
    </div>
  );
};
