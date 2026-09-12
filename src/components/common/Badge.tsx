import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'amber',
  size = 'md',
  className = '',
  icon,
}) => {
  const variantStyles = {
    amber: 'bg-amber-100 text-amber-900 border-amber-300/80 shadow-xs',
    emerald: 'bg-emerald-100 text-emerald-900 border-emerald-300/80 shadow-xs',
    blue: 'bg-blue-100 text-blue-900 border-blue-300/80 shadow-xs',
    purple: 'bg-purple-100 text-purple-900 border-purple-300/80 shadow-xs',
    rose: 'bg-rose-100 text-rose-900 border-rose-300/80 shadow-xs',
    slate: 'bg-slate-100 text-slate-800 border-slate-300/80',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 rounded-full font-bold',
    md: 'text-sm px-3.5 py-1 rounded-full font-bold',
    lg: 'text-base px-4 py-1.5 rounded-full font-extrabold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${variantStyles} ${sizeStyles} ${className} whitespace-nowrap`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
