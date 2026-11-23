import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemSettingsData } from '../types';
import {
  Settings, Mail, MessageSquare, Key, Folder, Shield, CheckCircle2,
  AlertTriangle, RefreshCw, Save, Send, HardDrive, Lock, Server
} from 'lucide-react';

export const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');

  const [waPhoneId, setWaPhoneId] = useState('');
  const [waTeamPmscGroupId, setWaTeamPmscGroupId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waBridgeUrl, setWaBridgeUrl] = useState('');

  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [aiKey, setAiKey] = useState('');

  const [desktopRoot, setDesktopRoot] = useState('~/Desktop');

  // Test states
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpDiagnostic, setSmtpDiagnostic] = useState<any | null>(null);

  const [testingWa, setTestingWa] = useState(false);
  const [waDiagnostic, setWaDiagnostic] = useState<any | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemSettings();
      setSettings(data);
      if (data.smtp) {
        setSmtpHost(data.smtp.host || 'smtp.gmail.com');
        setSmtpPort(data.smtp.port || '587');
        setSmtpUser(data.smtp.user || '');
        setSmtpFromName(data.smtp.from_name || 'Vichar Vimarsh Compliance');
      }
      if (data.whatsapp) {
        setWaPhoneId(data.whatsapp.phone_number_id || '');
        setWaTeamPmscGroupId(data.whatsapp.team_pmsc_group_id || '');
        setWaBridgeUrl(data.whatsapp.bridge_url || 'http://127.0.0.1:8001');
      }
      if (data.ai) {
        setAiProvider(data.ai.provider || 'gemini');
        setAiModel(data.ai.model_name || 'gemini-1.5-flash');
      }
      if (data.storage) {
        setDesktopRoot(data.storage.desktop_root || '~/Desktop');
      }
    } catch (err: any) {
      console.error('Failed to load system settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        SMTP_HOST: smtpHost,
        SMTP_PORT: smtpPort,
        SMTP_USER: smtpUser,
        SMTP_FROM_NAME: smtpFromName,
        WHATSAPP_PHONE_NUMBER_ID: waPhoneId,
        WHATSAPP_TEAM_PMSC_GROUP_ID: waTeamPmscGroupId,
        WHATSAPP_BRIDGE_URL: waBridgeUrl,
        AI_PROVIDER: aiProvider,
        GEMINI_MODEL: aiModel,
        STORAGE_DESKTOP_PATH: desktopRoot
      };

      if (smtpPassword.trim()) payload.SMTP_PASSWORD = smtpPassword.trim();
      if (waToken.trim()) payload.WHATSAPP_ACCESS_TOKEN = waToken.trim();
      if (aiKey.trim()) payload.GEMINI_API_KEY = aiKey.trim();

      await api.updateSystemSettings(payload);
      alert('System settings saved successfully.');
      setSmtpPassword('');
      setWaToken('');
      setAiKey('');
      await loadSettings();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpDiagnostic(null);
    try {
      const res = await api.testSmtpConnection();
      setSmtpDiagnostic(res);
    } catch (err: any) {
      setSmtpDiagnostic({ status: 'ERROR', message: err.message, is_ready: false });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleTestWhatsapp = async () => {
    setTestingWa(true);
    setWaDiagnostic(null);
    try {
      const res = await api.testWhatsappConnection();
      setWaDiagnostic(res);
    } catch (err: any) {
      setWaDiagnostic({ status: 'ERROR', message: err.message, is_ready: false });
    } finally {
      setTestingWa(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#ECE9E3]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#E65909] font-bold">
              Administration & Infrastructure
            </span>
            <span className="text-[#8B97A3]">/</span>
            <span className="text-xs text-[#5D646C]">Connections, Security & Storage Paths</span>
          </div>
          <h1 className="text-2xl font-serif text-[#1A2F46] font-bold mt-1">
            System Settings & Diagnostics
          </h1>
          <p className="text-xs text-[#5D646C] mt-0.5">
            Configure live SMTP dispatch, local WhatsApp bridge socket, desktop folders, and verified AI keys.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadSettings()}
            className="px-3 py-2 border border-[#C5CBD2] text-[#1A2F46] text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: SMTP Email Gateway */}
        <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#ECE9E3]">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-[#E65909]" />
              <h2 className="text-sm font-bold text-[#1A2F46] uppercase font-mono tracking-wider">
                1. SMTP Official Email Gateway
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {settings?.smtp?.has_password ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> CREDENTIALS SAVED
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  PASSWORD REQUIRED
                </span>
              )}
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className="px-3 py-1 border border-[#C5CBD2] text-[#1A2F46] text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] flex items-center space-x-1 disabled:opacity-50"
              >
                <Server className="w-3 h-3 text-[#E65909]" />
                <span>{testingSmtp ? 'Testing...' : 'Test Handshake'}</span>
              </button>
            </div>
          </div>

          {smtpDiagnostic && (
            <div className={`p-3 rounded-[2px] text-xs font-mono border ${
              smtpDiagnostic.is_ready ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="font-bold flex items-center gap-1">
                {smtpDiagnostic.is_ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>Status: {smtpDiagnostic.status}</span>
              </div>
              <p className="mt-0.5">{smtpDiagnostic.message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">SMTP Host</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Port</label>
              <input
                type="text"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">From Sender Name</label>
              <input
                type="text"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder="Vichar Vimarsh Compliance"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Username / Email Address</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="compliance@vicharvimarsh.com"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">
                Password / App Password {settings?.smtp?.has_password ? '(••••••••)' : ''}
              </label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="Leave blank to preserve existing"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: WhatsApp Automation Bridge */}
        <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#ECE9E3]">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-[#1A2F46] uppercase font-mono tracking-wider">
                2. WhatsApp Gateway & Team PMSC Target
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleTestWhatsapp}
                disabled={testingWa}
                className="px-3 py-1 border border-[#C5CBD2] text-[#1A2F46] text-xs font-semibold rounded-[2px] hover:bg-[#F6F3EE] flex items-center space-x-1 disabled:opacity-50"
              >
                <Server className="w-3 h-3 text-emerald-700" />
                <span>{testingWa ? 'Probing...' : 'Probe Local Port 8001'}</span>
              </button>
            </div>
          </div>

          {waDiagnostic && (
            <div className={`p-3 rounded-[2px] text-xs font-mono border ${
              waDiagnostic.is_ready ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              <div className="font-bold flex items-center gap-1">
                {waDiagnostic.is_ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                <span>Socket Status: {waDiagnostic.status}</span>
              </div>
              <p className="mt-0.5">{waDiagnostic.message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Local Baileys Bridge URL</label>
              <input
                type="text"
                value={waBridgeUrl}
                onChange={(e) => setWaBridgeUrl(e.target.value)}
                placeholder="http://127.0.0.1:8001"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Team PMSC Target Group ID / Phone</label>
              <input
                type="text"
                value={waTeamPmscGroupId}
                onChange={(e) => setWaTeamPmscGroupId(e.target.value)}
                placeholder="e.g. 12036304@g.us or admin phone"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Desktop Local Storage & Fuzzy Folder Routing */}
        <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#ECE9E3]">
            <HardDrive className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold text-[#1A2F46] uppercase font-mono tracking-wider">
              3. Local Desktop Folder Hierarchy & Collision Safety
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Mac Desktop Root Directory</label>
              <input
                type="text"
                value={desktopRoot}
                onChange={(e) => setDesktopRoot(e.target.value)}
                placeholder="~/Desktop"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
              <span className="text-[10px] text-[#8B97A3]">
                Downloads route to: <code>~/Desktop/&lt;ClientName&gt;/GST/</code> or <code>IncomeTax/</code>
              </span>
            </div>

            <div className="p-3 bg-[#F6F3EE] rounded-[2px] border border-[#C5CBD2] text-xs">
              <div className="font-bold text-[#1A2F46] flex items-center gap-1 font-mono uppercase text-[10px]">
                <Shield className="w-3.5 h-3.5 text-emerald-700" />
                FolderResolver Collision Protection Active
              </div>
              <p className="text-[#5D646C] text-[11px] mt-1">
                Existing staff files are never overwritten. When duplicates occur, files are saved as <code>(2).pdf</code>, <code>(3).pdf</code>. Unmatched downloads route safely to <code>~/Desktop/Needs_Review_Staging/</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: AI & LLM Engine Settings */}
        <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#ECE9E3]">
            <Key className="w-4 h-4 text-purple-700" />
            <h2 className="text-sm font-bold text-[#1A2F46] uppercase font-mono tracking-wider">
              4. AI Assistant & LLM Engine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs focus:outline-none focus:border-[#E65909]"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI GPT-4o</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">Model Name</label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="gemini-1.5-flash"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1A2F46] mb-1">
                API Key {settings?.ai?.has_api_key ? `(${settings.ai.api_key_masked})` : ''}
              </label>
              <input
                type="password"
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                placeholder="Leave blank to preserve existing"
                className="w-full px-3 py-2 border border-[#C5CBD2] rounded-[2px] text-xs font-mono focus:outline-none focus:border-[#E65909]"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Security & Audit Trail */}
        <div className="p-4 bg-white border border-[#C5CBD2] rounded-[3px] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#ECE9E3]">
            <Lock className="w-4 h-4 text-emerald-800" />
            <h2 className="text-sm font-bold text-[#1A2F46] uppercase font-mono tracking-wider">
              5. Encryption & Audit Trail Security
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#F6F3EE] rounded-[2px] border border-[#C5CBD2]">
              <div className="text-[10px] font-mono text-[#8B97A3] uppercase">Credential Encryption</div>
              <div className="font-bold text-[#1A2F46] mt-0.5">Fernet AES-128 Symmetric</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">● Database At-Rest Active</div>
            </div>
            <div className="p-3 bg-[#F6F3EE] rounded-[2px] border border-[#C5CBD2]">
              <div className="text-[10px] font-mono text-[#8B97A3] uppercase">Audit Trail Ledger</div>
              <div className="font-bold text-[#1A2F46] mt-0.5">Append-Only / Immutable</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">● Zero-Deletion Enforced</div>
            </div>
            <div className="p-3 bg-[#F6F3EE] rounded-[2px] border border-[#C5CBD2]">
              <div className="text-[10px] font-mono text-[#8B97A3] uppercase">Session Invalidation</div>
              <div className="font-bold text-[#1A2F46] mt-0.5">120 Minutes Auto-Timeout</div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">● JWT Token Expiry Active</div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#E65909] text-white text-xs font-semibold rounded-[2px] hover:bg-[#cf4f07] flex items-center space-x-1.5 shadow-md disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving System Configuration...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
