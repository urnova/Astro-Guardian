import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Lock, Eye, EyeOff, Radio } from 'lucide-react';

const PANEL_PASSWORD = import.meta.env.VITE_PANEL_PASSWORD || 'astral2025';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    setTimeout(() => {
      if (password === PANEL_PASSWORD) {
        sessionStorage.setItem('astral_auth', '1');
        onSuccess();
      } else {
        setError(true);
        setPassword('');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden scanlines">

      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#00F0FF 1px, transparent 1px), linear-gradient(90deg, #00F0FF 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md px-6"
      >
        {/* Card */}
        <div className="relative bg-card/80 backdrop-blur-xl border border-primary/30 p-10 cyber-clip">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <img
              src={`${import.meta.env.BASE_URL}images/astral-logo.png`}
              alt="Astral"
              className="h-12 object-contain mb-4"
            />
            <div className="flex items-center gap-2 text-primary/50 text-xs font-display tracking-[0.25em] uppercase">
              <Radio className="w-3 h-3 animate-pulse" />
              Panneau de contrôle sécurisé
            </div>
          </div>

          {/* Titre */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-foreground">Accès restreint</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Entrez le mot de passe pour accéder au panneau.</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(false); }}
                placeholder="Mot de passe"
                autoFocus
                className={`w-full bg-background border px-4 py-3.5 pr-12 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 cyber-clip transition-all duration-200 text-sm
                  ${error
                    ? 'border-destructive focus:border-destructive focus:ring-destructive/50'
                    : 'border-primary/30 focus:border-primary focus:ring-primary/50'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/30 px-4 py-2.5 cyber-clip"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Mot de passe incorrect. Accès refusé.
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!password || loading}
              className="group relative w-full inline-flex items-center justify-center px-6 py-3.5 font-display text-sm tracking-widest font-bold uppercase transition-all duration-300 cyber-clip overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed
                bg-primary/10 border border-primary text-primary hover:bg-primary hover:text-background hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-95"
            >
              <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Vérification…
                </span>
              ) : 'Accéder au panneau'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-[10px] font-display text-primary/30 tracking-widest uppercase">
            ASTRAL_OS_v2.0 · Connexion chiffrée
          </p>
        </div>
      </motion.div>
    </div>
  );
}
