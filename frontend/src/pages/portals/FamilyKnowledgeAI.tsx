import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  FileCheck2,
  Lock,
  HeartHandshake,
  AlertTriangle,
  Send,
  HelpCircle,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  FolderLock
} from 'lucide-react';
import { api } from '../../services/api';

export const FamilyKnowledgeAI: React.FC = () => {
  // Checklist State
  const [dematChecked, setDematChecked] = useState(true);
  const [insuranceChecked, setInsuranceChecked] = useState(true);
  const [lockerChecked, setLockerChecked] = useState(false);
  const [caChecked, setCaChecked] = useState(true);
  const [willsChecked, setWillsChecked] = useState(false);

  // Fraud Scanner State
  const [suspiciousMessage, setSuspiciousMessage] = useState('');
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const sampleScams = [
    'URGENT: Your electricity power will be disconnected tonight at 9:30 PM due to unpaid bill. Immediately call 9876543210 or install update.apk',
    'Dear Customer, your bank KYC has expired. Your account will be blocked. Click https://sbi-kyc-verify.xyz to update your PAN and enter UPI PIN.',
    'Income Tax Department: Refund of INR 24,500 has been approved. Enter your card details and OTP to credit instantly to your wallet.'
  ];

  const handleEvaluate = async (messageToTest?: string) => {
    setEvaluating(true);
    try {
      const res = await api.evaluateFamilyAI({
        has_demat_details: dematChecked,
        has_insurance_nominee_updated: insuranceChecked,
        has_locker_access_shared: lockerChecked,
        has_ca_contact_documented: caChecked,
        has_digital_will_or_wishes: willsChecked,
        test_message_for_fraud: messageToTest !== undefined ? messageToTest : suspiciousMessage
      });
      setEvalResult(res);
    } catch (err: any) {
      alert(`Evaluation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1A2F46] p-6 rounded-xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider border border-emerald-500/30">
              Family Digital Shield & Estate Preparedness
            </span>
            <span className="text-xs font-mono text-slate-300">| Module: WMFSK AI</span>
          </div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-emerald-400" />
            <span>What My Family Should Know AI (WMFSK)</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Empowers families with emergency digital preparedness, asset inventory roadmaps, and instant AI protection against phishing, UPI fraud, and fake statutory notices.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-white/10 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400">Security Architecture</div>
            <div className="font-bold">Zero-Knowledge Sandbox</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Family Emergency Preparedness Inventory */}
        <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                <span>Family Estate & Emergency Inventory</span>
              </h3>
              <p className="text-xs text-slate-500">
                Ensure your nominees and family know where critical assets and contacts are stored.
              </p>
            </div>
            <button
              onClick={() => handleEvaluate()}
              disabled={evaluating}
              className="px-3.5 py-1.5 bg-[#1A2F46] hover:bg-[#0D2035] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {evaluating ? 'Evaluating...' : 'Recalculate Score'}
            </button>
          </div>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={dematChecked}
                onChange={(e) => setDematChecked(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-slate-900 block">Demat & Mutual Fund Folios Documented</strong>
                <span className="text-slate-500">Brokers (Zerodha, Groww, ICICI Direct), depository participant IDs, and nominee registrations.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={insuranceChecked}
                onChange={(e) => setInsuranceChecked(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-slate-900 block">Life & Health Insurance Nominee Verification</strong>
                <span className="text-slate-500">Term insurance policy numbers, health TPA cards, and emergency claim filing hotline contacts.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={lockerChecked}
                onChange={(e) => setLockerChecked(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-slate-900 block">Physical Bank Locker & Property Deeds Guide</strong>
                <span className="text-slate-500">Bank branch name, locker number, key location, and survivor operation mandate.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={caChecked}
                onChange={(e) => setCaChecked(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-slate-900 block">Trusted Chartered Accountant & Legal Contacts</strong>
                <span className="text-slate-500">Direct phone and email of family tax advisor (e.g. Biraju Bhai / Pinal Shah) for estate tax guidance.</span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={willsChecked}
                onChange={(e) => setWillsChecked(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <strong className="text-slate-900 block">Digital Estate Wishes & Account Handover</strong>
                <span className="text-slate-500">Clear instructions on email/cloud accounts and legacy contacts.</span>
              </div>
            </label>
          </div>

          {evalResult && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-slate-700">Family Readiness Score:</span>
                <span className={`text-sm font-bold ${
                  evalResult.readiness_score >= 80 ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {evalResult.readiness_score}% ({evalResult.grade})
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${evalResult.readiness_score >= 80 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                  style={{ width: `${evalResult.readiness_score}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Fraud & Phishing Message Scanner */}
        <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Digital Safety & Fraud Awareness Scanner</span>
            </h3>
            <p className="text-xs text-slate-500">
              Paste suspicious SMS, WhatsApp messages, or fake tax notice texts to verify fraud probability.
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={4}
              value={suspiciousMessage}
              onChange={(e) => setSuspiciousMessage(e.target.value)}
              placeholder="Paste suspicious WhatsApp forward, APK download link, or urgent bank alert here..."
              className="w-full p-3 border border-slate-200 rounded-lg text-xs leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                Scans for UPI PIN traps, fake utility bills & lottery phishing
              </span>
              <button
                onClick={() => handleEvaluate()}
                disabled={evaluating || !suspiciousMessage.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scan for Fraud</span>
              </button>
            </div>
          </div>

          {/* Quick Test Samples */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-700 block">
              Test Common Indian Cyber Frauds:
            </span>
            <div className="space-y-1.5">
              {sampleScams.map((scam, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSuspiciousMessage(scam);
                    handleEvaluate(scam);
                  }}
                  className="w-full text-left p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700 line-clamp-1 transition-colors"
                >
                  ⚠️ {scam}
                </button>
              ))}
            </div>
          </div>

          {/* Scan Result Verdict */}
          {evalResult?.fraud_scanner_result && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              evalResult.fraud_scanner_result.verdict === 'HIGH_RISK_SUSPICIOUS'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {evalResult.fraud_scanner_result.verdict === 'HIGH_RISK_SUSPICIOUS' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  )}
                  <span>VERDICT: {evalResult.fraud_scanner_result.verdict}</span>
                </span>
                <span className="font-mono text-[11px]">Risk Score: {evalResult.fraud_scanner_result.risk_score}%</span>
              </div>
              <p className="text-[11px] leading-relaxed">{evalResult.fraud_scanner_result.warning}</p>
              <div className="p-2.5 bg-white/80 rounded border border-current/20 text-[11px] font-mono">
                <strong>Recommended Action:</strong> {evalResult.fraud_scanner_result.recommendation}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
