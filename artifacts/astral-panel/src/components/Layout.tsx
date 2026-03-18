import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, TerminalSquare, Radio, ChevronRight, LogOut, User, Menu, X } from 'lucide-react';
import { useGetBotStatus, useGetBotGuilds } from '@workspace/api-client-react';
import { useAuth } from '@/App';

function getAvatarUrl(user: { id: string; avatar: string | null }) {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { data: status } = useGetBotStatus({ query: { refetchInterval: 10000 } });
  const { data: guilds } = useGetBotGuilds();
  const { user, logout } = useAuth();

  const avatarUrl = user ? getAvatarUrl(user) : null;
  const displayName = user?.global_name || user?.username || '';

  return (
    <div className="w-72 flex-shrink-0 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5 border-b border-primary/20 flex flex-col items-center gap-2 relative">
        {onClose && (
          <button onClick={onClose} className="absolute right-4 top-4 p-1.5 text-muted-foreground hover:text-primary transition-colors md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
        <img
          src={`${import.meta.env.BASE_URL}images/astral-logo.png`}
          alt="Astral Logo"
          className="h-12 object-contain drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]"
        />
        <p className="text-[10px] font-display text-primary/40 tracking-[0.25em] uppercase mt-1">Panneau de commandement</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="px-4 space-y-1">
          <p className="text-[10px] font-display text-primary/40 mb-3 px-2 uppercase tracking-[0.2em]">Navigation</p>

          <Link
            href="/"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded transition-all duration-200 ${location === '/' ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="font-body text-sm font-medium">Tableau de bord</span>
          </Link>

          <p className="text-[10px] font-display text-primary/40 mt-6 mb-3 px-2 uppercase tracking-[0.2em]">Mes serveurs actifs</p>

          {guilds?.map((guild) => (
            <Link
              key={guild.id}
              href={`/guilds/${guild.id}`}
              onClick={onClose}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded transition-all duration-200 group ${location.startsWith(`/guilds/${guild.id}`) ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
            >
              <div className="flex items-center gap-3 truncate">
                {guild.icon ? (
                  <img src={guild.icon} alt={guild.name} className="w-7 h-7 rounded-full border border-primary/30 shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-[11px] font-bold shrink-0">
                    {guild.name.charAt(0)}
                  </div>
                )}
                <span className="font-body text-sm truncate">{guild.name}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
            </Link>
          ))}

          {guilds?.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground italic">
              Aucun serveur commun avec le bot trouvé.<br />
              Invitez le bot sur un serveur dont vous êtes admin.
            </p>
          )}
        </nav>
      </div>

      {/* User profile + Bot status footer */}
      <div className="border-t border-primary/20 bg-card/40">
        {user && (
          <div className="p-4 border-b border-primary/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full border border-primary/30 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-body text-xs font-semibold text-foreground truncate">{displayName}</p>
                <p className="font-display text-[10px] text-primary/40 truncate">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              className="shrink-0 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className={`w-2.5 h-2.5 rounded-full ${status?.online ? 'bg-primary shadow-[0_0_8px_#00F0FF]' : 'bg-destructive'}`} />
                {status?.online && <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-40" />}
              </div>
              <span className="font-body text-xs text-muted-foreground">Bot Discord</span>
            </div>
            <span className={`font-display text-xs font-bold tracking-wider ${status?.online ? 'text-primary' : 'text-destructive'}`}>
              {status?.online ? 'EN LIGNE' : 'HORS LIGNE'}
            </span>
          </div>
          {status?.online && (
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Ping : <span className="text-primary font-semibold">{status.ping} ms</span></span>
              <span>Actif : <span className="text-primary font-semibold">{Math.floor(status.uptime / 3600000)}h</span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground scanlines">
      <div
        className="fixed inset-0 z-[-1] opacity-[0.07] bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/cyberpunk-bg.png)` }}
      />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 flex-shrink-0 border-r border-primary/20 bg-background/90 backdrop-blur-xl flex-col z-10 fixed top-0 bottom-0 left-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 bottom-0 left-0 z-40 w-72 border-r border-primary/20 bg-background/95 backdrop-blur-xl flex flex-col md:hidden"
            >
              <SidebarContent onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10 flex flex-col md:ml-72">
        <header className="h-14 border-b border-primary/20 bg-background/80 backdrop-blur-md flex items-center px-4 sm:px-8 justify-between flex-shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-primary/70">
              <TerminalSquare className="w-4 h-4" />
              <span className="font-display text-xs tracking-widest hidden sm:block">ASTRAL_OS_v2.0</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-2 sm:px-3 py-1 border border-primary/30 bg-primary/10 text-xs font-display text-primary flex items-center gap-2">
              <Radio className="w-3 h-3 animate-pulse" />
              <span className="hidden sm:inline">LIAISON DISCORD ACTIVE</span>
              <span className="sm:hidden">ACTIF</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
