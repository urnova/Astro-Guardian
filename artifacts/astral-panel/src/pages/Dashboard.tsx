import React from 'react';
import { Link } from 'wouter';
import { useGetBotStatus, useGetBotGuilds } from '@workspace/api-client-react';
import { Activity, Server, ShieldAlert, Zap, Clock, Wifi } from 'lucide-react';
import { CyberCard, CyberBadge, CyberButton } from '@/components/CyberUI';

export default function Dashboard() {
  const { data: status, isLoading: statusLoading } = useGetBotStatus();
  const { data: guilds, isLoading: guildsLoading } = useGetBotGuilds();

  if (statusLoading || guildsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-primary animate-pulse" />
          <h2 className="font-display text-primary tracking-widest animate-pulse">INITIALIZING SYSTEMS...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">SYSTEM OVERVIEW</h1>
        <p className="text-muted-foreground font-body text-lg">Global neural network status and active operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CyberCard className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm text-muted-foreground">CORE STATUS</h3>
            <Wifi className={`w-5 h-5 ${status?.online ? 'text-primary' : 'text-destructive'}`} />
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-4xl font-display font-bold ${status?.online ? 'text-primary text-glow' : 'text-destructive'}`}>
              {status?.online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </CyberCard>

        <CyberCard className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm text-muted-foreground">LATENCY</h3>
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-display font-bold text-foreground">{status?.ping || 0}</span>
            <span className="text-muted-foreground mb-1 font-display">MS</span>
          </div>
        </CyberCard>

        <CyberCard className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm text-muted-foreground">ACTIVE NETWORKS</h3>
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-display font-bold text-foreground">{status?.guildCount || 0}</span>
            <span className="text-muted-foreground mb-1 font-display">SERVERS</span>
          </div>
        </CyberCard>

        <CyberCard className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm text-muted-foreground">SYSTEM UPTIME</h3>
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-display font-bold text-foreground">
              {status?.uptime ? (status.uptime / 3600000).toFixed(1) : 0}
            </span>
            <span className="text-muted-foreground mb-1 font-display">HOURS</span>
          </div>
        </CyberCard>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">CONNECTED SECTORS</h2>
          <CyberBadge variant="outline">{(guilds || []).length} REGIONS</CyberBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guilds?.map(guild => (
            <CyberCard key={guild.id} className="group hover:border-primary/60 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {guild.icon ? (
                    <img src={guild.icon} alt={guild.name} className="w-12 h-12 rounded-lg border-2 border-primary/30" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                      <span className="font-display text-xl text-primary font-bold">{guild.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-body font-bold text-lg text-foreground group-hover:text-primary transition-colors">{guild.name}</h3>
                    <p className="text-xs font-display text-muted-foreground">{guild.id}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-background/50 p-3 cyber-clip border border-primary/10">
                  <p className="text-xs font-display text-muted-foreground mb-1">MEMBERS</p>
                  <p className="font-display font-bold text-primary">{guild.memberCount}</p>
                </div>
                <div className="bg-background/50 p-3 cyber-clip border border-primary/10">
                  <p className="text-xs font-display text-muted-foreground mb-1">STATUS</p>
                  <div className="flex gap-2 mt-1">
                    {guild.breachMode ? (
                      <CyberBadge variant="destructive">BREACH</CyberBadge>
                    ) : guild.maintenanceMode ? (
                      <CyberBadge variant="outline">MAINTENANCE</CyberBadge>
                    ) : (
                      <CyberBadge variant="primary">SECURE</CyberBadge>
                    )}
                  </div>
                </div>
              </div>

              <Link href={`/guilds/${guild.id}`}>
                <CyberButton variant="outline" className="w-full">
                  Access Controls
                </CyberButton>
              </Link>
            </CyberCard>
          ))}
        </div>
      </div>
    </div>
  );
}
