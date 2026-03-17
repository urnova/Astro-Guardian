import React, { InputHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export const CyberCard = ({ children, className = "", noClip = false, glowing = false }: { children: React.ReactNode, className?: string, noClip?: boolean, glowing?: boolean }) => (
  <div className={`relative bg-card/80 backdrop-blur-sm border border-primary/30 p-6 ${noClip ? '' : 'cyber-clip'} ${glowing ? 'box-glow' : ''} ${className}`}>
    {/* Decorative corner pieces */}
    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary"></div>
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary"></div>
    {children}
  </div>
);

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline';
  isLoading?: boolean;
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(
  ({ children, className = "", variant = 'primary', isLoading = false, disabled, ...props }, ref) => {
    
    const baseClasses = "group relative inline-flex items-center justify-center px-6 py-3 font-display text-sm tracking-widest font-bold uppercase transition-all duration-300 cyber-clip overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      primary: "bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_hsl(var(--primary))] active:scale-95",
      secondary: "bg-secondary border border-secondary-foreground/20 text-secondary-foreground hover:border-primary/50 hover:bg-secondary/80",
      destructive: "bg-destructive/10 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_20px_hsl(var(--destructive))] active:scale-95",
      outline: "bg-transparent border border-muted-foreground/30 text-foreground hover:border-primary/50 hover:text-primary"
    };

    return (
      <button 
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variants[variant]} ${className}`} 
        {...props}
      >
        {/* Animated background scan line */}
        <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
      className={`w-full bg-background border border-primary/30 px-4 py-3 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 cyber-clip transition-all duration-200 ${className}`}
      {...props}
    />
  )
);
CyberInput.displayName = 'CyberInput';

export const CyberSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select
      ref={ref}
      className={`w-full bg-background border border-primary/30 px-4 py-3 font-body text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 cyber-clip transition-all duration-200 appearance-none cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
CyberSelect.displayName = 'CyberSelect';

export const CyberBadge = ({ children, variant = 'primary', className = "" }: { children: React.ReactNode, variant?: 'primary' | 'destructive' | 'outline', className?: string }) => {
  const variants = {
    primary: "bg-primary/20 text-primary border border-primary/50",
    destructive: "bg-destructive/20 text-destructive border border-destructive/50",
    outline: "bg-transparent text-muted-foreground border border-muted-foreground/30"
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-display tracking-wider uppercase cyber-clip ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
