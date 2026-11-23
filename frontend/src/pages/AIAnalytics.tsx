import React, { useState, useEffect } from 'react';
import {
  Cpu,
  TrendingUp,
  Clock,
  DollarSign,
  Zap,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';

export const AIAnalytics: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getAiUsageAnalytics();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-xs font-mono text-slate-400">
        Loading AI usage analytics & ROI study...
      </div>
    );
  }

  const { summary, module_breakdown, optimisation_recommendations } = data;

  return (
    <div className="space-y-6 w-full max-w-none">
      {/* Header */}
      <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px] font-mono font-bold uppercase tracking-wider">
              Operational Telemetry
            </span>
            <span className="text-xs font-mono text-slate-400">| Adoption & Efficiency Benchmark</span>
          </div>
          <h2 className="text-base font-bold text-navy-950 mt-1 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-brand-600" />
            <span>AI Usage Study, Token Cost & Team ROI Optimisation</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-module telemetry analyzing prompt volume, labor hours saved, cost-to-benefit ratios & high-ROI expansion vectors.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Labor Hours Saved</span>
          <p className="text-2xl font-bold text-brand-900 mt-1 font-mono">{summary.total_hours_saved} hrs</p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> ~{summary.total_hours_saved * 60} minutes recovered
          </span>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Economic Value ROI</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1 font-mono">₹{summary.estimated_value_inr.toLocaleString('en-IN')}</p>
          <span className="text-[10px] text-slate-500">Benchmark @ ₹850/hr billing</span>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Queries & Tokens</span>
          <p className="text-2xl font-bold text-navy-950 mt-1 font-mono">{summary.total_queries}</p>
          <span className="text-[10px] text-slate-500 font-mono">{(summary.total_tokens / 1000).toFixed(1)}k tokens used</span>
        </div>

        <div className="bg-white dark:bg-[#131C2E] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Compute Cost</span>
          <p className="text-2xl font-bold text-slate-800 mt-1 font-mono">${summary.total_cost_usd}</p>
          <span className="text-[10px] text-emerald-600 font-bold">~0.03% of value created</span>
        </div>
      </div>

      {/* Module Breakdown Grid */}
      <div className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-brand-600" />
            <span>Workflow-Level Adoption & Return On Investment (ROI)</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">Team Adoption: {summary.adoption_rate_pct}%</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 dark:bg-[#1A253A] border-b border-slate-200 dark:border-slate-800 text-slate-500 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Workflow Module</th>
                <th className="py-2.5 px-3 text-right">Prompts / Queries</th>
                <th className="py-2.5 px-3 text-right">Hours Saved</th>
                <th className="py-2.5 px-3 text-center">Efficiency Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {module_breakdown.map((m: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-[#1A253A]">
                  <td className="py-2.5 px-3 font-bold text-slate-800">{m.module}</td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{m.queries}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-brand-900">{m.hours_saved} hrs</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {m.roi}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimisation Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {optimisation_recommendations.map((rec: any, idx: number) => (
          <div key={idx} className="bg-white dark:bg-[#131C2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
            <div className="flex items-center space-x-1.5 text-brand-600">
              <Lightbulb className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy-950">{rec.category}</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {rec.recommendation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
