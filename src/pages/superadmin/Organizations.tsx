// App owner (platform admin) — manage operators: subscription, limits, modules, status.
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Building2, Check, Settings, Pencil, KeyRound, Trash2, Copy } from 'lucide-react';
import { useLt, type Lt } from '@/lib/lt';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { organizationsApi } from '@/api/organizations';
import type { Organization, OrganizationStatus, ModuleKey, SettingsTabKey } from '@/models/types';
import { formatDateIN, getSubscriptionState, todayInIndia } from '@/lib/subscription';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import {
    LCO_MODULES, LCO_SETTINGS_TABS, DEFAULT_OPERATOR_MODULES, DEFAULT_SETTINGS_TABS,
} from '@/config/lcoModules';

const DEFAULT_MODULES = DEFAULT_OPERATOR_MODULES;
const DEFAULT_TABS = DEFAULT_SETTINGS_TABS;

function addDays(iso: string, days: number) {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const emptyForm = () => {
    const today = todayInIndia();
    return {
        name: '', code: '', ownerName: '', ownerUsername: '', ownerPassword: '', ownerMobile: '',
        subscriptionStart: today, subscriptionEnd: addDays(today, 364), maxProviders: '', maxPlans: '',
    };
};
type FormState = ReturnType<typeof emptyForm>;

const limitValue = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v)));
const usage = (used?: number, max?: number | null) => `${used ?? 0} / ${max == null ? '∞' : max}`;

function SubscriptionBadge({ org, tr }: { org: Organization; tr: Lt }) {
    const state = org.subscriptionState ?? getSubscriptionState(org.subscriptionStart, org.subscriptionEnd);
    const days = org.daysLeft;
    let text = tr('Active');
    let tone = 'bg-green-50 text-green-700 border-green-200';
    if (state === 'expired') {
        text = tr('Expired');
        tone = 'bg-red-50 text-red-700 border-red-200';
    } else if (state === 'not_started') {
        text = tr('Not started');
        tone = 'bg-gray-50 text-gray-700 border-gray-200';
    } else if (!org.subscriptionEnd) {
        text = tr('No end date');
    } else if (days != null && days <= 15) {
        text = days === 0 ? tr('Ends today') : tr('{{n}} days left', { n: days });
        tone = 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap', tone)}>{text}</span>;
}

type ToggleItem = { key: string; label: string; ready?: boolean };

function ToggleGrid({ title, items, selected, onToggle, tr }: {
    title: string; items: ToggleItem[]; selected: string[]; onToggle: (key: string) => void; tr: Lt;
}) {
    return (
        <div>
            <h3 className="text-sm font-semibold mb-2">{title}</h3>
            <div className="grid grid-cols-2 gap-2">
                {items.map(({ key, label, ready = true }) => {
                    const on = ready && selected.includes(key);
                    return (
                        <button
                            key={key}
                            type="button"
                            disabled={!ready}
                            title={ready ? undefined : tr('Coming soon')}
                            onClick={() => onToggle(key)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left',
                                on
                                    ? 'bg-primary/10 text-primary border-primary'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            )}
                        >
                            {on ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                            {tr(label)}{!ready && <span className="ml-auto text-[10px] uppercase opacity-70">{tr('soon')}</span>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const Organizations = () => {
    const tr = useLt();
    // Only the app owner (super_admin) changes subscriptions, limits and modules.
    const canEdit = useAuthStore((s) => s.superAdminRole === 'super_admin');
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Organization | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);

    const [modulesOrg, setModulesOrg] = useState<Organization | null>(null);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [selectedTabs, setSelectedTabs] = useState<string[]>([]);

    // Owner password reset (the new password is shown once) and delete (inactive operators only).
    const [resetOrg, setResetOrg] = useState<Organization | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetResult, setResetResult] = useState<{ username: string; password: string } | null>(null);
    const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState('');

    const closeReset = () => { setResetOrg(null); setNewPassword(''); setResetResult(null); };
    const handleReset = async () => {
        if (!resetOrg) return;
        setSaving(true);
        try {
            setResetResult(await organizationsApi.resetOwnerPassword(resetOrg.id, newPassword.trim()));
        } catch (err) {
            showError(err instanceof Error ? err.message : tr('Something went wrong'));
        } finally {
            setSaving(false);
        }
    };
    const handleDelete = async () => {
        if (!deleteOrg) return;
        const ok = await run(() => organizationsApi.deleteWithData(deleteOrg.id, deleteConfirm.trim()),
            tr('Operator {{name}} deleted', { name: deleteOrg.name }));
        if (ok) { setDeleteOrg(null); setDeleteConfirm(''); }
    };

    const load = async () => {
        setLoading(true);
        try {
            setOrganizations(await organizationsApi.getAll());
        } catch (err) {
            showError(err instanceof Error ? err.message : tr('Could not load operators'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const run = async (action: () => Promise<unknown>, success: string) => {
        setSaving(true);
        try {
            await action();
            showSuccess(success);
            await load();
            return true;
        } catch (err) {
            showError(err instanceof Error ? err.message : tr('Something went wrong'));
            return false;
        } finally {
            setSaving(false);
        }
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setFormOpen(true);
    };

    const openEdit = (org: Organization) => {
        setEditing(org);
        setForm({
            ...emptyForm(),
            name: org.name,
            code: org.code ?? '',
            subscriptionStart: org.subscriptionStart || '',
            subscriptionEnd: org.subscriptionEnd || '',
            maxProviders: org.maxProviders == null ? '' : String(org.maxProviders),
            maxPlans: org.maxPlans == null ? '' : String(org.maxPlans),
        });
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (form.subscriptionStart && form.subscriptionEnd && form.subscriptionEnd < form.subscriptionStart) {
            showError(tr('End date must be after the start date.'));
            return;
        }
        const common = {
            name: form.name.trim(),
            subscriptionStart: form.subscriptionStart,
            subscriptionEnd: form.subscriptionEnd,
            maxProviders: limitValue(form.maxProviders),
            maxPlans: limitValue(form.maxPlans),
        };
        const ok = editing
            ? await run(() => organizationsApi.update(editing.id, common), tr('Operator updated'))
            : await run(
                () =>
                    organizationsApi.create({
                        ...common,
                        code: form.code.trim(),
                        status: 'active',
                        industryType: 'isp-cable',
                        allowedModules: DEFAULT_MODULES,
                        allowedSettingsTabs: DEFAULT_TABS,
                        ownerName: form.ownerName.trim(),
                        ownerUsername: form.ownerUsername.trim(),
                        ownerPassword: form.ownerPassword,
                        ownerMobile: form.ownerMobile.trim(),
                    }),
                tr('Operator created'),
            );
        if (ok) setFormOpen(false);
    };

    const openModules = (org: Organization) => {
        setModulesOrg(org);
        setSelectedModules(org.allowedModules.filter((m) => LCO_MODULES.some((x) => x.key === m && x.ready)));
        setSelectedTabs([...org.allowedSettingsTabs]);
    };

    const handleSaveModules = async () => {
        if (!modulesOrg) return;
        const ok = await run(async () => {
            await organizationsApi.updateModules(modulesOrg.id, selectedModules as ModuleKey[]);
            await organizationsApi.updateSettingsTabs(modulesOrg.id, selectedTabs as SettingsTabKey[]);
        }, tr('Modules updated'));
        if (ok) setModulesOrg(null);
    };

    const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

    const formValid =
        form.name.trim() !== '' &&
        (editing !== null ||
            (form.code.trim() !== '' && form.ownerUsername.trim() !== '' && form.ownerPassword.length >= 8));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-foreground">{tr('Operators')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {tr('Subscriptions, limits and modules for each cable / broadband operator')}
                    </p>
                </div>
                {canEdit && (
                    <Button onClick={openCreate} className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        {tr('Add Operator')}
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-12">{tr('Loading…')}</div>
            ) : organizations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">{tr('No operators yet.')}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {organizations.map((org) => (
                        <Card key={org.id} className="hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Building2 className="w-5 h-5 text-primary shrink-0" />
                                        <h3 className="font-semibold text-foreground truncate">{org.name}</h3>
                                    </div>
                                    <SubscriptionBadge org={org} tr={tr} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                    <dt className="text-muted-foreground">{tr('Code')}</dt>
                                    <dd className="font-mono">{org.code ?? org.id}</dd>
                                    <dt className="text-muted-foreground">{tr('Owner login')}</dt>
                                    <dd className="font-mono truncate">{org.ownerLogin ?? '—'}</dd>
                                    <dt className="text-muted-foreground">{tr('Subscription')}</dt>
                                    <dd>{formatDateIN(org.subscriptionStart)} → {formatDateIN(org.subscriptionEnd)}</dd>
                                    <dt className="text-muted-foreground">{tr('Connection types')}</dt>
                                    <dd>{usage(org.providersUsed, org.maxProviders)}</dd>
                                    <dt className="text-muted-foreground">{tr('Connection products')}</dt>
                                    <dd>{usage(org.plansUsed, org.maxPlans)}</dd>
                                    <dt className="text-muted-foreground">{tr('Status')}</dt>
                                    <dd>{tr(org.status === 'active' ? 'Active' : org.status === 'disabled' ? 'Disabled' : 'Suspended')}</dd>
                                </dl>
                                {canEdit && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => openEdit(org)}>
                                            <Pencil className="w-3 h-3 mr-1" /> {tr('Edit')}
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => openModules(org)}>
                                            <Settings className="w-3 h-3 mr-1" /> {tr('Modules')}
                                        </Button>
                                        <Select
                                            aria-label={tr('Renew subscription')}
                                            value=""
                                            disabled={saving}
                                            onChange={(e) => {
                                                const months = Number(e.target.value);
                                                if (months) run(() => organizationsApi.renewSubscription(org.id, months), tr('Renewed for {{n}} month(s)', { n: months }));
                                            }}
                                            className="h-8 text-xs w-28"
                                        >
                                            <option value="">{tr('Renew…')}</option>
                                            <option value="1">{tr('+1 month')}</option>
                                            <option value="3">{tr('+{{n}} months', { n: 3 })}</option>
                                            <option value="6">{tr('+{{n}} months', { n: 6 })}</option>
                                            <option value="12">{tr('+{{n}} months', { n: 12 })}</option>
                                        </Select>
                                        <Select
                                            aria-label={tr('Status')}
                                            value={org.status}
                                            disabled={saving}
                                            onChange={(e) =>
                                                run(() => organizationsApi.updateStatus(org.id, e.target.value as OrganizationStatus), tr('Status updated'))
                                            }
                                            className="h-8 text-xs w-28"
                                        >
                                            <option value="active">{tr('Active')}</option>
                                            <option value="disabled">{tr('Disabled')}</option>
                                            <option value="suspended">{tr('Suspended')}</option>
                                        </Select>
                                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setResetOrg(org)}>
                                            <KeyRound className="w-3 h-3 mr-1" /> {tr('Reset password')}
                                        </Button>
                                        {org.status !== 'active' && (
                                            <Button variant="outline" size="sm"
                                                className="text-xs h-8 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                                                onClick={() => { setDeleteOrg(org); setDeleteConfirm(''); }}>
                                                <Trash2 className="w-3 h-3 mr-1" /> {tr('Delete')}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {formOpen && (
                <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
                    <DialogHeader title={editing ? tr('Edit {{name}}', { name: editing.name }) : tr('Add Operator')} onClose={() => setFormOpen(false)} />
                    <DialogBody>
                        <div className="px-4 sm:px-5 py-4 space-y-5">
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold">{tr('Business')}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">{tr('Business name')}</span>
                                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sri Murugan Cable" />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">{tr('Short code')}</span>
                                        <Input
                                            value={form.code}
                                            disabled={!!editing}
                                            maxLength={20}
                                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                                            placeholder="SMC01"
                                        />
                                        <span className="block text-xs text-muted-foreground mt-1">{tr("Used in receipt numbers. Can't be changed later.")}</span>
                                    </label>
                                </div>
                            </section>

                            {!editing && (
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold">{tr('Owner login')}</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className="block text-sm">
                                            <span className="block font-medium mb-1">{tr('Owner name')}</span>
                                            <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                                        </label>
                                        <label className="block text-sm">
                                            <span className="block font-medium mb-1">{tr('Owner mobile')}</span>
                                            <Input inputMode="numeric" maxLength={10} value={form.ownerMobile}
                                                onChange={(e) => setForm({ ...form, ownerMobile: e.target.value.replace(/\D/g, '') })} />
                                        </label>
                                        <label className="block text-sm">
                                            <span className="block font-medium mb-1">{tr('Username')}</span>
                                            <Input autoComplete="off" value={form.ownerUsername}
                                                onChange={(e) => setForm({ ...form, ownerUsername: e.target.value.trim() })} />
                                        </label>
                                        <label className="block text-sm">
                                            <span className="block font-medium mb-1">{tr('Password (min 8 characters)')}</span>
                                            <Input type="password" autoComplete="new-password" value={form.ownerPassword}
                                                onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
                                        </label>
                                    </div>
                                </section>
                            )}

                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold">{tr('Subscription')}</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">{tr('Start date')}</span>
                                        <Input type="date" value={form.subscriptionStart} onChange={(e) => setForm({ ...form, subscriptionStart: e.target.value })} />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">{tr('End date')}</span>
                                        <Input type="date" value={form.subscriptionEnd} onChange={(e) => setForm({ ...form, subscriptionEnd: e.target.value })} />
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground">{tr('The end date is the last day they can use LCO Desk.')}</p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold">
                                    {tr('Limits')} <span className="font-normal text-muted-foreground">({tr('leave empty for unlimited')})</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">{tr('Max service connection types')}</span>
                                        <Input type="number" min={0} value={form.maxProviders}
                                            onChange={(e) => setForm({ ...form, maxProviders: e.target.value })} placeholder={tr('e.g. {{n}}', { n: 5 })} />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">{tr('Max connection products')}</span>
                                        <Input type="number" min={0} value={form.maxPlans}
                                            onChange={(e) => setForm({ ...form, maxPlans: e.target.value })} placeholder={tr('e.g. {{n}}', { n: 20 })} />
                                    </label>
                                </div>
                            </section>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>{tr('Cancel')}</Button>
                        <Button onClick={handleSave} disabled={!formValid || saving}>{saving ? tr('Saving…') : tr('Save')}</Button>
                    </DialogFooter>
                </Dialog>
            )}

            {modulesOrg && (
                <Dialog open={!!modulesOrg} onClose={() => setModulesOrg(null)}>
                    <DialogHeader title={`${tr('Modules')} — ${modulesOrg.name}`} onClose={() => setModulesOrg(null)} />
                    <DialogBody>
                        <div className="px-4 sm:px-5 py-4 space-y-5">
                            <ToggleGrid title={tr('Menu')} items={LCO_MODULES} selected={selectedModules} tr={tr}
                                onToggle={(k) => setSelectedModules((p) => toggle(p, k))} />
                            <ToggleGrid title={tr('Settings sections')} items={LCO_SETTINGS_TABS} selected={selectedTabs} tr={tr}
                                onToggle={(k) => setSelectedTabs((p) => toggle(p, k))} />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModulesOrg(null)}>{tr('Cancel')}</Button>
                        <Button onClick={handleSaveModules} disabled={saving}>{saving ? tr('Saving…') : tr('Save')}</Button>
                    </DialogFooter>
                </Dialog>
            )}

            {resetOrg && (
                <Dialog open onClose={closeReset}>
                    <DialogHeader title={`${tr('Reset password')} — ${resetOrg.name}`} onClose={closeReset} />
                    <DialogBody>
                        <div className="px-4 sm:px-5 py-4 space-y-3 text-sm">
                            {resetResult ? (
                                <>
                                    <p>{tr('New login for the owner. Copy it now: it will not be shown again.')}</p>
                                    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1 font-mono break-all">
                                        <p>{tr('Username')}: <b>{resetResult.username}</b></p>
                                        <p>{tr('Password')}: <b>{resetResult.password}</b></p>
                                    </div>
                                    <Button variant="outline" onClick={() => {
                                        navigator.clipboard?.writeText(`${resetResult.username} / ${resetResult.password}`)
                                            .then(() => showSuccess(tr('Copied'))).catch(() => undefined);
                                    }}>
                                        <Copy className="w-4 h-4 mr-1" /> {tr('Copy')}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <p className="text-muted-foreground">
                                        {tr('Passwords are stored scrambled, so the current one cannot be shown. Set a new one and give it to the owner.')}
                                    </p>
                                    <p>{tr('Owner login')}: <b className="font-mono">{resetOrg.ownerLogin ?? '—'}</b></p>
                                    <label className="block">
                                        <span className="block font-medium mb-1">{tr('New password (leave empty to create one)')}</span>
                                        <Input type="text" autoComplete="new-password" value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)} placeholder={tr('Min 8 characters')} />
                                    </label>
                                </>
                            )}
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        {resetResult ? (
                            <Button onClick={closeReset}>{tr('Done')}</Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={closeReset}>{tr('Cancel')}</Button>
                                <Button onClick={handleReset}
                                    disabled={saving || (newPassword.trim() !== '' && newPassword.trim().length < 8)}>
                                    {saving ? tr('Saving…') : tr('Reset password')}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </Dialog>
            )}

            {deleteOrg && (
                <Dialog open onClose={() => setDeleteOrg(null)}>
                    <DialogHeader title={`${tr('Delete')} — ${deleteOrg.name}`} onClose={() => setDeleteOrg(null)} />
                    <DialogBody>
                        <div className="px-4 sm:px-5 py-4 space-y-3 text-sm">
                            <p className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 p-3">
                                {tr('This permanently deletes the operator and ALL its data: customers, bills, payments, SMS, stock and staff logins. It cannot be undone.')}
                            </p>
                            <p className="text-muted-foreground">{tr('Take a database backup first if you may need this data later.')}</p>
                            <label className="block">
                                <span className="block font-medium mb-1">{tr('Type the operator code {{code}} to confirm', { code: deleteOrg.code ?? '' })}</span>
                                <Input value={deleteConfirm} autoComplete="off" onChange={(e) => setDeleteConfirm(e.target.value)} />
                            </label>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOrg(null)}>{tr('Cancel')}</Button>
                        <Button className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={saving || deleteConfirm.trim().toUpperCase() !== (deleteOrg.code ?? '').toUpperCase()}
                            onClick={handleDelete}>
                            {saving ? tr('Deleting…') : tr('Delete permanently')}
                        </Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
};

export default Organizations;
