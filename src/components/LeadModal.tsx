import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import type { Lead, LeadSource, LeadStage, FollowUp } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { cn } from '@/lib/utils';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  onSave: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: number, lead: Partial<Lead>) => Promise<void>;
}

const SOURCES: LeadSource[] = ['walk-in', 'website', 'referral', 'social', 'other'];
const STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const FOLLOW_UP_TYPES: FollowUp['type'][] = ['call', 'email', 'meeting', 'other'];

let tempFollowUpId = 9000;

const labelClass = 'block text-sm font-medium text-foreground mb-2';
const textareaClass = cn(
  'flex min-h-[80px] w-full rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm',
  'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary',
  'disabled:cursor-not-allowed disabled:opacity-50 resize-none'
);

const LeadModal = ({ isOpen, onClose, lead, onSave, onUpdate }: LeadModalProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [source, setSource] = useState<LeadSource>('website');
  const [stage, setStage] = useState<LeadStage>('new');
  const [value, setValue] = useState<number | ''>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [newFollowUp, setNewFollowUp] = useState({ date: new Date().toISOString().slice(0, 10), type: 'call' as FollowUp['type'], notes: '', outcome: '' });

  useEffect(() => {
    if (lead) {
      setName(lead.name);
      setEmail(lead.email || '');
      setMobile(lead.mobile);
      setSource(lead.source);
      setStage(lead.stage);
      setValue(lead.value ?? '');
      setAssignedTo(lead.assignedTo || '');
      setNotes(lead.notes || '');
      setTagsStr((lead.tags || []).join(', '));
      setFollowUps(lead.followUps || []);
    } else {
      setName('');
      setEmail('');
      setMobile('');
      setSource('website');
      setStage('new');
      setValue('');
      setAssignedTo('');
      setNotes('');
      setTagsStr('');
      setFollowUps([]);
      setNewFollowUp({ date: new Date().toISOString().slice(0, 10), type: 'call', notes: '', outcome: '' });
    }
  }, [lead, isOpen]);

  const addFollowUp = () => {
    if (!newFollowUp.notes.trim()) return;
    const f: FollowUp = {
      id: tempFollowUpId++,
      date: newFollowUp.date,
      type: newFollowUp.type,
      notes: newFollowUp.notes.trim(),
      outcome: newFollowUp.outcome.trim() || undefined,
    };
    setFollowUps((prev) => [...prev, f]);
    setNewFollowUp({ date: new Date().toISOString().slice(0, 10), type: 'call', notes: '', outcome: '' });
  };

  const removeFollowUp = (id: number) => {
    setFollowUps((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) return;
    const tags = tagsStr.split(',').map((s) => s.trim()).filter(Boolean);
    
    let currentFollowUps = [...followUps];
    if (newFollowUp.notes.trim()) {
      const f: FollowUp = {
        id: tempFollowUpId++,
        date: newFollowUp.date,
        type: newFollowUp.type,
        notes: newFollowUp.notes.trim(),
        outcome: newFollowUp.outcome.trim() || undefined,
      };
      currentFollowUps.push(f);
    }
    
    setLoading(true);
    try {
      const payload = {
        organizationId: MOCK_ORGANIZATION_ID,
        name: name.trim(),
        email: email.trim() || undefined,
        mobile: mobile.trim(),
        source,
        stage,
        value: typeof value === 'number' ? value : (value ? Number(value) : undefined),
        assignedTo: assignedTo.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.length ? tags : undefined,
        followUps: currentFollowUps,
      };
      if (lead) {
        await onUpdate(lead.id, payload);
      } else {
        await onSave(payload);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <DialogHeader
          title={lead ? t('leads.editLead', 'Edit Lead') : t('leads.addLead', 'Add Lead')}
          onClose={onClose}
        />
        <DialogBody>
          <div className="p-4 sm:p-6 space-y-6">
            {/* Contact */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('leads.contact', 'Contact')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('leads.name', 'Name')} *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('leads.namePlaceholder', 'Company or contact name')} required />
                </div>
                <div>
                  <label className={labelClass}>{t('leads.mobile', 'Mobile')} *</label>
                  <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder={t('common.mobile', 'Mobile')} required />
                </div>
                <div>
                  <label className={labelClass}>{t('leads.email', 'Email')}</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('common.email', 'Email')} />
                </div>
                <div>
                  <label className={labelClass}>{t('leads.assignedTo', 'Assigned to')}</label>
                  <Input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder={t('leads.assignedPlaceholder', 'Sales person')} />
                </div>
              </div>
            </div>

            {/* Pipeline */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('leads.pipeline', 'Pipeline')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('leads.source', 'Source')}</label>
                  <Select value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>{t(`leads.source${s.charAt(0).toUpperCase() + s.slice(1).replace('-', '')}`, s)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('leads.stage', 'Stage')}</label>
                  <Select value={stage} onChange={(e) => setStage(e.target.value as LeadStage)}>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{t(`leads.stage${s.charAt(0).toUpperCase() + s.slice(1)}`, s)}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>{t('leads.value', 'Value')}</label>
                  <Input type="number" value={value} onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))} min={0} placeholder="0" />
                </div>
              </div>
            </div>

            {/* Tags & notes */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('leads.tagsAndNotes', 'Tags & notes')}
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelClass}>{t('leads.tags', 'Tags')}</label>
                  <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder={t('leads.tagsPlaceholder', 'Comma-separated tags')} />
                </div>
                <div>
                  <label className={labelClass}>{t('leads.notes', 'Notes')}</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} rows={2} placeholder={t('leads.notesPlaceholder', 'Notes')} />
                </div>
              </div>
            </div>

            {/* Follow-ups */}
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('leads.followUps', 'Follow-ups')}
              </p>
              {followUps.length > 0 && (
                <ul className="space-y-2">
                  {followUps.map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-2 text-sm bg-muted/30 dark:bg-muted/20 rounded-lg p-2">
                      <span className="text-foreground">{f.date} • {f.type}: {f.notes}{f.outcome ? ` (${f.outcome})` : ''}</span>
                      <button type="button" onClick={() => removeFollowUp(f.id)} className="text-destructive hover:underline text-xs shrink-0">{t('common.remove', 'Remove')}</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 items-end">
                <Input type="date" value={newFollowUp.date} onChange={(e) => setNewFollowUp((p) => ({ ...p, date: e.target.value }))} className="w-36" />
                <Select value={newFollowUp.type} onChange={(e) => setNewFollowUp((p) => ({ ...p, type: e.target.value as FollowUp['type'] }))} className="w-28">
                  {FOLLOW_UP_TYPES.map((tpe) => (<option key={tpe} value={tpe}>{tpe}</option>))}
                </Select>
                <Input 
                  value={newFollowUp.notes} 
                  onChange={(e) => setNewFollowUp((p) => ({ ...p, notes: e.target.value }))} 
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFollowUp(); } }}
                  placeholder={t('leads.followUpNotes', 'Notes')} 
                  className="flex-1 min-w-[120px]" 
                />
                <Input 
                  value={newFollowUp.outcome} 
                  onChange={(e) => setNewFollowUp((p) => ({ ...p, outcome: e.target.value }))} 
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFollowUp(); } }}
                  placeholder={t('leads.outcome', 'Outcome')} 
                  className="w-28" 
                />
                <Button type="button" variant="outline" size="sm" onClick={addFollowUp}>{t('leads.addFollowUp', 'Add')}</Button>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={!name.trim() || !mobile.trim()}>
            {lead ? t('common.update', 'Update') : t('common.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default LeadModal;
