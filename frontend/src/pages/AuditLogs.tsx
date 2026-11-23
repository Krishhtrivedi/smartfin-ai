import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, User, Filter, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 w-full max-w-none">
      <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span>Immutable Security & Financial Audit Logs</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full compliance trail of all logins, uploads, reconciliations, approvals and exports.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center space-x-1.5 border border-slate-200 dark:border-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#131C2E] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#1A253A]/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator Email</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Entity Ref</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-600" />
                    Fetching audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]">
                    <td className="py-2.5 px-4 text-slate-500">{log.created_at}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">{log.user_email}</td>
                    <td className="py-2.5 px-4">
                      <span className="bg-navy-50 text-navy-800 px-2 py-0.5 rounded font-bold border border-navy-100">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">{log.entity_type || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.entity_id || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-400">{log.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
