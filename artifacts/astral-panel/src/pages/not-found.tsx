import React from 'react';
import { Link } from 'wouter';
import { AlertCircle } from 'lucide-react';
import { CyberButton, CyberCard } from '@/components/CyberUI';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center scanlines relative p-4">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 z-[-1] opacity-20 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/cyberpunk-bg.png)` }}
      />
      
      <CyberCard className="max-w-md w-full text-center py-12 box-glow-destructive border-destructive/50" glowing>
        <div className="flex justify-center mb-6">
          <AlertCircle className="w-20 h-20 text-destructive animate-pulse" />
        </div>
        <h1 className="text-4xl font-display font-bold text-destructive mb-4 tracking-widest">404 ERROR</h1>
        <p className="text-muted-foreground font-body text-lg mb-8">
          The requested sector does not exist in the neural network or your access clearance is insufficient.
        </p>
        <Link href="/">
          <CyberButton variant="outline">
            Return to Core
          </CyberButton>
        </Link>
      </CyberCard>
    </div>
  );
}
