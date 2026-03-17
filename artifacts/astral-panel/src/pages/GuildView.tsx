import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Activity, ShieldAlert, Settings, MessageSquare, 
  Gift, CheckSquare, ListOrdered, Wrench, Shield, AlertTriangle, Users, Hash
} from 'lucide-react';
import { 
  useGetGuildConfig, useUpdateGuildConfig, useGetGuildStats,
  useGetGuildChannels, useGetGuildWarns, useGetBannedWords,
  useAddBannedWord, useDeleteBannedWord, useGetGiveaways,
  useCreateGiveaway, useEndGiveaway, useGetSurveys,
  useCreateSurvey, useTriggerMaintenance, useTriggerBreach,
  useSendEmbed, useSendAnnouncement, useSendSay, useGetGuildLogs
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { CyberCard, CyberButton, CyberInput, CyberBadge, CyberSelect } from '@/components/CyberUI';
import { useToast } from '@/hooks/use-toast';

type Tab = 'overview' | 'config' | 'moderation' | 'security' | 'messaging' | 'giveaways' | 'surveys' | 'logs';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Vue d\'ensemble', icon: <Activity className="w-4 h-4" /> },
  { id: 'config',      label: 'Configuration',   icon: <Settings className="w-4 h-4" /> },
  { id: 'moderation',  label: 'Modération',       icon: <ShieldAlert className="w-4 h-4" /> },
  { id: 'security',    label: 'Sécurité',         icon: <Shield className="w-4 h-4" /> },
  { id: 'messaging',   label: 'Messagerie',       icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'giveaways',   label: 'Giveaways',        icon: <Gift className="w-4 h-4" /> },
  { id: 'surveys',     label: 'Questionnaires',   icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'logs',        label: 'Journaux',         icon: <ListOrdered className="w-4 h-4" /> },
];

export default function GuildView() {
  const [, params] = useRoute('/guilds/:guildId');
  const guildId = params?.guildId || '';
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!guildId) return <div className="text-destructive p-4">Serveur invalide.</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="border-b border-primary/20 pb-4">
        <h1 className="text-2xl font-bold text-foreground tracking-wide">Gestion du serveur</h1>
        <p className="text-xs font-display text-primary/60 mt-1 tracking-widest">ID : {guildId}</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1.5 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 font-body text-sm font-medium transition-all whitespace-nowrap rounded
              ${activeTab === tab.id 
                ? 'bg-primary/20 text-primary border border-primary/50' 
                : 'bg-background/60 border border-primary/15 text-muted-foreground hover:border-primary/40 hover:text-primary'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'overview'   && <OverviewTab   guildId={guildId} />}
        {activeTab === 'config'     && <ConfigTab     guildId={guildId} />}
        {activeTab === 'moderation' && <ModerationTab guildId={guildId} />}
        {activeTab === 'security'   && <SecurityTab   guildId={guildId} />}
        {activeTab === 'messaging'  && <MessagingTab  guildId={guildId} />}
        {activeTab === 'giveaways'  && <GiveawaysTab  guildId={guildId} />}
        {activeTab === 'surveys'    && <SurveysTab    guildId={guildId} />}
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
    { label: 'Salons actifs',       value: stats.channelCount,    icon: <Hash className="w-5 h-5 text-primary" /> },
    { label: 'Avertissements',      value: stats.warnCount,       icon: <ShieldAlert className="w-5 h-5 text-destructive" /> },
    { label: 'Mots bannis',         value: stats.bannedWordCount, icon: <AlertTriangle className="w-5 h-5 text-destructive" /> },
    { label: 'Giveaways',           value: stats.giveawayCount,   icon: <Gift className="w-5 h-5 text-primary" /> },
    { label: 'Questionnaires',      value: stats.surveyCount,     icon: <CheckSquare className="w-5 h-5 text-primary" /> },
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
  const { mutate: addWord, isPending: addingWord } = useAddBannedWord();
  const { mutate: delWord } = useDeleteBannedWord();
  const queryClient = useQueryClient();
  const [newWord, setNewWord] = useState('');

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    addWord({ guildId, data: { word: newWord } }, {
      onSuccess: () => {
        setNewWord('');
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/banned-words`] });
      }
    });
  };

  const handleDeleteWord = (id: number) => {
    delWord({ guildId, wordId: id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/banned-words`] })
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <CyberCard>
        <h2 className="text-lg font-bold text-destructive mb-5 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Mots bannis
        </h2>
        <form onSubmit={handleAddWord} className="flex gap-2 mb-5">
          <CyberInput 
            placeholder="Ajouter un mot à filtrer…" 
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
          />
          <CyberButton type="submit" isLoading={addingWord}>Ajouter</CyberButton>
        </form>
        <div className="flex flex-wrap gap-2">
          {words?.map(w => (
            <div key={w.id} className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 px-3 py-1.5 rounded">
              <span className="font-body text-sm text-destructive">{w.word}</span>
              <button onClick={() => handleDeleteWord(w.id)} className="text-destructive/50 hover:text-destructive transition-colors text-lg leading-none">×</button>
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
                <span className="text-xs text-muted-foreground">{format(new Date(w.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}</span>
              </div>
              <p className="text-sm text-foreground mb-1">{w.reason}</p>
              <p className="text-xs text-muted-foreground">Par {w.moderatorName}</p>
            </div>
          ))}
          {warns?.length === 0 && <p className="text-muted-foreground italic text-sm">Aucun avertissement émis.</p>}
        </div>
      </CyberCard>
    </div>
  );
}

/* ─────────────────── Sécurité ─────────────────── */
function SecurityTab({ guildId }: { guildId: string }) {
  const { data: config } = useGetGuildConfig(guildId);
  const { mutate: toggleMaintenance, isPending: maintPending } = useTriggerMaintenance();
  const { mutate: toggleBreach, isPending: breachPending } = useTriggerBreach();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  return (
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
  );
}

/* ─────────────────── Messagerie ─────────────────── */
function MessagingTab({ guildId }: { guildId: string }) {
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: sendSay, isPending: sayPending } = useSendSay();
  const { mutate: sendAnnounce, isPending: annPending } = useSendAnnouncement();
  const { mutate: sendEmbed, isPending: embedPending } = useSendEmbed();
  const { toast } = useToast();

  const [sayData,   setSayData]   = useState({ channelId: '', message: '' });
  const [annData,   setAnnData]   = useState({ channelId: '', title: '', message: '', pingEveryone: false });
  const [embedData, setEmbedData] = useState({ channelId: '', title: '', description: '', color: '#00F0FF' });

  const handleSay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sayData.channelId || !sayData.message) return;
    sendSay({ guildId, data: sayData }, {
      onSuccess: () => { toast({ title: 'Message envoyé' }); setSayData(p => ({ ...p, message: '' })); }
    });
  };

  const handleAnnounce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annData.channelId || !annData.title || !annData.message) return;
    sendAnnounce({ guildId, data: annData }, {
      onSuccess: () => { toast({ title: 'Annonce diffusée' }); setAnnData(p => ({ ...p, title: '', message: '' })); }
    });
  };

  const handleEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!embedData.channelId || !embedData.title || !embedData.description) return;
    sendEmbed({ guildId, data: embedData }, {
      onSuccess: () => { toast({ title: 'Embed envoyé' }); setEmbedData(p => ({ ...p, title: '', description: '' })); }
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

/* ─────────────────── Journaux ─────────────────── */
function LogsTab({ guildId }: { guildId: string }) {
  const { data: logs, isLoading } = useGetGuildLogs(guildId, { limit: 100 });

  if (isLoading) return <p className="text-primary animate-pulse font-display text-sm">Chargement des journaux...</p>;

  return (
    <CyberCard>
      <h2 className="text-lg font-bold text-primary mb-5">Journal d'activité</h2>
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
            {logs?.map(log => (
              <tr key={log.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 font-display text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.createdAt), 'dd/MM HH:mm:ss')}
                </td>
                <td className="px-4 py-3">
                  <CyberBadge variant={log.action.includes('DELETE') || log.action.includes('BAN') || log.action.includes('KICK') ? 'destructive' : 'outline'}>
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
        {logs?.length === 0 && <p className="p-6 text-muted-foreground italic text-sm text-center">Aucun événement enregistré.</p>}
      </div>
    </CyberCard>
  );
}
