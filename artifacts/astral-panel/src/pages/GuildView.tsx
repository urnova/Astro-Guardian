import React, { useState, useMemo } from 'react';
import { useRoute } from 'wouter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Activity, ShieldAlert, Settings, MessageSquare, 
  Gift, CheckSquare, ListOrdered, Wrench, Shield, AlertTriangle, Users, Hash, FileText,
  Search, Zap, UserCheck, Bomb, Filter, UserPlus
} from 'lucide-react';
import { 
  useGetGuildConfig, useUpdateGuildConfig, useGetGuildStats,
  useGetGuildChannels, useGetGuildWarns, useGetBannedWords,
  useAddBannedWord, useDeleteBannedWord, useGetGiveaways,
  useCreateGiveaway, useEndGiveaway, useGetSurveys,
  useCreateSurvey, useTriggerMaintenance, useTriggerBreach,
  useSendEmbed, useSendAnnouncement, useSendSay, useGetGuildLogs,
  useGetGuildRules, useSendGuildRules, useGetGuildRoles,
  useGetGuildMembers, useAddWarn, useDeleteWarn,
  useKickMember, useBanMember, useUnbanMember,
  useMuteMember, useUnmuteMember, useClearMessages,
  useMassBanMembers, useNukeChannel, useSendDm
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { CyberCard, CyberButton, CyberInput, CyberBadge, CyberSelect } from '@/components/CyberUI';
import { useToast } from '@/hooks/use-toast';

type Tab = 'overview' | 'config' | 'welcome' | 'moderation' | 'security' | 'messaging' | 'giveaways' | 'surveys' | 'rules' | 'logs';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Vue d\'ensemble', icon: <Activity className="w-4 h-4" /> },
  { id: 'config',      label: 'Configuration',   icon: <Settings className="w-4 h-4" /> },
  { id: 'welcome',     label: 'Bienvenue',        icon: <UserPlus className="w-4 h-4" /> },
  { id: 'moderation',  label: 'Modération',       icon: <ShieldAlert className="w-4 h-4" /> },
  { id: 'security',    label: 'Sécurité',         icon: <Shield className="w-4 h-4" /> },
  { id: 'messaging',   label: 'Messagerie',       icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'giveaways',   label: 'Giveaways',        icon: <Gift className="w-4 h-4" /> },
  { id: 'surveys',     label: 'Questionnaires',   icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'rules',       label: 'Règles',           icon: <FileText className="w-4 h-4" /> },
  { id: 'logs',        label: 'Journaux',         icon: <ListOrdered className="w-4 h-4" /> },
];

export default function GuildView() {
  const [, params] = useRoute('/guilds/:guildId');
  const guildId = params?.guildId || '';
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!guildId) return <div className="text-destructive p-4">Serveur invalide.</div>;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-20">
      <div className="border-b border-primary/20 pb-3 sm:pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-wide">Gestion du serveur</h1>
        <p className="text-xs font-display text-primary/60 mt-1 tracking-widest truncate">ID : {guildId}</p>
      </div>

      {/* Tabs — scrollable horizontally on mobile, icons-only on small screens */}
      <div className="flex overflow-x-auto gap-1 sm:gap-1.5 pb-1 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 font-body text-xs sm:text-sm font-medium transition-all whitespace-nowrap rounded
              ${activeTab === tab.id 
                ? 'bg-primary/20 text-primary border border-primary/50' 
                : 'bg-background/60 border border-primary/15 text-muted-foreground hover:border-primary/40 hover:text-primary'
              }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'overview'   && <OverviewTab   guildId={guildId} />}
        {activeTab === 'config'     && <ConfigTab     guildId={guildId} />}
        {activeTab === 'welcome'    && <WelcomeTab    guildId={guildId} />}
        {activeTab === 'moderation' && <ModerationTab guildId={guildId} />}
        {activeTab === 'security'   && <SecurityTab   guildId={guildId} />}
        {activeTab === 'messaging'  && <MessagingTab  guildId={guildId} />}
        {activeTab === 'giveaways'  && <GiveawaysTab  guildId={guildId} />}
        {activeTab === 'surveys'    && <SurveysTab    guildId={guildId} />}
        {activeTab === 'rules'      && <RulesTab      guildId={guildId} />}
        {activeTab === 'logs'       && <LogsTab       guildId={guildId} />}
      </div>
    </div>
  );
}

/* ─────────────────── Vue d'ensemble ─────────────────── */
function OverviewTab({ guildId }: { guildId: string }) {
  const { data: stats, isLoading } = useGetGuildStats(guildId);

  if (isLoading) return <p className="text-primary animate-pulse font-display text-sm">Analyse du secteur...</p>;
  if (!stats) return null;

  const items = [
    { label: 'Membres',            value: stats.memberCount,     icon: <Users className="w-5 h-5 text-primary" /> },
    { label: 'Salons actifs',      value: stats.channelCount,    icon: <Hash className="w-5 h-5 text-primary" /> },
    { label: 'Rôles',              value: stats.roleCount,       icon: <Zap className="w-5 h-5 text-primary" /> },
    { label: 'Avertissements',     value: stats.warnCount,       icon: <ShieldAlert className="w-5 h-5 text-destructive" /> },
    { label: 'Mots bannis',        value: stats.bannedWordCount, icon: <AlertTriangle className="w-5 h-5 text-destructive" /> },
    { label: 'Giveaways',          value: stats.giveawayCount,   icon: <Gift className="w-5 h-5 text-primary" /> },
    { label: 'Questionnaires',     value: stats.surveyCount,     icon: <CheckSquare className="w-5 h-5 text-primary" /> },
    { label: 'Événements journaux', value: stats.logCount,       icon: <ListOrdered className="w-5 h-5 text-primary" /> },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((item, i) => (
        <CyberCard key={i} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-display text-muted-foreground uppercase tracking-widest">{item.label}</p>
            {item.icon}
          </div>
          <span className="text-4xl font-display font-bold text-foreground">{item.value}</span>
        </CyberCard>
      ))}
    </div>
  );
}

/* ─────────────────── Configuration ─────────────────── */
function ConfigTab({ guildId }: { guildId: string }) {
  const { data: config, isLoading } = useGetGuildConfig(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: updateConfig, isPending } = useUpdateGuildConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    logChannelId: '',
    surveyChannelId: '',
    automodEnabled: true,
    antiRaidEnabled: true,
    antiSpamEnabled: true,
    maxMentions: 5,
    maxMessagesPerMinute: 10,
  });

  React.useEffect(() => {
    if (config) {
      setForm({
        logChannelId: config.logChannelId || '',
        surveyChannelId: config.surveyChannelId || '',
        automodEnabled: config.automodEnabled,
        antiRaidEnabled: config.antiRaidEnabled,
        antiSpamEnabled: config.antiSpamEnabled,
        maxMentions: config.maxMentions,
        maxMessagesPerMinute: config.maxMessagesPerMinute,
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({ guildId, data: { ...form, logChannelId: form.logChannelId || null, surveyChannelId: form.surveyChannelId || null } }, {
      onSuccess: () => {
        toast({ title: 'Configuration enregistrée', description: 'Les paramètres ont bien été mis à jour.' });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/config`] });
      }
    });
  };

  if (isLoading) return <p className="text-primary animate-pulse text-sm">Chargement de la configuration...</p>;

  return (
    <CyberCard className="max-w-2xl">
      <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5" /> Paramètres du serveur
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">

          <div>
            <label className="block font-body text-sm text-foreground mb-2">Salon de journalisation (logs)</label>
            <CyberSelect value={form.logChannelId} onChange={e => setForm(f => ({ ...f, logChannelId: e.target.value }))}>
              <option value="">— Désactivé —</option>
              {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </CyberSelect>
          </div>

          <div>
            <label className="block font-body text-sm text-foreground mb-2">Salon des réponses (questionnaires)</label>
            <CyberSelect value={form.surveyChannelId} onChange={e => setForm(f => ({ ...f, surveyChannelId: e.target.value }))}>
              <option value="">— Désactivé —</option>
              {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </CyberSelect>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-body text-sm text-foreground mb-2">Mentions max par message</label>
              <CyberInput type="number" min="1" value={form.maxMentions} onChange={e => setForm(f => ({ ...f, maxMentions: parseInt(e.target.value) }))} />
            </div>
            <div>
              <label className="block font-body text-sm text-foreground mb-2">Messages max / minute</label>
              <CyberInput type="number" min="1" value={form.maxMessagesPerMinute} onChange={e => setForm(f => ({ ...f, maxMessagesPerMinute: parseInt(e.target.value) }))} />
            </div>
          </div>

          <div className="pt-4 border-t border-primary/20 space-y-3">
            <h3 className="font-body text-sm font-semibold text-foreground">Protections automatiques</h3>

            {[
              { key: 'automodEnabled', label: 'Auto-modération (filtre les mots bannis)' },
              { key: 'antiRaidEnabled', label: 'Anti-raid (bloque les arrivées massives)' },
              { key: 'antiSpamEnabled', label: 'Anti-spam (limite les messages répétitifs)' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary"
                  checked={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                />
                <span className="font-body text-sm text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <CyberButton type="submit" isLoading={isPending} className="w-full">Enregistrer la configuration</CyberButton>
      </form>
    </CyberCard>
  );
}

/* ─────────────────── Modération ─────────────────── */
function ModerationTab({ guildId }: { guildId: string }) {
  const { data: warns } = useGetGuildWarns(guildId);
  const { data: words } = useGetBannedWords(guildId);
  const { data: members } = useGetGuildMembers(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: addWord, isPending: addingWord } = useAddBannedWord();
  const { mutate: delWord } = useDeleteBannedWord();
  const { mutate: addWarn, isPending: warningMember } = useAddWarn();
  const { mutate: delWarn } = useDeleteWarn();
  const { mutate: kickMember, isPending: kicking } = useKickMember();
  const { mutate: banMember, isPending: banning } = useBanMember();
  const { mutate: unbanMember, isPending: unbanning } = useUnbanMember();
  const { mutate: muteMember, isPending: muting } = useMuteMember();
  const { mutate: unmuteMember, isPending: unmuting } = useUnmuteMember();
  const { mutate: clearMessages, isPending: clearing } = useClearMessages();
  const { mutate: massBan, isPending: massBanning } = useMassBanMembers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newWord, setNewWord] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [reason, setReason] = useState('');
  const [muteMinutes, setMuteMinutes] = useState(10);
  const [unbanId, setUnbanId] = useState('');
  const [clearData, setClearData] = useState({ channelId: '', amount: 10 });
  const [massBanIds, setMassBanIds] = useState('');
  const [massBanReason, setMassBanReason] = useState('');

  const invalidateWarns = () => queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/warns`] });
  const invalidateWords = () => queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/banned-words`] });

  const selectedMemberInfo = members?.find(m => m.id === selectedMember);
  const memberWarns = warns?.filter(w => w.userId === selectedMember) ?? [];

  const handleAction = (fn: () => void, needsMember = true) => {
    if (needsMember && !selectedMember) { toast({ title: 'Sélectionnez un membre', variant: 'destructive' }); return; }
    fn();
  };

  const runKick = () => kickMember({ guildId, data: { userId: selectedMember, reason: reason || undefined } }, {
    onSuccess: r => { toast({ title: r.message }); setReason(''); invalidateWarns(); },
    onError: () => toast({ title: 'Erreur kick', variant: 'destructive' }),
  });
  const runBan = () => banMember({ guildId, data: { userId: selectedMember, reason: reason || undefined } }, {
    onSuccess: r => { toast({ title: r.message }); setReason(''); },
    onError: () => toast({ title: 'Erreur ban', variant: 'destructive' }),
  });
  const runMute = () => muteMember({ guildId, data: { userId: selectedMember, minutes: muteMinutes, reason: reason || undefined } }, {
    onSuccess: r => { toast({ title: r.message }); setReason(''); },
    onError: () => toast({ title: 'Erreur mute', variant: 'destructive' }),
  });
  const runUnmute = () => unmuteMember({ guildId, data: { userId: selectedMember } }, {
    onSuccess: r => toast({ title: r.message }),
    onError: () => toast({ title: 'Erreur unmute', variant: 'destructive' }),
  });
  const runWarn = () => addWarn({ guildId, data: { userId: selectedMember, reason: reason || 'Avertissement via panel' } }, {
    onSuccess: () => { toast({ title: 'Avertissement ajouté' }); setReason(''); invalidateWarns(); },
    onError: () => toast({ title: 'Erreur warn', variant: 'destructive' }),
  });

  return (
    <div className="space-y-8">
      {/* ACTIONS RAPIDES */}
      <CyberCard>
        <h2 className="text-lg font-bold text-destructive mb-5 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> Actions de modération
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="block font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Membre cible</label>
              <CyberSelect value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
                <option value="">— Choisir un membre —</option>
                {members?.map(m => <option key={m.id} value={m.id}>{m.displayName} ({m.username})</option>)}
              </CyberSelect>
            </div>
            <div>
              <label className="block font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Raison (optionnel)</label>
              <CyberInput placeholder="Raison de l'action…" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div>
              <label className="block font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Durée timeout (minutes)</label>
              <CyberInput type="number" min="1" max="40320" value={muteMinutes} onChange={e => setMuteMinutes(parseInt(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 content-start">
            <CyberButton onClick={() => handleAction(runWarn)} isLoading={warningMember} className="text-sm py-2.5" style={{ borderColor: '#facc15', color: '#facc15' }}>
              ⚠️ Avertir
            </CyberButton>
            <CyberButton onClick={() => handleAction(runKick)} isLoading={kicking} className="text-sm py-2.5" style={{ borderColor: '#f97316', color: '#f97316' }}>
              👢 Expulser
            </CyberButton>
            <CyberButton onClick={() => handleAction(runMute)} isLoading={muting} className="text-sm py-2.5" style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}>
              🔇 Timeout
            </CyberButton>
            <CyberButton onClick={() => handleAction(runUnmute)} isLoading={unmuting} className="text-sm py-2.5">
              🔊 Retirer timeout
            </CyberButton>
            <CyberButton variant="destructive" onClick={() => {
              if (!selectedMember) { toast({ title: 'Sélectionnez un membre', variant: 'destructive' }); return; }
              if (!confirm(`Bannir cet utilisateur ?`)) return;
              runBan();
            }} isLoading={banning} className="text-sm py-2.5 col-span-2">
              🔨 Bannir le membre
            </CyberButton>
          </div>
        </div>

        {/* Unban par ID */}
        <div className="mt-5 pt-5 border-t border-primary/20">
          <label className="block font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Débannir par ID Discord</label>
          <div className="flex gap-2">
            <CyberInput placeholder="ID Discord (ex: 123456789012345678)" value={unbanId} onChange={e => setUnbanId(e.target.value)} />
            <CyberButton isLoading={unbanning} onClick={() => {
              if (!unbanId.trim()) return;
              unbanMember({ guildId, data: { userId: unbanId.trim() } }, {
                onSuccess: r => { toast({ title: r.message }); setUnbanId(''); },
                onError: () => toast({ title: 'Introuvable dans les bans', variant: 'destructive' }),
              });
            }}>Débannir</CyberButton>
          </div>
        </div>

        {/* Clear + Mass ban */}
        <div className="mt-5 pt-5 border-t border-primary/20 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-body text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              🧹 Purger des messages
            </h3>
            <div className="space-y-2">
              <CyberSelect value={clearData.channelId} onChange={e => setClearData(p => ({ ...p, channelId: e.target.value }))}>
                <option value="">— Choisir un salon —</option>
                {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
              </CyberSelect>
              <div className="flex gap-2 items-center">
                <CyberInput type="number" min="1" max="100" placeholder="Nb messages (max 100)" value={clearData.amount} onChange={e => setClearData(p => ({ ...p, amount: parseInt(e.target.value) }))} />
                <CyberButton isLoading={clearing} onClick={() => {
                  if (!clearData.channelId) { toast({ title: 'Choisissez un salon', variant: 'destructive' }); return; }
                  clearMessages({ guildId, data: { channelId: clearData.channelId, amount: clearData.amount } }, {
                    onSuccess: r => toast({ title: r.message }),
                    onError: () => toast({ title: 'Erreur purge', variant: 'destructive' }),
                  });
                }}>Purger</CyberButton>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-body text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              🔨 Ban de masse
            </h3>
            <div className="space-y-2">
              <textarea
                className="w-full h-20 bg-background border border-primary/30 px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded resize-none"
                placeholder="IDs Discord séparés par des espaces ou virgules…"
                value={massBanIds}
                onChange={e => setMassBanIds(e.target.value)}
              />
              <div className="flex gap-2">
                <CyberInput placeholder="Raison" value={massBanReason} onChange={e => setMassBanReason(e.target.value)} />
                <CyberButton variant="destructive" isLoading={massBanning} onClick={() => {
                  if (!massBanIds.trim()) return;
                  if (!confirm('Bannir tous ces utilisateurs ?')) return;
                  massBan({ guildId, data: { userIds: massBanIds, reason: massBanReason || undefined } }, {
                    onSuccess: r => { toast({ title: r.message }); setMassBanIds(''); setMassBanReason(''); },
                    onError: () => toast({ title: 'Erreur ban de masse', variant: 'destructive' }),
                  });
                }}>Bannir tout</CyberButton>
              </div>
            </div>
          </div>
        </div>
      </CyberCard>

      {/* PROFIL MEMBRE */}
      {selectedMember && selectedMemberInfo && (
        <CyberCard>
          <h2 className="text-lg font-bold text-primary mb-5 flex items-center gap-2">
            <UserCheck className="w-5 h-5" /> Profil : {selectedMemberInfo.displayName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-background/50 border border-primary/15 p-3 rounded">
              <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1">Identifiant</p>
              <p className="text-sm font-mono text-foreground">{selectedMemberInfo.id}</p>
            </div>
            <div className="bg-background/50 border border-primary/15 p-3 rounded">
              <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1">Pseudo Discord</p>
              <p className="text-sm text-foreground">@{selectedMemberInfo.username}</p>
            </div>
            <div className="bg-background/50 border border-primary/15 p-3 rounded">
              <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1">Avertissements</p>
              <p className={`text-2xl font-display font-bold ${memberWarns.length > 0 ? 'text-destructive' : 'text-primary'}`}>{memberWarns.length}</p>
            </div>
          </div>
          {memberWarns.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              <p className="text-xs font-display text-muted-foreground uppercase tracking-widest mb-2">Historique des avertissements</p>
              {memberWarns.map(w => (
                <div key={w.id} className="bg-destructive/5 border border-destructive/20 p-3 rounded flex justify-between items-start gap-3">
                  <div>
                    <p className="text-sm text-foreground">{w.reason}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Par {w.moderatorName} · {format(new Date(w.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}</p>
                  </div>
                  <button
                    onClick={() => delWarn({ guildId, warnId: w.id }, { onSuccess: () => { toast({ title: 'Warn retiré' }); invalidateWarns(); } })}
                    className="text-destructive/40 hover:text-destructive transition-colors text-lg leading-none flex-shrink-0"
                    title="Retirer ce warn"
                  >×</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Aucun avertissement pour ce membre.</p>
          )}
        </CyberCard>
      )}

      {/* WARNS + MOTS BANNIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CyberCard>
          <h2 className="text-lg font-bold text-destructive mb-5 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Mots bannis
          </h2>
          <form onSubmit={e => { e.preventDefault(); if (!newWord.trim()) return; addWord({ guildId, data: { word: newWord } }, { onSuccess: () => { setNewWord(''); invalidateWords(); } }); }} className="flex gap-2 mb-5">
            <CyberInput placeholder="Ajouter un mot à filtrer…" value={newWord} onChange={e => setNewWord(e.target.value)} />
            <CyberButton type="submit" isLoading={addingWord}>Ajouter</CyberButton>
          </form>
          <div className="flex flex-wrap gap-2">
            {words?.map(w => (
              <div key={w.id} className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 px-3 py-1.5 rounded">
                <span className="font-body text-sm text-destructive">{w.word}</span>
                <button onClick={() => delWord({ guildId, wordId: w.id }, { onSuccess: invalidateWords })} className="text-destructive/50 hover:text-destructive transition-colors text-lg leading-none">×</button>
              </div>
            ))}
            {words?.length === 0 && <p className="text-muted-foreground italic text-sm">Aucun filtre actif.</p>}
          </div>
        </CyberCard>

        <CyberCard>
          <h2 className="text-lg font-bold text-primary mb-5 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Avertissements récents
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {warns?.map(w => (
              <div key={w.id} className="bg-background/50 border border-primary/15 p-4 rounded">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="font-semibold text-primary text-sm">{w.username}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{format(new Date(w.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}</span>
                    <button
                      onClick={() => delWarn({ guildId, warnId: w.id }, { onSuccess: () => { toast({ title: 'Warn retiré' }); invalidateWarns(); } })}
                      className="text-destructive/40 hover:text-destructive transition-colors text-base leading-none"
                      title="Supprimer ce warn"
                    >×</button>
                  </div>
                </div>
                <p className="text-sm text-foreground mb-1">{w.reason}</p>
                <p className="text-xs text-muted-foreground">Par {w.moderatorName}</p>
              </div>
            ))}
            {warns?.length === 0 && <p className="text-muted-foreground italic text-sm">Aucun avertissement émis.</p>}
          </div>
        </CyberCard>
      </div>
    </div>
  );
}

/* ─────────────────── Sécurité ─────────────────── */
function SecurityTab({ guildId }: { guildId: string }) {
  const { data: config } = useGetGuildConfig(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: toggleMaintenance, isPending: maintPending } = useTriggerMaintenance();
  const { mutate: toggleBreach, isPending: breachPending } = useTriggerBreach();
  const { mutate: nukeChannel, isPending: nukePending } = useNukeChannel();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [nukeChannelId, setNukeChannelId] = useState('');

  const handleMaintenance = (enabled: boolean) => {
    toggleMaintenance({ guildId, data: { enabled, reason: 'Maintenance via le panel' } }, {
      onSuccess: () => {
        toast({ title: enabled ? 'Mode maintenance activé' : 'Maintenance levée' });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/config`] });
      }
    });
  };

  const handleBreach = (enabled: boolean) => {
    if (enabled && !confirm('⚠️ Cela va verrouiller entièrement le serveur. Continuer ?')) return;
    toggleBreach({ guildId, data: { enabled, reason: 'Brèche détectée via le panel' } }, {
      onSuccess: () => {
        toast({ title: enabled ? 'Protocole de brèche engagé' : 'Brèche résolue', variant: enabled ? 'destructive' : 'default' });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/config`] });
      }
    });
  };

  const handleNuke = () => {
    if (!nukeChannelId) { toast({ title: 'Sélectionnez un salon', variant: 'destructive' }); return; }
    if (!confirm('⚠️ NUKE : Le salon sera supprimé et recréé. Tous les messages seront perdus. Continuer ?')) return;
    nukeChannel({ guildId, data: { channelId: nukeChannelId } }, {
      onSuccess: r => { toast({ title: r.message }); setNukeChannelId(''); },
      onError: () => toast({ title: 'Erreur nuke', variant: 'destructive' }),
    });
  };

  const protections = [
    { label: 'Auto-modération', enabled: config?.automodEnabled, icon: <Shield className="w-4 h-4" /> },
    { label: 'Anti-raid', enabled: config?.antiRaidEnabled, icon: <Zap className="w-4 h-4" /> },
    { label: 'Anti-spam', enabled: config?.antiSpamEnabled, icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Status des protections */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {protections.map(p => (
          <div key={p.label} className={`flex items-center justify-between p-4 border rounded ${p.enabled ? 'bg-primary/10 border-primary/40' : 'bg-background/50 border-primary/15'}`}>
            <div className="flex items-center gap-3">
              <span className={p.enabled ? 'text-primary' : 'text-muted-foreground'}>{p.icon}</span>
              <span className="font-body text-sm font-medium text-foreground">{p.label}</span>
            </div>
            <CyberBadge variant={p.enabled ? 'primary' : 'outline'} className="text-[10px]">
              {p.enabled ? 'ON' : 'OFF'}
            </CyberBadge>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground -mt-4">Pour modifier ces protections, rendez-vous dans l'onglet <strong>Configuration</strong>.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Maintenance */}
        <CyberCard glowing={config?.maintenanceMode}>
          <div className="flex items-center gap-4 mb-6">
            <Wrench className={`w-8 h-8 ${config?.maintenanceMode ? 'text-primary animate-spin' : 'text-muted-foreground'}`} />
            <div>
              <h2 className="text-lg font-bold text-foreground">Mode Maintenance</h2>
              <p className="text-sm text-muted-foreground">Suspendre l'accès pour des mises à jour techniques</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-background/50 border border-primary/20 rounded mb-5">
            <span className="font-body text-sm text-muted-foreground">Statut actuel</span>
            {config?.maintenanceMode ? (
              <CyberBadge variant="primary" className="animate-pulse">ACTIF</CyberBadge>
            ) : (
              <CyberBadge variant="outline">INACTIF</CyberBadge>
            )}
          </div>
          {config?.maintenanceMode ? (
            <CyberButton variant="outline" className="w-full" onClick={() => handleMaintenance(false)} isLoading={maintPending}>
              Désactiver la maintenance
            </CyberButton>
          ) : (
            <CyberButton className="w-full" onClick={() => handleMaintenance(true)} isLoading={maintPending}>
              Activer la maintenance
            </CyberButton>
          )}
        </CyberCard>

        {/* Brèche */}
        <CyberCard glowing={config?.breachMode} className={config?.breachMode ? 'border-destructive/50' : ''}>
          <div className="flex items-center gap-4 mb-6">
            <ShieldAlert className={`w-8 h-8 ${config?.breachMode ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
            <div>
              <h2 className="text-lg font-bold text-foreground">Protocole de Brèche</h2>
              <p className="text-sm text-muted-foreground">Verrouillage d'urgence complet du serveur</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-background/50 border border-primary/20 rounded mb-5">
            <span className="font-body text-sm text-muted-foreground">Statut actuel</span>
            {config?.breachMode ? (
              <CyberBadge variant="destructive" className="animate-pulse">CRITIQUE</CyberBadge>
            ) : (
              <CyberBadge variant="outline">SÉCURISÉ</CyberBadge>
            )}
          </div>
          {config?.breachMode ? (
            <CyberButton variant="primary" className="w-full" onClick={() => handleBreach(false)} isLoading={breachPending}>
              Résoudre la brèche
            </CyberButton>
          ) : (
            <CyberButton variant="destructive" className="w-full" onClick={() => handleBreach(true)} isLoading={breachPending}>
              Engager le verrouillage
            </CyberButton>
          )}
        </CyberCard>
      </div>

      {/* Nuke */}
      <CyberCard className="border-destructive/30">
        <div className="flex items-center gap-4 mb-6">
          <Bomb className="w-8 h-8 text-destructive" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Nuke de salon</h2>
            <p className="text-sm text-muted-foreground">Supprime et recrée un salon pour effacer tout son historique</p>
          </div>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded p-3 mb-5">
          <p className="text-xs text-destructive font-body">⚠️ Action irréversible — tous les messages du salon seront définitivement supprimés. Le salon sera recréé à l'identique.</p>
        </div>
        <div className="flex gap-3">
          <CyberSelect value={nukeChannelId} onChange={e => setNukeChannelId(e.target.value)} className="flex-1">
            <option value="">— Sélectionner le salon à nuker —</option>
            {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </CyberSelect>
          <CyberButton variant="destructive" isLoading={nukePending} onClick={handleNuke} className="whitespace-nowrap">
            💥 Nuke
          </CyberButton>
        </div>
      </CyberCard>
    </div>
  );
}

/* ─────────────────── Messagerie ─────────────────── */
function MessagingTab({ guildId }: { guildId: string }) {
  const { data: channels } = useGetGuildChannels(guildId);
  const { data: members } = useGetGuildMembers(guildId);
  const { mutate: sendSay, isPending: sayPending } = useSendSay();
  const { mutate: sendAnnounce, isPending: annPending } = useSendAnnouncement();
  const { mutate: sendEmbed, isPending: embedPending } = useSendEmbed();
  const { mutate: sendDm, isPending: dmPending } = useSendDm();
  const { toast } = useToast();

  const [sayData,   setSayData]   = useState({ channelId: '', message: '' });
  const [annData,   setAnnData]   = useState({ channelId: '', title: '', message: '', pingEveryone: false });
  const [embedData, setEmbedData] = useState({ channelId: '', title: '', description: '', color: '#00F0FF' });
  const [dmData,    setDmData]    = useState({ userId: '', message: '' });

  const handleSay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sayData.channelId || !sayData.message) return;
    sendSay({ guildId, data: sayData }, {
      onSuccess: () => { toast({ title: 'Message envoyé' }); setSayData(p => ({ ...p, message: '' })); },
      onError: () => toast({ title: 'Erreur envoi', variant: 'destructive' }),
    });
  };

  const handleAnnounce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annData.channelId || !annData.title || !annData.message) return;
    sendAnnounce({ guildId, data: annData }, {
      onSuccess: () => { toast({ title: 'Annonce diffusée' }); setAnnData(p => ({ ...p, title: '', message: '' })); },
      onError: () => toast({ title: 'Erreur annonce', variant: 'destructive' }),
    });
  };

  const handleEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!embedData.channelId || !embedData.title || !embedData.description) return;
    sendEmbed({ guildId, data: embedData }, {
      onSuccess: () => { toast({ title: 'Embed envoyé' }); setEmbedData(p => ({ ...p, title: '', description: '' })); },
      onError: () => toast({ title: 'Erreur embed', variant: 'destructive' }),
    });
  };

  const handleDm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmData.userId || !dmData.message) return;
    sendDm({ guildId, data: dmData }, {
      onSuccess: r => { toast({ title: r.message }); setDmData(p => ({ ...p, message: '' })); },
      onError: () => toast({ title: 'Impossible d\'envoyer le MP (fermés ou bloqué)', variant: 'destructive' }),
    });
  };

  const ChannelSelect = ({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) => (
    <CyberSelect value={value} onChange={onChange} required>
      <option value="">— Choisir un salon —</option>
      {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
    </CyberSelect>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        {/* Message simple */}
        <CyberCard>
          <h2 className="text-lg font-bold text-primary mb-5">Envoyer un message</h2>
          <form onSubmit={handleSay} className="space-y-3">
            <ChannelSelect value={sayData.channelId} onChange={e => setSayData({ ...sayData, channelId: e.target.value })} />
            <textarea 
              className="w-full h-24 bg-background border border-primary/30 px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded resize-none"
              placeholder="Votre message…"
              value={sayData.message}
              onChange={e => setSayData({ ...sayData, message: e.target.value })}
              required
            />
            <CyberButton type="submit" isLoading={sayPending} className="w-full">Envoyer</CyberButton>
          </form>
        </CyberCard>

        {/* Annonce */}
        <CyberCard>
          <h2 className="text-lg font-bold mb-5" style={{ color: '#ffd700' }}>Annonce globale</h2>
          <form onSubmit={handleAnnounce} className="space-y-3">
            <ChannelSelect value={annData.channelId} onChange={e => setAnnData({ ...annData, channelId: e.target.value })} />
            <CyberInput placeholder="Titre de l'annonce" value={annData.title} onChange={e => setAnnData({ ...annData, title: e.target.value })} required />
            <textarea 
              className="w-full h-24 bg-background border border-primary/30 px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded resize-none"
              placeholder="Contenu de l'annonce…"
              value={annData.message}
              onChange={e => setAnnData({ ...annData, message: e.target.value })}
              required
            />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-primary" checked={annData.pingEveryone} onChange={e => setAnnData({ ...annData, pingEveryone: e.target.checked })} />
              <span className="font-body text-sm">Mentionner @everyone</span>
            </label>
            <CyberButton type="submit" isLoading={annPending} className="w-full" style={{ borderColor: '#ffd700', color: '#ffd700' }}>Diffuser l'annonce</CyberButton>
          </form>
        </CyberCard>

        {/* Message Privé (DM) */}
        <CyberCard>
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2" style={{ color: '#a78bfa' }}>
            <MessageSquare className="w-5 h-5" /> Message Privé (DM)
          </h2>
          <form onSubmit={handleDm} className="space-y-3">
            <div>
              <label className="block font-body text-xs text-muted-foreground uppercase tracking-widest mb-2">Membre destinataire</label>
              <CyberSelect value={dmData.userId} onChange={e => setDmData({ ...dmData, userId: e.target.value })} required>
                <option value="">— Choisir un membre —</option>
                {members?.map(m => <option key={m.id} value={m.id}>{m.displayName} ({m.username})</option>)}
              </CyberSelect>
            </div>
            <textarea 
              className="w-full h-24 bg-background border border-primary/30 px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded resize-none"
              placeholder="Message à envoyer en privé…"
              value={dmData.message}
              onChange={e => setDmData({ ...dmData, message: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">Le membre recevra un embed officiel au nom du serveur.</p>
            <CyberButton type="submit" isLoading={dmPending} className="w-full" style={{ borderColor: '#a78bfa', color: '#a78bfa' }}>Envoyer le MP</CyberButton>
          </form>
        </CyberCard>
      </div>

      {/* Embed */}
      <CyberCard>
        <h2 className="text-lg font-bold text-primary mb-5">Envoyer un Embed</h2>
        <form onSubmit={handleEmbed} className="space-y-3">
          <ChannelSelect value={embedData.channelId} onChange={e => setEmbedData({ ...embedData, channelId: e.target.value })} />
          <CyberInput placeholder="Titre de l'embed" value={embedData.title} onChange={e => setEmbedData({ ...embedData, title: e.target.value })} required />
          <div className="flex items-center gap-3">
            <label className="text-sm font-body text-muted-foreground whitespace-nowrap">Couleur :</label>
            <CyberInput placeholder="#00F0FF" value={embedData.color} onChange={e => setEmbedData({ ...embedData, color: e.target.value })} />
            <input type="color" className="w-11 h-11 bg-transparent border border-primary/30 cursor-pointer rounded" value={embedData.color} onChange={e => setEmbedData({ ...embedData, color: e.target.value })} />
          </div>
          <textarea 
            className="w-full h-48 bg-background border border-primary/30 px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded resize-none"
            placeholder="Description (Markdown supporté)…"
            value={embedData.description}
            onChange={e => setEmbedData({ ...embedData, description: e.target.value })}
            required
          />
          <CyberButton type="submit" isLoading={embedPending} className="w-full">Envoyer l'embed</CyberButton>
        </form>
      </CyberCard>
    </div>
  );
}

/* ─────────────────── Giveaways ─────────────────── */
function GiveawaysTab({ guildId }: { guildId: string }) {
  const { data: giveaways } = useGetGiveaways(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: createGiveaway, isPending: createPending } = useCreateGiveaway();
  const { mutate: endGiveaway, isPending: endPending } = useEndGiveaway();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({ channelId: '', prize: '', durationMinutes: 60, winnersCount: 1 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelId || !form.prize) return;
    createGiveaway({ guildId, data: { ...form, createdBy: 'Panel' } }, {
      onSuccess: () => {
        toast({ title: 'Giveaway créé !' });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/giveaways`] });
        setForm(p => ({ ...p, prize: '' }));
      }
    });
  };

  const handleEnd = (id: number) => {
    endGiveaway({ guildId, giveawayId: id }, {
      onSuccess: () => {
        toast({ title: 'Giveaway terminé' });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/giveaways`] });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <CyberCard className="lg:col-span-1 h-fit">
        <h2 className="text-lg font-bold text-primary mb-5">Nouveau Giveaway</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CyberSelect value={form.channelId} onChange={e => setForm({ ...form, channelId: e.target.value })} required>
            <option value="">— Choisir un salon —</option>
            {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </CyberSelect>
          <CyberInput placeholder="Prix / Récompense" value={form.prize} onChange={e => setForm({ ...form, prize: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-body text-muted-foreground mb-1">Durée (minutes)</label>
              <CyberInput type="number" min="1" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: parseInt(e.target.value) })} required />
            </div>
            <div>
              <label className="block text-xs font-body text-muted-foreground mb-1">Nombre de gagnants</label>
              <CyberInput type="number" min="1" value={form.winnersCount} onChange={e => setForm({ ...form, winnersCount: parseInt(e.target.value) })} required />
            </div>
          </div>
          <CyberButton type="submit" isLoading={createPending} className="w-full">Lancer le giveaway</CyberButton>
        </form>
      </CyberCard>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Giveaways actifs & passés</h2>
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {giveaways?.map(g => (
            <CyberCard key={g.id} className="p-4" noClip>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-base text-primary">{g.prize}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Fin : {format(new Date(g.endsAt), 'd MMM yyyy à HH:mm', { locale: fr })}</p>
                </div>
                <CyberBadge variant={g.ended ? 'outline' : 'primary'}>{g.ended ? 'TERMINÉ' : 'EN COURS'}</CyberBadge>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Participants : <span className="text-foreground font-semibold">{g.participants}</span> · Gagnants : <span className="text-foreground font-semibold">{g.winnersCount}</span>
                </p>
                {!g.ended && (
                  <CyberButton variant="destructive" onClick={() => handleEnd(g.id)} isLoading={endPending} className="text-xs px-3 py-2">Terminer</CyberButton>
                )}
              </div>
            </CyberCard>
          ))}
          {giveaways?.length === 0 && <p className="text-muted-foreground italic text-sm">Aucun giveaway trouvé.</p>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Questionnaires ─────────────────── */
function SurveysTab({ guildId }: { guildId: string }) {
  const { data: surveys } = useGetSurveys(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: createSurvey, isPending: createPending } = useCreateSurvey();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({ channelId: '', title: '', questions: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelId || !form.title || !form.questions) return;
    createSurvey({ guildId, data: { ...form, questions: form.questions.split('|').map(q => q.trim()).filter(Boolean) } }, {
      onSuccess: () => {
        toast({ title: 'Questionnaire lancé !' });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/surveys`] });
        setForm(p => ({ ...p, title: '', questions: '' }));
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <CyberCard className="lg:col-span-1 h-fit">
        <h2 className="text-lg font-bold text-primary mb-5">Nouveau questionnaire</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CyberSelect value={form.channelId} onChange={e => setForm({ ...form, channelId: e.target.value })} required>
            <option value="">— Choisir un salon —</option>
            {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </CyberSelect>
          <CyberInput placeholder="Titre du questionnaire" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-xs font-body text-muted-foreground mb-1">Questions (séparées par |)</label>
            <textarea 
              className="w-full h-32 bg-background border border-primary/30 px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded resize-none"
              placeholder="Quel est ton pseudo ? | Quel âge as-tu ? | Pourquoi rejoindre ?"
              value={form.questions}
              onChange={e => setForm({ ...form, questions: e.target.value })}
              required
            />
          </div>
          <CyberButton type="submit" isLoading={createPending} className="w-full">Lancer le questionnaire</CyberButton>
        </form>
      </CyberCard>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-lg font-bold text-foreground">Questionnaires actifs & passés</h2>
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {surveys?.map(s => (
            <CyberCard key={s.id} className="p-4" noClip>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-base text-primary">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Créé le {format(new Date(s.createdAt), 'd MMM yyyy', { locale: fr })}</p>
                </div>
                <CyberBadge variant={s.active ? 'primary' : 'outline'}>{s.active ? 'ACTIF' : 'FERMÉ'}</CyberBadge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/50 border border-primary/10 p-3 rounded text-center">
                  <span className="block text-[11px] font-display text-muted-foreground uppercase tracking-wider">Questions</span>
                  <span className="font-bold text-lg text-foreground">{s.questions.length}</span>
                </div>
                <div className="bg-background/50 border border-primary/10 p-3 rounded text-center">
                  <span className="block text-[11px] font-display text-muted-foreground uppercase tracking-wider">Réponses</span>
                  <span className="font-bold text-lg text-primary">{s.responseCount}</span>
                </div>
              </div>
            </CyberCard>
          ))}
          {surveys?.length === 0 && <p className="text-muted-foreground italic text-sm">Aucun questionnaire actif.</p>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Règles du serveur ─────────────────── */
function RulesTab({ guildId }: { guildId: string }) {
  const { data: rules, isLoading } = useGetGuildRules(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { data: roles } = useGetGuildRoles(guildId);
  const { mutate: sendRules, isPending: sending } = useSendGuildRules();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    channelId: '',
    title: 'Règles du serveur',
    description: '',
    memberRoleId: '',
  });

  React.useEffect(() => {
    if (rules) {
      setForm({
        channelId: rules.channelId || '',
        title: rules.title || 'Règles du serveur',
        description: rules.description || '',
        memberRoleId: rules.memberRoleId || '',
      });
    }
  }, [rules]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelId || !form.title || !form.description) return;
    sendRules({
      guildId,
      data: {
        channelId: form.channelId,
        title: form.title,
        description: form.description,
        memberRoleId: form.memberRoleId || null,
      }
    }, {
      onSuccess: () => {
        toast({ title: 'Règles publiées', description: 'Le message de règles a été envoyé ou mis à jour dans le salon sélectionné.' });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/rules`] });
      },
      onError: () => {
        toast({ title: 'Erreur', description: 'Impossible d\'envoyer les règles. Vérifiez que le bot est connecté.', variant: 'destructive' });
      }
    });
  };

  if (isLoading) return <p className="text-primary animate-pulse font-display text-sm">Chargement de la configuration des règles...</p>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <CyberCard>
        <h2 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5" /> Configuration des règles
        </h2>

        {rules?.messageId && (
          <div className="mb-5 p-3 bg-primary/10 border border-primary/30 rounded text-sm font-body text-primary/80">
            ✅ Un message de règles existe déjà. L'enregistrement le mettra à jour.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-body text-sm text-foreground mb-2">Salon de publication</label>
            <CyberSelect value={form.channelId} onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))} required>
              <option value="">— Choisir un salon —</option>
              {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </CyberSelect>
          </div>

          <div>
            <label className="block font-body text-sm text-foreground mb-2">Titre du message</label>
            <CyberInput
              placeholder="Règles du serveur"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block font-body text-sm text-foreground mb-2">Contenu des règles</label>
            <textarea
              className="w-full h-52 bg-background border border-primary/30 px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary rounded resize-none"
              placeholder="1. Respecter tous les membres&#10;2. Pas de spam ni publicité&#10;3. Contenu approprié uniquement&#10;..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block font-body text-sm text-foreground mb-2">
              Rôle à attribuer à l'acceptation <span className="text-muted-foreground text-xs">(optionnel)</span>
            </label>
            <CyberSelect value={form.memberRoleId} onChange={e => setForm(f => ({ ...f, memberRoleId: e.target.value }))}>
              <option value="">— Aucun rôle —</option>
              {roles?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </CyberSelect>
            <p className="text-xs text-muted-foreground mt-1.5">Ce rôle sera automatiquement assigné quand un membre clique sur "J'accepte les règles".</p>
          </div>

          <CyberButton type="submit" isLoading={sending} className="w-full">
            {rules?.messageId ? 'Mettre à jour les règles' : 'Publier les règles'}
          </CyberButton>
        </form>
      </CyberCard>

      <div className="space-y-6">
        <CyberCard>
          <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Configuration actuelle
          </h2>
          {rules ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/50 border border-primary/15 p-3 rounded">
                  <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1">Statut</p>
                  <CyberBadge variant={rules.enabled ? 'primary' : 'outline'}>{rules.enabled ? 'ACTIF' : 'INACTIF'}</CyberBadge>
                </div>
                <div className="bg-background/50 border border-primary/15 p-3 rounded">
                  <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1">Message envoyé</p>
                  <CyberBadge variant={rules.messageId ? 'primary' : 'outline'}>{rules.messageId ? 'OUI' : 'NON'}</CyberBadge>
                </div>
              </div>
              <div className="bg-background/50 border border-primary/15 p-3 rounded">
                <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1.5">Titre</p>
                <p className="text-sm font-semibold text-foreground">{rules.title}</p>
              </div>
              <div className="bg-background/50 border border-primary/15 p-3 rounded">
                <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1.5">Salon configuré</p>
                <p className="text-sm font-semibold text-primary">#{channels?.find(c => c.id === rules.channelId)?.name ?? rules.channelId}</p>
              </div>
              {rules.memberRoleId && (
                <div className="bg-background/50 border border-primary/15 p-3 rounded">
                  <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1.5">Rôle attribué</p>
                  <p className="text-sm font-semibold text-primary">@{roles?.find(r => r.id === rules.memberRoleId)?.name ?? rules.memberRoleId}</p>
                </div>
              )}
              <div className="bg-background/50 border border-primary/15 p-3 rounded">
                <p className="text-[11px] font-display text-muted-foreground uppercase tracking-widest mb-1.5">Dernière mise à jour</p>
                <p className="text-sm text-muted-foreground">{format(new Date(rules.updatedAt), 'd MMM yyyy à HH:mm', { locale: fr })}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-primary/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground italic">Aucune règle configurée.</p>
              <p className="text-xs text-muted-foreground mt-1">Remplissez le formulaire et publiez pour créer le premier message de règles.</p>
            </div>
          )}
        </CyberCard>

        <CyberCard className="border-primary/20">
          <h3 className="font-body text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Fonctionnement
          </h3>
          <ul className="space-y-2 text-xs font-body text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">▸</span> Le bot envoie un embed avec le titre et les règles dans le salon choisi.</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">▸</span> Un bouton "J'accepte les règles" est affiché sous le message.</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">▸</span> En cliquant, le membre reçoit automatiquement le rôle configuré.</li>
            <li className="flex items-start gap-2"><span className="text-primary mt-0.5">▸</span> La commande /rules setup est aussi disponible depuis Discord.</li>
          </ul>
        </CyberCard>
      </div>
    </div>
  );
}

/* ─────────────────── Journaux ─────────────────── */
const LOG_COLORS: Record<string, string> = {
  BAN: 'destructive',
  KICK: 'destructive',
  MASSBAN: 'destructive',
  NUKE: 'destructive',
  MUTE: 'outline',
  UNMUTE: 'outline',
  WARN: 'primary',
  UNWARN: 'primary',
  UNBAN: 'primary',
  BREACH: 'destructive',
  MAINTENANCE: 'outline',
  CLEAR: 'outline',
  DM: 'outline',
  SAY: 'outline',
  EMBED: 'outline',
  ANNOUNCE: 'outline',
};

function LogsTab({ guildId }: { guildId: string }) {
  const { data: logs, isLoading } = useGetGuildLogs(guildId, { limit: 200 });
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  const actionTypes = useMemo(() => {
    if (!logs) return [];
    const types = [...new Set(logs.map(l => l.action))].sort();
    return types;
  }, [logs]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => {
      const matchAction = !filter || l.action === filter;
      const q = search.toLowerCase();
      const matchSearch = !q || 
        l.action.toLowerCase().includes(q) ||
        (l.targetName ?? '').toLowerCase().includes(q) ||
        (l.moderatorName ?? '').toLowerCase().includes(q) ||
        (l.details ?? '').toLowerCase().includes(q);
      return matchAction && matchSearch;
    });
  }, [logs, filter, search]);

  if (isLoading) return <p className="text-primary animate-pulse font-display text-sm">Chargement des journaux...</p>;

  return (
    <CyberCard>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">
          <ListOrdered className="w-5 h-5" /> Journal d'activité
          <span className="text-xs font-normal text-muted-foreground ml-1">({filtered.length} entrées)</span>
        </h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-background border border-primary/30 rounded text-xs font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-44"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-background border border-primary/30 rounded text-xs font-body text-foreground focus:outline-none focus:border-primary appearance-none"
            >
              <option value="">Toutes les actions</option>
              {actionTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground font-display tracking-widest bg-background/50 border-y border-primary/20">
            <tr>
              <th className="px-4 py-3">Date / Heure</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Cible</th>
              <th className="px-4 py-3">Modérateur</th>
              <th className="px-4 py-3">Détails</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 font-display text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.createdAt), 'dd/MM HH:mm:ss')}
                </td>
                <td className="px-4 py-3">
                  <CyberBadge variant={(LOG_COLORS[log.action] as any) ?? 'outline'}>
                    {log.action}
                  </CyberBadge>
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">{log.targetName || '—'}</td>
                <td className="px-4 py-3 text-primary text-sm">{log.moderatorName || 'SYSTÈME'}</td>
                <td className="px-4 py-3 text-muted-foreground text-sm max-w-xs truncate" title={log.details || ''}>{log.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-muted-foreground italic text-sm text-center">
            {logs?.length === 0 ? 'Aucun événement enregistré.' : 'Aucun résultat pour ces filtres.'}
          </p>
        )}
      </div>
    </CyberCard>
  );
}

/* ─────────────────── Bienvenue / Au revoir ─────────────────── */
function WelcomeTab({ guildId }: { guildId: string }) {
  const { data: config, isLoading } = useGetGuildConfig(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: updateConfig, isPending } = useUpdateGuildConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [welcome, setWelcome] = useState({ channelId: '', message: 'Bienvenue {user} sur **{server}** ! 👋' });
  const [goodbye, setGoodbye] = useState({ channelId: '', message: '**{username}** a quitté **{server}**. 👋' });

  React.useEffect(() => {
    if (config) {
      setWelcome({ channelId: config.welcomeChannelId || '', message: config.welcomeMessage || 'Bienvenue {user} sur **{server}** ! 👋' });
      setGoodbye({ channelId: config.goodbyeChannelId || '', message: config.goodbyeMessage || '**{username}** a quitté **{server}**. 👋' });
    }
  }, [config]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      guildId,
      data: {
        welcomeChannelId: welcome.channelId || null,
        welcomeMessage: welcome.message || null,
        goodbyeChannelId: goodbye.channelId || null,
        goodbyeMessage: goodbye.message || null,
      } as any,
    }, {
      onSuccess: () => {
        toast({ title: 'Messages configurés', description: 'Les messages de bienvenue et au revoir ont été enregistrés.' });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/config`] });
      },
      onError: () => toast({ title: 'Erreur', variant: 'destructive' }),
    });
  };

  if (isLoading) return <p className="text-primary animate-pulse text-sm">Chargement...</p>;

  const placeholder = (
    <p className="text-xs text-muted-foreground mt-2 font-display tracking-wide">
      Variables disponibles : <code className="text-primary">{'{user}'}</code> → mention •{' '}
      <code className="text-primary">{'{username}'}</code> → nom •{' '}
      <code className="text-primary">{'{server}'}</code> → nom du serveur
    </p>
  );

  return (
    <form onSubmit={save} className="space-y-5 max-w-2xl">

      {/* Bienvenue */}
      <CyberCard>
        <h2 className="text-base sm:text-lg font-bold text-primary mb-5 flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Message de bienvenue
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block font-body text-sm text-foreground mb-2">Salon de bienvenue</label>
            <CyberSelect value={welcome.channelId} onChange={e => setWelcome(w => ({ ...w, channelId: e.target.value }))}>
              <option value="">— Désactivé —</option>
              {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </CyberSelect>
          </div>
          <div>
            <label className="block font-body text-sm text-foreground mb-2">Message de bienvenue</label>
            <textarea
              value={welcome.message}
              onChange={e => setWelcome(w => ({ ...w, message: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-primary/30 rounded font-body text-sm text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="Bienvenue {user} sur **{server}** ! 👋"
            />
            {placeholder}
          </div>

          {/* Aperçu */}
          {welcome.message && (
            <div className="bg-[#313338] rounded p-3 border border-white/10">
              <p className="text-[10px] text-white/30 font-display mb-1.5 uppercase tracking-widest">Aperçu Discord</p>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/40 shrink-0 flex items-center justify-center text-[11px] font-bold text-primary">A</div>
                <div>
                  <span className="text-white/80 text-xs font-semibold">Astral Bot</span>
                  <p className="text-white text-sm mt-0.5">{welcome.message.replace(/{user}/g, '@NouveauMembre').replace(/{username}/g, 'NouveauMembre').replace(/{server}/g, 'Mon Serveur')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CyberCard>

      {/* Au revoir */}
      <CyberCard>
        <h2 className="text-base sm:text-lg font-bold text-orange-400 mb-5 flex items-center gap-2">
          <Users className="w-5 h-5" /> Message d'au revoir
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block font-body text-sm text-foreground mb-2">Salon d'au revoir</label>
            <CyberSelect value={goodbye.channelId} onChange={e => setGoodbye(g => ({ ...g, channelId: e.target.value }))}>
              <option value="">— Désactivé —</option>
              {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </CyberSelect>
          </div>
          <div>
            <label className="block font-body text-sm text-foreground mb-2">Message d'au revoir</label>
            <textarea
              value={goodbye.message}
              onChange={e => setGoodbye(g => ({ ...g, message: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-primary/30 rounded font-body text-sm text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="**{username}** a quitté **{server}**. 👋"
            />
            {placeholder}
          </div>

          {/* Aperçu */}
          {goodbye.message && (
            <div className="bg-[#313338] rounded p-3 border border-white/10">
              <p className="text-[10px] text-white/30 font-display mb-1.5 uppercase tracking-widest">Aperçu Discord</p>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-400/40 shrink-0 flex items-center justify-center text-[11px] font-bold text-orange-400">A</div>
                <div>
                  <span className="text-white/80 text-xs font-semibold">Astral Bot</span>
                  <p className="text-white text-sm mt-0.5">{goodbye.message.replace(/{user}/g, '@Membre').replace(/{username}/g, 'Membre').replace(/{server}/g, 'Mon Serveur')}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CyberCard>

      <CyberButton type="submit" isLoading={isPending} className="w-full">Enregistrer les messages</CyberButton>
    </form>
  );
}
