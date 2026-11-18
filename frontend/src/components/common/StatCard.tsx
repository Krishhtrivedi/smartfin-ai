import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'blue' | 'navy' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'signal';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'navy',
}) => {
  const colorStyles: Record<string, string> = {
    signal: 'bg-[#E65909]/10 text-[#E65909] border-[#E65909]/30',
    blue: 'bg-[#1A2F46]/10 text-[#1A2F46] border-[#1A2F46]/20',
    navy: 'bg-[#ECE9E3] text-[#1A2F46] border-[#C5CBD2]',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-[#C64200] border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-[#1A2F46] text-[#E6ECF2] border-[#364452]',
  };

  return (
    <div className="bg-white rounded-[3px] border border-[#C5CBD2] p-5 shadow-xs hover:border-[#E65909] transition-all">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold text-[#5D646C] uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-[3px] border ${colorStyles[accentColor] || colorStyles.navy}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-2xl font-display font-extrabold text-[#1A2F46] tracking-tight">
          {typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value}
        </h3>
        
        <div className="flex items-center space-x-2 mt-1.5">
          {trend && (
            <span
              className={`inline-flex items-center text-xs font-mono font-semibold ${
                trend.isPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              )}
              {trend.value}
            </span>
          )}
          {subtitle && <p className="text-xs font-sans text-[#7C8793]">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};
