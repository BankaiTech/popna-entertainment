// Small building blocks shared by the LCO settings sections.
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { operatorSettingsApi, fieldErrors, type OperatorSettings } from '@/api/operatorSettings';
import { showError, showSuccess } from '@/utils/toast';
import { tr } from '@/lib/lt';

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="block font-medium mb-1">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-600 mt-1">{error}</span> : hint ? <span className="block text-xs text-muted-foreground mt-1">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  'w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60';

export function Toggle({ label, hint, checked, onChange, disabled }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-4 py-2 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span className="text-sm">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <input type="checkbox" className="mt-1 w-5 h-5 shrink-0" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** Loads the operator's settings, tracks edits, saves only the changed fields. */
export function useOperatorSettings() {
  const orgId = useAuthStore((s) => s.organizationId);
  const [saved, setSaved] = useState<OperatorSettings | null>(null);
  const [draft, setDraft] = useState<OperatorSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    operatorSettingsApi
      .get(orgId)
      .then((s) => {
        setSaved(s);
        setDraft(s);
      })
      .catch((err) => showError(err instanceof Error ? err.message : tr('Could not load settings')));
  }, [orgId]);

  const set = <K extends keyof OperatorSettings>(key: K, value: OperatorSettings[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const changes = useMemo(() => {
    if (!saved || !draft) return {};
    const out: Partial<OperatorSettings> = {};
    (Object.keys(draft) as (keyof OperatorSettings)[]).forEach((k) => {
      if (draft[k] !== saved[k]) (out as Record<string, unknown>)[k] = draft[k];
    });
    return out;
  }, [saved, draft]);

  const save = async (fields: (keyof OperatorSettings)[]) => {
    if (!orgId) return;
    const subset = Object.fromEntries(Object.entries(changes).filter(([k]) => fields.includes(k as keyof OperatorSettings)));
    if (Object.keys(subset).length === 0) return;
    setSaving(true);
    setErrors({});
    try {
      const updated = await operatorSettingsApi.update(orgId, subset);
      setSaved(updated);
      setDraft((d) => (d ? { ...d, ...Object.fromEntries(fields.map((f) => [f, updated[f]])) } : updated));
      showSuccess(tr('Saved'));
    } catch (err) {
      setErrors(fieldErrors(err));
      showError(err instanceof Error ? err.message : tr('Could not save'));
    } finally {
      setSaving(false);
    }
  };

  const dirty = (fields: (keyof OperatorSettings)[]) => fields.some((f) => f in changes);
  return { settings: draft, set, save, saving, errors, dirty };
}

export function SaveBar({ disabled, saving, onSave }: { disabled: boolean; saving: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end">
      <button type="button" onClick={onSave} disabled={disabled || saving}
        className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
        {saving ? tr('Saving…') : tr('Save changes')}
      </button>
    </div>
  );
}
