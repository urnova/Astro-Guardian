import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, Cpu, TerminalSquare, Radio, Users, ChevronRight } from 'lucide-react';
import { useGetBotStatus, useGetBotGuilds } from '@workspace/api-client-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: status } = useGetBotStatus({ query: { refetchInterval: 10000 } });
  const { data: guilds } = useGetBotGuilds();

  return (
    <div className="min-h-screen flex bg-background text-foreground scanlines">
      {/* Background Image Layer */}
      <div 
        className="fixed inset-0 z-[-1] opacity-20 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/cyberpunk-bg.png)` }}
      />

      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-primary/20 bg-background/80 backdrop-blur-xl flex flex-col z-10">
        <div className="p-6 border-b border-primary/20 flex items-center gap-4">
          <img 
            src={`${import.meta.env.BASE_URL}images/astral-logo.png`} 
            alt="Astral Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="font-display text-xl font-bold text-primary text-glow">ASTRAL</h1>
            <p className="text-xs text-muted-foreground font-display tracking-widest">SYSTEM LINK</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <nav className="px-4 space-y-2">
            <div className="text-xs font-display text-primary/50 mb-4 px-2 uppercase tracking-widest">Main Interface</div>
            <Link 
              href="/"
              className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 cyber-clip ${location === '/' ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
            >
              <Cpu className="w-5 h-5" />
              <span className="font-display tracking-wide text-sm">Dashboard</span>
            </Link>

            <div className="text-xs font-display text-primary/50 mt-8 mb-4 px-2 uppercase tracking-widest">Active Networks</div>
            
            {guilds?.map((guild) => (
              <Link
                key={guild.id}
                href={`/guilds/${guild.id}`}
                className={`flex items-center justify-between gap-3 px-4 py-3 transition-all duration-200 cyber-clip group ${location.startsWith(`/guilds/${guild.id}`) ? 'bg-primary/20 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
              >
                <div className="flex items-center gap-3 truncate">
                  {guild.icon ? (
                    <img src={guild.icon} alt={guild.name} className="w-6 h-6 rounded-full border border-primary/30" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 text-[10px] font-bold">
                      {guild.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-body text-sm truncate">{guild.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
            
            {guilds?.length === 0 && (
              <div className="px-6 py-4 text-xs text-muted-foreground italic">No active networks detected.</div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-primary/20 bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${status?.online ? 'bg-primary shadow-[0_0_10px_#00F0FF]' : 'bg-destructive shadow-[0_0_10px_#FF0000]'}`} />
                {status?.online && <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-50" />}
              </div>
              <span className="font-display text-xs text-muted-foreground uppercase tracking-widest">STATUS</span>
            </div>
            <span className={`font-display text-xs font-bold ${status?.online ? 'text-primary' : 'text-destructive'}`}>
              {status?.online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          {status?.online && (
            <div className="mt-2 flex justify-between text-[10px] font-display text-muted-foreground tracking-wider">
              <span>PING: <span className="text-primary">{status.ping}ms</span></span>
              <span>UPTIME: <span className="text-primary">{Math.floor(status.uptime / 3600000)}h</span></span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10 flex flex-col">
        <header className="h-16 border-b border-primary/20 bg-background/80 backdrop-blur-md flex items-center px-8 justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-primary">
            <TerminalSquare className="w-5 h-5" />
            <span className="font-display text-sm tracking-widest">ASTRAL_OS_v2.0</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 border border-primary/30 bg-primary/10 cyber-clip text-xs font-display text-primary flex items-center gap-2">
              <Radio className="w-3 h-3 animate-pulse" />
              SECURE CONNECTION
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
