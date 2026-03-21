import React, { InputHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export const CyberCard = ({
  children,
  className = "",
  noClip = false,
  glowing = false,
  danger = false,
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  noClip?: boolean;
  glowing?: boolean;
  danger?: boolean;
  accent?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
    className={`
      relative bg-card/90 backdrop-blur-sm border p-6
      ${noClip ? '' : 'cyber-clip'}
      ${danger ? 'border-destructive/40 box-glow-destructive' : accent ? 'border-accent/40 box-glow-accent' : glowing ? 'border-primary/60 box-glow-strong' : 'border-primary/25 box-glow'}
      ${className}
    `}
  >
    <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${danger ? 'border-destructive' : accent ? 'border-accent' : 'border-primary'}`} />
    <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${danger ? 'border-destructive' : accent ? 'border-accent' : 'border-primary'}`} />
    <div className={`absolute top-0 right-0 w-1.5 h-1.5 border-t border-r opacity-40 ${danger ? 'border-destructive' : 'border-primary'}`} />
    <div className={`absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l opacity-40 ${danger ? 'border-destructive' : 'border-primary'}`} />
    {children}
  </motion.div>
);

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ children, className = "", variant = 'primary', isLoading = false, disabled, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-5 py-2.5 text-sm",
      lg: "px-8 py-3.5 text-base",
    };
    const baseClasses = `group relative inline-flex items-center justify-center ${sizeClasses[size]} font-display tracking-widest font-bold uppercase transition-all duration-200 cyber-clip-sm overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed`;

    const variants = {
      primary:     "bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] active:scale-[0.97]",
      secondary:   "bg-secondary/80 border border-primary/20 text-secondary-foreground hover:border-primary/50 hover:bg-secondary active:scale-[0.97]",
      destructive: "bg-destructive/10 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_25px_hsl(var(--destructive)/0.5)] active:scale-[0.97]",
      outline:     "bg-transparent border border-muted-foreground/25 text-muted-foreground hover:border-primary/50 hover:text-primary active:scale-[0.97]",
      ghost:       "bg-transparent border border-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 active:scale-[0.97]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variants[variant]} ${className}`}
        {...props}
      >
        <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.2s_ease-in-out] bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
        {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
        {children}
      </button>
    );
  }
);
CyberButton.displayName = 'CyberButton';

export const CyberInput = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full bg-background/80 border border-primary/25 px-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 cyber-clip transition-all duration-200 ${className}`}
      {...props}
    />
  )
);
CyberInput.displayName = 'CyberInput';

export const CyberSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`w-full bg-background/80 border border-primary/25 px-3 py-2.5 font-body text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 cyber-clip transition-all duration-200 appearance-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
CyberSelect.displayName = 'CyberSelect';

type BadgeVariant = 'primary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' | 'pink';

export const CyberBadge = ({
  children,
  variant = 'primary',
  className = "",
  dot = false,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}) => {
  const variants: Record<BadgeVariant, string> = {
    primary:     "bg-primary/15 text-primary border border-primary/40",
    destructive: "bg-destructive/15 text-destructive border border-destructive/40",
    outline:     "bg-transparent text-muted-foreground border border-muted-foreground/25",
    success:     "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40",
    warning:     "bg-amber-500/15 text-amber-400 border border-amber-500/40",
    info:        "bg-sky-500/15 text-sky-400 border border-sky-500/40",
    purple:      "bg-purple-500/15 text-purple-400 border border-purple-500/40",
    pink:        "bg-pink-500/15 text-pink-400 border border-pink-500/40",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-display tracking-wider uppercase cyber-clip-sm ${variants[variant]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </span>
  );
};

export const CyberStat = ({
  label,
  value,
  icon,
  sub,
  variant = 'primary',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  sub?: string;
  variant?: 'primary' | 'destructive' | 'success' | 'warning';
}) => {
  const colors = {
    primary:     "text-primary",
    destructive: "text-destructive",
    success:     "text-emerald-400",
    warning:     "text-amber-400",
  };
  return (
    <CyberCard className="flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-display text-muted-foreground uppercase tracking-[0.2em]">{label}</p>
        {icon && <span className={colors[variant]}>{icon}</span>}
      </div>
      <span className={`text-3xl font-display font-bold ${colors[variant]}`}>{value}</span>
      {sub && <p className="text-xs font-body text-muted-foreground/60">{sub}</p>}
    </CyberCard>
  );
};

export const CyberDivider = ({ label }: { label?: string }) => (
  <div className="flex items-center gap-3 my-2">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    {label && <span className="text-[10px] font-display text-muted-foreground/50 tracking-widest uppercase whitespace-nowrap">{label}</span>}
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
  </div>
);

export const CyberAlert = ({
  children,
  variant = 'warning',
}: {
  children: React.ReactNode;
  variant?: 'warning' | 'danger' | 'info';
}) => {
  const styles = {
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    danger:  "bg-destructive/10 border-destructive/30 text-destructive",
    info:    "bg-primary/10 border-primary/30 text-primary",
  };
  return (
    <div className={`border px-4 py-3 text-xs font-body cyber-clip-sm ${styles[variant]}`}>
      {children}
    </div>
  );
};

export { AnimatePresence, motion };
