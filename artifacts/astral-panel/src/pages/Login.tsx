import { motion } from 'framer-motion';
import { Radio, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess: _ }: LoginProps) {
  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden scanlines">

      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#00F0FF 1px, transparent 1px), linear-gradient(90deg, #00F0FF 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#5865F2]/5 rounded-full blur-[140px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md px-6"
      >
        <div className="relative bg-card/80 backdrop-blur-xl border border-primary/30 p-10 cyber-clip">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />

          <div className="flex flex-col items-center mb-10">
            <img
              src={`${import.meta.env.BASE_URL}images/astral-logo.png`}
              alt="Astral"
              className="h-14 object-contain mb-4 drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]"
            />
            <div className="flex items-center gap-2 text-primary/50 text-xs font-display tracking-[0.25em] uppercase">
              <Radio className="w-3 h-3 animate-pulse" />
              Panneau de commandement sécurisé
            </div>
          </div>

          <div className="text-center mb-10">
            <div className="font-display text-xs tracking-[0.3em] uppercase text-primary/40 mb-3">
              ⬡ ASTRAL_OS_v2.0 — AUTHENTIFICATION REQUISE
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-wide">Accès restreint</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Authentifiez-vous avec votre compte Discord.<br />
              Seuls les serveurs dont vous êtes administrateur seront accessibles.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/30 px-4 py-3 cyber-clip mb-6"
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Authentification échouée. Réessayez.
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDiscordLogin}
            className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 font-display text-sm tracking-widest font-bold uppercase transition-all duration-300 cyber-clip overflow-hidden
              bg-[#5865F2]/20 border border-[#5865F2]/60 text-[#7983f5] hover:bg-[#5865F2] hover:text-white hover:border-[#5865F2] hover:shadow-[0_0_30px_rgba(88,101,242,0.5)]"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.013.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Se connecter avec Discord
          </motion.button>

          <p className="mt-8 text-center text-[10px] font-display text-primary/25 tracking-widest uppercase">
            ASTRAL_OS_v2.0 · Liaison OAuth2 Discord chiffrée
          </p>
        </div>
      </motion.div>
    </div>
  );
}
