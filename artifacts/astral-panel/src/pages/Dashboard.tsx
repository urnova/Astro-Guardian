import React from 'react';
import { Link } from 'wouter';
import { useGetBotStatus, useGetBotGuilds } from '@workspace/api-client-react';
import { Activity, Server, Clock, Wifi, Users, Shield } from 'lucide-react';
import { CyberCard, CyberBadge, CyberButton } from '@/components/CyberUI';

export default function Dashboard() {
  const { data: status, isLoading: statusLoading } = useGetBotStatus();
  const { data: guilds, isLoading: guildsLoading } = useGetBotGuilds();

  if (statusLoading || guildsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-10 h-10 text-primary animate-pulse" />
          <p className="font-display text-primary tracking-widest animate-pulse text-sm">INITIALISATION DU SYSTÈME...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      label: "État du bot",
      value: status?.online ? 'EN LIGNE' : 'HORS LIGNE',
      icon: <Wifi className={`w-5 h-5 ${status?.online ? 'text-primary' : 'text-destructive'}`} />,
      valueClass: status?.online ? 'text-primary text-glow text-3xl' : 'text-destructive text-3xl',
    },
    {
      label: "Latence",
      value: `${status?.ping ?? 0} ms`,
      icon: <Activity className="w-5 h-5 text-primary" />,
      valueClass: 'text-foreground text-3xl',
    },
    {
      label: "Serveurs gérés",
      value: `${status?.guildCount ?? 0}`,
      icon: <Server className="w-5 h-5 text-primary" />,
      valueClass: 'text-foreground text-3xl',
    },
    {
      label: "Temps d'activité",
      value: `${status?.uptime ? (status.uptime / 3600000).toFixed(1) : '0'} h`,
      icon: <Clock className="w-5 h-5 text-primary" />,
      valueClass: 'text-foreground text-3xl',
    },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-wide">Vue d'ensemble</h1>
        <p className="text-muted-foreground mt-1 text-sm">Statut global du réseau et opérations en cours.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsCards.map((card, i) => (
          <CyberCard key={i} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-display text-muted-foreground uppercase tracking-widest">{card.label}</p>
              {card.icon}
            </div>
            <span className={`font-display font-bold ${card.valueClass}`}>{card.value}</span>
          </CyberCard>
        ))}
      </div>

      {/* Guilds */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Serveurs connectés</h2>
          <CyberBadge variant="outline">{(guilds || []).length} serveur{(guilds || []).length !== 1 ? 's' : ''}</CyberBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {guilds?.map(guild => (
            <CyberCard key={guild.id} className="group hover:border-primary/60 transition-colors flex flex-col">
              <div className="flex items-center gap-4 mb-5">
                {guild.icon ? (
                  <img src={guild.icon} alt={guild.name} className="w-12 h-12 rounded-xl border-2 border-primary/30 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
                    <span className="font-display text-xl text-primary font-bold">{guild.name.charAt(0)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-body font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">{guild.name}</h3>
                  <p className="text-[10px] font-display text-muted-foreground truncate">{guild.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-background/60 p-3 border border-primary/10 rounded flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <p className="text-[11px] font-display text-muted-foreground uppercase tracking-wider">Membres</p>
                  </div>
                  <p className="font-display font-bold text-primary text-lg">{guild.memberCount}</p>
                </div>
                <div className="bg-background/60 p-3 border border-primary/10 rounded flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <p className="text-[11px] font-display text-muted-foreground uppercase tracking-wider">Statut</p>
                  </div>
                  <div className="mt-0.5">
                    {guild.breachMode ? (
                      <CyberBadge variant="destructive">BRÈCHE</CyberBadge>
                    ) : guild.maintenanceMode ? (
                      <CyberBadge variant="outline">MAINTENANCE</CyberBadge>
                    ) : (
                      <CyberBadge variant="primary">SÉCURISÉ</CyberBadge>
                    )}
                  </div>
                </div>
              </div>

              <Link href={`/guilds/${guild.id}`} className="mt-auto">
                <CyberButton variant="outline" className="w-full text-sm">
                  Gérer ce serveur
                </CyberButton>
              </Link>
            </CyberCard>
          ))}

          {guilds?.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground italic text-sm">
              Aucun serveur trouvé. Invitez le bot sur un serveur pour commencer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
