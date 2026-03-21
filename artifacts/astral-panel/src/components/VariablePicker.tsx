import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Hash, AtSign, Zap } from 'lucide-react';

interface Channel { id: string; name: string; }
interface Role    { id: string; name: string; color?: number | null; }

interface Variable { label: string; value: string; category: string; }

interface VariablePickerProps {
  onInsert: (value: string) => void;
  channels?: Channel[];
  roles?: Role[];
  compact?: boolean;
}

const STATIC_VARS: Variable[] = [
  { category: 'Utilisateur', label: '{user}',        value: '{user}' },
  { category: 'Utilisateur', label: '{username}',    value: '{username}' },
  { category: 'Utilisateur', label: '{userTag}',     value: '{userTag}' },
  { category: 'Serveur',     label: '{server}',      value: '{server}' },
  { category: 'Serveur',     label: '{memberCount}', value: '{memberCount}' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Utilisateur': 'text-sky-400  border-sky-400/40  bg-sky-400/10',
  'Serveur':     'text-emerald-400 border-emerald-400/40 bg-emerald-400/10',
  'Salon':       'text-violet-400 border-violet-400/40 bg-violet-400/10',
  'Rôle':        'text-amber-400  border-amber-400/40  bg-amber-400/10',
};

export function VariablePicker({ onInsert, channels = [], roles = [], compact = false }: VariablePickerProps) {
  const [open, setOpen] = useState(false);

  const allVars: Variable[] = [
    ...STATIC_VARS,
    ...channels.slice(0, 20).map(c => ({
      category: 'Salon',
      label: `#${c.name}`,
      value: `<#${c.id}>`,
    })),
    ...roles.filter(r => r.name !== '@everyone').slice(0, 20).map(r => ({
      category: 'Rôle',
      label: `@${r.name}`,
      value: `<@&${r.id}>`,
    })),
  ];

  const grouped = allVars.reduce<Record<string, Variable[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] font-display text-muted-foreground/60 hover:text-primary transition-colors tracking-widest uppercase"
      >
        <Zap className="w-3 h-3" />
        Variables dynamiques
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="mt-2 border border-primary/20 bg-background/80 p-3 space-y-3">
          {Object.entries(grouped).map(([cat, vars]) => (
            <div key={cat}>
              <p className="text-[9px] font-display text-muted-foreground/50 tracking-widest uppercase mb-1.5 flex items-center gap-1">
                {cat === 'Salon' && <Hash className="w-2.5 h-2.5" />}
                {cat === 'Rôle'  && <AtSign className="w-2.5 h-2.5" />}
                {cat}
              </p>
              <div className="flex flex-wrap gap-1">
                {vars.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => onInsert(v.value)}
                    title={`Insérer : ${v.value}`}
                    className={`px-2 py-0.5 text-[10px] font-mono border transition-all duration-150 hover:scale-105 active:scale-95 cyber-clip-sm ${CATEGORY_COLORS[cat] ?? 'text-primary border-primary/40 bg-primary/10'}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Helper to insert a variable at cursor position in a textarea/input */
export function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  value: string,
  current: string,
  onChange: (s: string) => void
): void {
  const el = ref.current;
  if (!el) {
    onChange(current + value);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end   = el.selectionEnd   ?? current.length;
  const next  = current.slice(0, start) + value + current.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + value.length, start + value.length);
  });
}
