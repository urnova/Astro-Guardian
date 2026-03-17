import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { format } from 'date-fns';
import { 
  Activity, ShieldAlert, Settings, MessageSquare, 
  Gift, CheckSquare, ListOrdered, Wrench, Shield, AlertTriangle 
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

export default function GuildView() {
  const [, params] = useRoute('/guilds/:guildId');
  const guildId = params?.guildId || '';
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { id: Tab, label: string, icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'config', label: 'Config', icon: <Settings className="w-4 h-4" /> },
    { id: 'moderation', label: 'Moderation', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'messaging', label: 'Messaging', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'giveaways', label: 'Giveaways', icon: <Gift className="w-4 h-4" /> },
    { id: 'surveys', label: 'Surveys', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'logs', label: 'Logs', icon: <ListOrdered className="w-4 h-4" /> },
  ];

  if (!guildId) return <div>Invalid Guild</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between border-b border-primary/20 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">NETWORK CONTROL</h1>
          <p className="text-primary font-display text-sm tracking-widest mt-1">ID: {guildId}</p>
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-display tracking-widest text-sm uppercase transition-all cyber-clip whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-primary/20 text-primary border border-primary shadow-[0_0_15px_rgba(0,240,255,0.2)]' 
                : 'bg-background border border-primary/20 text-muted-foreground hover:border-primary/50 hover:text-primary'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeTab === 'overview' && <OverviewTab guildId={guildId} />}
        {activeTab === 'config' && <ConfigTab guildId={guildId} />}
        {activeTab === 'moderation' && <ModerationTab guildId={guildId} />}
        {activeTab === 'security' && <SecurityTab guildId={guildId} />}
        {activeTab === 'messaging' && <MessagingTab guildId={guildId} />}
        {activeTab === 'giveaways' && <GiveawaysTab guildId={guildId} />}
        {activeTab === 'surveys' && <SurveysTab guildId={guildId} />}
        {activeTab === 'logs' && <LogsTab guildId={guildId} />}
      </div>
    </div>
  );
}

function OverviewTab({ guildId }: { guildId: string }) {
  const { data: stats, isLoading } = useGetGuildStats(guildId);

  if (isLoading) return <div className="text-primary animate-pulse font-display">SCANNING SECTOR...</div>;
  if (!stats) return null;

  const statItems = [
    { label: "Total Members", value: stats.memberCount, icon: <Activity className="w-5 h-5 text-primary" /> },
    { label: "Active Channels", value: stats.channelCount, icon: <ListOrdered className="w-5 h-5 text-primary" /> },
    { label: "Security Warns", value: stats.warnCount, icon: <ShieldAlert className="w-5 h-5 text-destructive" /> },
    { label: "Banned Words", value: stats.bannedWordCount, icon: <AlertTriangle className="w-5 h-5 text-destructive" /> },
    { label: "Giveaways", value: stats.giveawayCount, icon: <Gift className="w-5 h-5 text-primary" /> },
    { label: "Active Surveys", value: stats.surveyCount, icon: <CheckSquare className="w-5 h-5 text-primary" /> },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {statItems.map((item, idx) => (
        <CyberCard key={idx} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm text-muted-foreground">{item.label}</h3>
            {item.icon}
          </div>
          <div className="text-4xl font-display font-bold text-foreground text-glow">{item.value}</div>
        </CyberCard>
      ))}
    </div>
  );
}

function ConfigTab({ guildId }: { guildId: string }) {
  const { data: config, isLoading } = useGetGuildConfig(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: updateConfig, isPending } = useUpdateGuildConfig();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    logChannelId: '',
    surveyChannelId: '',
    automodEnabled: true,
    antiRaidEnabled: true,
    antiSpamEnabled: true,
    maxMentions: 5,
    maxMessagesPerMinute: 10
  });

  React.useEffect(() => {
    if (config) {
      setFormData({
        logChannelId: config.logChannelId || '',
        surveyChannelId: config.surveyChannelId || '',
        automodEnabled: config.automodEnabled,
        antiRaidEnabled: config.antiRaidEnabled,
        antiSpamEnabled: config.antiSpamEnabled,
        maxMentions: config.maxMentions,
        maxMessagesPerMinute: config.maxMessagesPerMinute
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({ 
      guildId, 
      data: {
        ...formData,
        logChannelId: formData.logChannelId || null,
        surveyChannelId: formData.surveyChannelId || null
      } 
    }, {
      onSuccess: () => {
        toast({ title: "CONFIGURATION SAVED", description: "System parameters updated successfully." });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/config`] });
      }
    });
  };

  if (isLoading) return <div className="text-primary animate-pulse">LOADING CONFIGURATION...</div>;

  return (
    <CyberCard className="max-w-2xl">
      <h2 className="text-xl font-display font-bold text-primary mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5" /> SYSTEM PARAMETERS
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block font-display text-xs text-muted-foreground mb-2">Log Output Channel</label>
            <CyberSelect 
              value={formData.logChannelId} 
              onChange={e => setFormData(f => ({ ...f, logChannelId: e.target.value }))}
            >
              <option value="">-- Disabled --</option>
              {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </CyberSelect>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-display text-xs text-muted-foreground mb-2">Max Mentions</label>
              <CyberInput 
                type="number" 
                value={formData.maxMentions} 
                onChange={e => setFormData(f => ({ ...f, maxMentions: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block font-display text-xs text-muted-foreground mb-2">Max Msgs / Minute</label>
              <CyberInput 
                type="number" 
                value={formData.maxMessagesPerMinute} 
                onChange={e => setFormData(f => ({ ...f, maxMessagesPerMinute: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-primary/20 space-y-4">
            <h3 className="font-display text-sm text-primary">Automated Defenses</h3>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-primary bg-background border-primary"
                checked={formData.automodEnabled}
                onChange={e => setFormData(f => ({ ...f, automodEnabled: e.target.checked }))}
              />
              <span className="font-body text-foreground">Auto-Moderation (Filter banned words)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-primary bg-background border-primary"
                checked={formData.antiRaidEnabled}
                onChange={e => setFormData(f => ({ ...f, antiRaidEnabled: e.target.checked }))}
              />
              <span className="font-body text-foreground">Anti-Raid Protection (Block mass joins)</span>
            </label>
          </div>
        </div>

        <div className="pt-6">
          <CyberButton type="submit" isLoading={isPending} className="w-full">Save Configuration</CyberButton>
        </div>
      </form>
    </CyberCard>
  );
}

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
        <h2 className="text-xl font-display font-bold text-destructive mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> BANNED WORDS
        </h2>
        <form onSubmit={handleAddWord} className="flex gap-2 mb-6">
          <CyberInput 
            placeholder="Enter word to filter..." 
            value={newWord}
            onChange={e => setNewWord(e.target.value)}
          />
          <CyberButton type="submit" isLoading={addingWord}>Add</CyberButton>
        </form>
        
        <div className="flex flex-wrap gap-2">
          {words?.map(w => (
            <div key={w.id} className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 px-3 py-1.5 cyber-clip group">
              <span className="font-body text-destructive">{w.word}</span>
              <button 
                onClick={() => handleDeleteWord(w.id)}
                className="text-destructive/50 hover:text-destructive transition-colors ml-2"
              >
                ×
              </button>
            </div>
          ))}
          {words?.length === 0 && <span className="text-muted-foreground italic text-sm">No filters active.</span>}
        </div>
      </CyberCard>

      <CyberCard>
        <h2 className="text-xl font-display font-bold text-primary mb-6 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> RECENT WARNINGS
        </h2>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {warns?.map(w => (
            <div key={w.id} className="bg-background/50 border border-primary/20 p-4 cyber-clip">
              <div className="flex justify-between items-start mb-2">
                <span className="font-display text-primary font-bold">{w.username}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(w.createdAt), 'PP p')}</span>
              </div>
              <p className="text-sm text-foreground mb-2">{w.reason}</p>
              <p className="text-xs text-muted-foreground text-right">By {w.moderatorName}</p>
            </div>
          ))}
          {warns?.length === 0 && <p className="text-muted-foreground italic">No warnings issued.</p>}
        </div>
      </CyberCard>
    </div>
  );
}

function SecurityTab({ guildId }: { guildId: string }) {
  const { data: config } = useGetGuildConfig(guildId);
  const { mutate: toggleMaintenance, isPending: maintPending } = useTriggerMaintenance();
  const { mutate: toggleBreach, isPending: breachPending } = useTriggerBreach();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleMaintenance = (enabled: boolean) => {
    toggleMaintenance({ guildId, data: { enabled, reason: "System maintenance via panel" } }, {
      onSuccess: () => {
        toast({ title: enabled ? "MAINTENANCE INITIATED" : "MAINTENANCE LIFTED" });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/config`] });
      }
    });
  };

  const handleBreach = (enabled: boolean) => {
    if (enabled && !confirm("WARNING: This will lock down the entire server. Proceed?")) return;
    toggleBreach({ guildId, data: { enabled, reason: "Security breach detected via panel" } }, {
      onSuccess: () => {
        toast({ 
          title: enabled ? "BREACH PROTOCOL ENGAGED" : "BREACH PROTOCOL LIFTED",
          variant: enabled ? "destructive" : "default" 
        });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/config`] });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <CyberCard glowing={config?.maintenanceMode}>
        <div className="flex items-center gap-4 mb-6">
          <Wrench className={`w-8 h-8 ${config?.maintenanceMode ? 'text-primary animate-spin' : 'text-muted-foreground'}`} />
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">MAINTENANCE MODE</h2>
            <p className="text-sm text-muted-foreground">Suspend user access for technical updates</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-background/50 border border-primary/20 cyber-clip mb-6">
          <span className="font-display tracking-widest text-sm">STATUS</span>
          {config?.maintenanceMode ? (
            <CyberBadge variant="primary" className="animate-pulse">ACTIVE</CyberBadge>
          ) : (
            <CyberBadge variant="outline">STANDBY</CyberBadge>
          )}
        </div>
        {config?.maintenanceMode ? (
          <CyberButton variant="outline" className="w-full" onClick={() => handleMaintenance(false)} isLoading={maintPending}>
            RESTORE OPERATIONS
          </CyberButton>
        ) : (
          <CyberButton className="w-full" onClick={() => handleMaintenance(true)} isLoading={maintPending}>
            INITIATE MAINTENANCE
          </CyberButton>
        )}
      </CyberCard>

      <CyberCard glowing={config?.breachMode} className={config?.breachMode ? 'box-glow-destructive border-destructive/50' : ''}>
        <div className="flex items-center gap-4 mb-6">
          <ShieldAlert className={`w-8 h-8 ${config?.breachMode ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`} />
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">BREACH PROTOCOL</h2>
            <p className="text-sm text-muted-foreground">Emergency full server lockdown</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-background/50 border border-primary/20 cyber-clip mb-6">
          <span className="font-display tracking-widest text-sm">STATUS</span>
          {config?.breachMode ? (
            <CyberBadge variant="destructive" className="animate-pulse">CRITICAL</CyberBadge>
          ) : (
            <CyberBadge variant="outline">SECURE</CyberBadge>
          )}
        </div>
        {config?.breachMode ? (
          <CyberButton variant="primary" className="w-full" onClick={() => handleBreach(false)} isLoading={breachPending}>
            RESOLVE BREACH
          </CyberButton>
        ) : (
          <CyberButton variant="destructive" className="w-full" onClick={() => handleBreach(true)} isLoading={breachPending}>
            ENGAGE LOCKDOWN
          </CyberButton>
        )}
      </CyberCard>
    </div>
  );
}

function MessagingTab({ guildId }: { guildId: string }) {
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: sendSay, isPending: sayPending } = useSendSay();
  const { mutate: sendAnnounce, isPending: annPending } = useSendAnnouncement();
  const { mutate: sendEmbed, isPending: embedPending } = useSendEmbed();
  const { toast } = useToast();

  const [sayData, setSayData] = useState({ channelId: '', message: '' });
  const [annData, setAnnData] = useState({ channelId: '', title: '', message: '', pingEveryone: false });
  const [embedData, setEmbedData] = useState({ channelId: '', title: '', description: '', color: '#00F0FF' });

  const handleSay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sayData.channelId || !sayData.message) return;
    sendSay({ guildId, data: sayData }, {
      onSuccess: () => {
        toast({ title: "TRANSMISSION SENT" });
        setSayData(p => ({ ...p, message: '' }));
      }
    });
  };

  const handleAnnounce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annData.channelId || !annData.title || !annData.message) return;
    sendAnnounce({ guildId, data: annData }, {
      onSuccess: () => {
        toast({ title: "ANNOUNCEMENT BROADCASTED" });
        setAnnData(p => ({ ...p, title: '', message: '' }));
      }
    });
  };

  const handleEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!embedData.channelId || !embedData.title || !embedData.description) return;
    sendEmbed({ guildId, data: embedData }, {
      onSuccess: () => {
        toast({ title: "HOLOGRAPHIC DATA SENT" });
        setEmbedData(p => ({ ...p, title: '', description: '' }));
      }
    });
  };

  const ChannelSelect = ({ value, onChange }: any) => (
    <CyberSelect value={value} onChange={onChange} required>
      <option value="">-- Select Target Vector --</option>
      {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
    </CyberSelect>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <CyberCard>
          <h2 className="text-xl font-display font-bold text-primary mb-6">RAW TRANSMISSION</h2>
          <form onSubmit={handleSay} className="space-y-4">
            <ChannelSelect value={sayData.channelId} onChange={(e:any) => setSayData({...sayData, channelId: e.target.value})} />
            <textarea 
              className="w-full h-24 bg-background border border-primary/30 px-4 py-3 font-body text-foreground focus:outline-none focus:border-primary cyber-clip resize-none"
              placeholder="Enter raw message..."
              value={sayData.message}
              onChange={e => setSayData({...sayData, message: e.target.value})}
              required
            />
            <CyberButton type="submit" isLoading={sayPending} className="w-full">Transmit</CyberButton>
          </form>
        </CyberCard>

        <CyberCard>
          <h2 className="text-xl font-display font-bold text-[#ffd700] mb-6">GLOBAL ANNOUNCEMENT</h2>
          <form onSubmit={handleAnnounce} className="space-y-4">
            <ChannelSelect value={annData.channelId} onChange={(e:any) => setAnnData({...annData, channelId: e.target.value})} />
            <CyberInput 
              placeholder="Alert Title" 
              value={annData.title}
              onChange={e => setAnnData({...annData, title: e.target.value})}
              required
            />
            <textarea 
              className="w-full h-24 bg-background border border-primary/30 px-4 py-3 font-body text-foreground focus:outline-none focus:border-primary cyber-clip resize-none"
              placeholder="Alert Content..."
              value={annData.message}
              onChange={e => setAnnData({...annData, message: e.target.value})}
              required
            />
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-primary"
                checked={annData.pingEveryone}
                onChange={e => setAnnData({...annData, pingEveryone: e.target.checked})}
              />
              <span className="font-body">Ping @everyone</span>
            </label>
            <CyberButton type="submit" isLoading={annPending} className="w-full" style={{ borderColor: '#ffd700', color: '#ffd700' }}>Broadcast Alert</CyberButton>
          </form>
        </CyberCard>
      </div>

      <CyberCard>
        <h2 className="text-xl font-display font-bold text-primary mb-6">HOLOGRAPHIC EMBED</h2>
        <form onSubmit={handleEmbed} className="space-y-4">
          <ChannelSelect value={embedData.channelId} onChange={(e:any) => setEmbedData({...embedData, channelId: e.target.value})} />
          <CyberInput 
            placeholder="Embed Title" 
            value={embedData.title}
            onChange={e => setEmbedData({...embedData, title: e.target.value})}
            required
          />
          <div className="flex items-center gap-4">
            <label className="text-sm font-display text-muted-foreground whitespace-nowrap">HEX Color:</label>
            <CyberInput 
              type="text"
              placeholder="#00F0FF" 
              value={embedData.color}
              onChange={e => setEmbedData({...embedData, color: e.target.value})}
            />
            <input type="color" className="w-12 h-12 bg-transparent cursor-pointer" value={embedData.color} onChange={e => setEmbedData({...embedData, color: e.target.value})} />
          </div>
          <textarea 
            className="w-full h-48 bg-background border border-primary/30 px-4 py-3 font-body text-foreground focus:outline-none focus:border-primary cyber-clip resize-none"
            placeholder="Embed Description (Markdown supported)..."
            value={embedData.description}
            onChange={e => setEmbedData({...embedData, description: e.target.value})}
            required
          />
          <CyberButton type="submit" isLoading={embedPending} className="w-full">Compile & Send</CyberButton>
        </form>
      </CyberCard>
    </div>
  );
}

function GiveawaysTab({ guildId }: { guildId: string }) {
  const { data: giveaways } = useGetGiveaways(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: createGiveaway, isPending: createPending } = useCreateGiveaway();
  const { mutate: endGiveaway, isPending: endPending } = useEndGiveaway();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ channelId: '', prize: '', durationMinutes: 60, winnersCount: 1 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.channelId || !formData.prize) return;
    createGiveaway({ guildId, data: { ...formData, createdBy: 'Panel' } }, {
      onSuccess: () => {
        toast({ title: "REWARD PROTOCOL INITIATED" });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/giveaways`] });
        setFormData(p => ({ ...p, prize: '' }));
      }
    });
  };

  const handleEnd = (id: number) => {
    endGiveaway({ guildId, giveawayId: id }, {
      onSuccess: () => {
        toast({ title: "REWARD PROTOCOL TERMINATED" });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/giveaways`] });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <CyberCard className="lg:col-span-1 h-fit">
        <h2 className="text-xl font-display font-bold text-primary mb-6">NEW REWARD DROP</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CyberSelect value={formData.channelId} onChange={(e:any) => setFormData({...formData, channelId: e.target.value})} required>
            <option value="">-- Select Drop Zone --</option>
            {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </CyberSelect>
          <CyberInput 
            placeholder="Prize Designation" 
            value={formData.prize}
            onChange={e => setFormData({...formData, prize: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-display text-muted-foreground mb-1">Duration (Min)</label>
              <CyberInput type="number" min="1" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})} required />
            </div>
            <div>
              <label className="block text-xs font-display text-muted-foreground mb-1">Winners</label>
              <CyberInput type="number" min="1" value={formData.winnersCount} onChange={e => setFormData({...formData, winnersCount: parseInt(e.target.value)})} required />
            </div>
          </div>
          <CyberButton type="submit" isLoading={createPending} className="w-full mt-4">Initiate Drop</CyberButton>
        </form>
      </CyberCard>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-display font-bold text-foreground">ACTIVE & PAST DROPS</h2>
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {giveaways?.map(g => (
            <CyberCard key={g.id} className="p-4" noClip>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-display font-bold text-lg text-primary">{g.prize}</h3>
                  <p className="text-sm text-muted-foreground">Ends: {format(new Date(g.endsAt), 'PP p')}</p>
                </div>
                <CyberBadge variant={g.ended ? 'outline' : 'primary'}>
                  {g.ended ? 'CONCLUDED' : 'ACTIVE'}
                </CyberBadge>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-display text-muted-foreground">
                  Participants: <span className="text-foreground font-bold">{g.participants}</span> | 
                  Winners: <span className="text-foreground font-bold">{g.winnersCount}</span>
                </div>
                {!g.ended && (
                  <CyberButton variant="destructive" onClick={() => handleEnd(g.id)} isLoading={endPending}>Force End</CyberButton>
                )}
              </div>
            </CyberCard>
          ))}
          {giveaways?.length === 0 && <p className="text-muted-foreground italic">No reward drops found.</p>}
        </div>
      </div>
    </div>
  );
}

function SurveysTab({ guildId }: { guildId: string }) {
  const { data: surveys } = useGetSurveys(guildId);
  const { data: channels } = useGetGuildChannels(guildId);
  const { mutate: createSurvey, isPending: createPending } = useCreateSurvey();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ channelId: '', title: '', questions: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.channelId || !formData.title || !formData.questions) return;
    
    createSurvey({ 
      guildId, 
      data: { 
        ...formData, 
        questions: formData.questions.split('|').map(q => q.trim()).filter(Boolean) 
      } 
    }, {
      onSuccess: () => {
        toast({ title: "DATA COLLECTION INITIATED" });
        queryClient.invalidateQueries({ queryKey: [`/api/guilds/${guildId}/surveys`] });
        setFormData(p => ({ ...p, title: '', questions: '' }));
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <CyberCard className="lg:col-span-1 h-fit">
        <h2 className="text-xl font-display font-bold text-primary mb-6">NEW DATA COLLECTION</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CyberSelect value={formData.channelId} onChange={(e:any) => setFormData({...formData, channelId: e.target.value})} required>
            <option value="">-- Deploy Channel --</option>
            {channels?.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </CyberSelect>
          <CyberInput 
            placeholder="Collection Subject (Title)" 
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            required
          />
          <div>
            <label className="block text-xs font-display text-muted-foreground mb-1">Questions (separate with |)</label>
            <textarea 
              className="w-full h-32 bg-background border border-primary/30 px-4 py-3 font-body text-foreground focus:outline-none focus:border-primary cyber-clip resize-none"
              placeholder="What is your name? | How old are you? | Favorite color?"
              value={formData.questions}
              onChange={e => setFormData({...formData, questions: e.target.value})}
              required
            />
          </div>
          <CyberButton type="submit" isLoading={createPending} className="w-full mt-4">Deploy Form</CyberButton>
        </form>
      </CyberCard>

      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-display font-bold text-foreground">COLLECTION VECTORS</h2>
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {surveys?.map(s => (
            <CyberCard key={s.id} className="p-4" noClip>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-display font-bold text-lg text-primary">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">Deployed: {format(new Date(s.createdAt), 'PP')}</p>
                </div>
                <CyberBadge variant={s.active ? 'primary' : 'outline'}>
                  {s.active ? 'ACTIVE' : 'CLOSED'}
                </CyberBadge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/50 border border-primary/10 p-3 cyber-clip text-center">
                  <span className="block font-display text-xs text-muted-foreground">QUESTIONS</span>
                  <span className="font-display font-bold text-lg text-foreground">{s.questions.length}</span>
                </div>
                <div className="bg-background/50 border border-primary/10 p-3 cyber-clip text-center">
                  <span className="block font-display text-xs text-muted-foreground">RESPONSES</span>
                  <span className="font-display font-bold text-lg text-primary">{s.responseCount}</span>
                </div>
              </div>
            </CyberCard>
          ))}
          {surveys?.length === 0 && <p className="text-muted-foreground italic">No data collection forms active.</p>}
        </div>
      </div>
    </div>
  );
}

function LogsTab({ guildId }: { guildId: string }) {
  const { data: logs, isLoading } = useGetGuildLogs(guildId, { limit: 100 });

  if (isLoading) return <div className="text-primary animate-pulse font-display">DECRYPTING LOGS...</div>;

  return (
    <CyberCard>
      <h2 className="text-xl font-display font-bold text-primary mb-6">SYSTEM ACTIVITY LOG</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground font-display tracking-widest bg-background/50 border-y border-primary/20">
            <tr>
              <th className="px-4 py-3">TIMESTAMP</th>
              <th className="px-4 py-3">ACTION</th>
              <th className="px-4 py-3">TARGET</th>
              <th className="px-4 py-3">OFFICER</th>
              <th className="px-4 py-3">DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map(log => (
              <tr key={log.id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 font-display text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.createdAt), 'MM/dd HH:mm:ss')}
                </td>
                <td className="px-4 py-3">
                  <CyberBadge variant={log.action.includes('DELETE') || log.action.includes('BAN') || log.action.includes('KICK') ? 'destructive' : 'outline'}>
                    {log.action}
                  </CyberBadge>
                </td>
                <td className="px-4 py-3 font-bold text-foreground">{log.targetName || '-'}</td>
                <td className="px-4 py-3 text-primary">{log.moderatorName || 'SYSTEM'}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={log.details || ''}>{log.details || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs?.length === 0 && <p className="p-4 text-muted-foreground italic text-center">No system logs found.</p>}
      </div>
    </CyberCard>
  );
}
