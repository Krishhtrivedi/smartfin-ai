import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'signal';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const variantStyles = {
    signal: 'bg-[#E65909]/10 text-[#C64200] border-[#E65909]/30 dark:bg-[#E65909]/20 dark:text-[#F96E31] dark:border-[#E65909]/40 font-semibold',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold',
    warning: 'bg-amber-50 text-[#C64200] border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 font-semibold',
    danger: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 font-semibold',
    info: 'bg-[#1A2F46]/10 text-[#1A2F46] border-[#1A2F46]/30 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30 font-semibold',
    neutral: 'bg-[#ECE9E3] text-[#4A545D] border-[#C5CBD2] dark:bg-[#1A253A] dark:text-slate-300 dark:border-slate-700',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  };

  return (
    <span
      className={`inline-flex items-center font-mono rounded-[2px] border ${variantStyles[variant]} ${sizeStyles[size]} uppercase tracking-wider`}
    >
      {children}
    </span>
  );
};
