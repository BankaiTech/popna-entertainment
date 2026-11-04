// App owner (platform admin) — manage operators: subscription, limits, modules, status.
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Building2, Check, Settings, Pencil } from 'lucide-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { organizationsApi } from '@/api/organizations';
import type { Organization, OrganizationStatus, ModuleKey, SettingsTabKey } from '@/models/types';
import { formatDateIN, getSubscriptionState, todayInIndia } from '@/lib/subscription';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

/** Modules that make sense for a cable / broadband operator, with plain names. */
const LCO_MODULES: { key: ModuleKey; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'contacts', label: 'Customers' },
    { key: 'payments', label: 'Collections' },
    { key: 'invoices', label: 'Sales' },
    { key: 'purchase-invoices', label: 'Purchase' },
    { key: 'inventory-products', label: 'Stock' },
    { key: 'products', label: 'Providers & Plans' },
    { key: 'connection-requests', label: 'New Connections' },
    { key: 'complaints', label: 'Complaints' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'reports', label: 'Reports' },
    { key: 'users', label: 'Staff' },
    { key: 'settings', label: 'Settings' },
    { key: 'audit-trail', label: 'Audit Log' },
];
const DEFAULT_MODULES: ModuleKey[] = [
    'dashboard', 'contacts', 'payments', 'invoices', 'purchase-invoices', 'inventory-products', 'products',
    'connection-requests', 'complaints', 'reports', 'users', 'settings',
];
const LCO_SETTINGS_TABS: { key: SettingsTabKey; label: string }[] = [
    { key: 'company', label: 'Business Profile' },
    { key: 'products', label: 'Providers & Plans' },
    { key: 'billing', label: 'Billing & UPI' },
    { key: 'sms-templates', label: 'SMS' },
];
const DEFAULT_TABS: SettingsTabKey[] = ['company', 'products', 'billing', 'sms-templates'];

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

function SubscriptionBadge({ org }: { org: Organization }) {
    const state = org.subscriptionState ?? getSubscriptionState(org.subscriptionStart, org.subscriptionEnd);
    const days = org.daysLeft;
    let text = 'Active';
    let tone = 'bg-green-50 text-green-700 border-green-200';
    if (state === 'expired') {
        text = 'Expired';
        tone = 'bg-red-50 text-red-700 border-red-200';
    } else if (state === 'not_started') {
        text = 'Not started';
        tone = 'bg-gray-50 text-gray-700 border-gray-200';
    } else if (!org.subscriptionEnd) {
        text = 'No end date';
    } else if (days != null && days <= 15) {
        text = days === 0 ? 'Ends today' : `${days} days left`;
        tone = 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap', tone)}>{text}</span>;
}

type ToggleItem = { key: string; label: string };

function ToggleGrid({ title, items, selected, onToggle }: {
    title: string; items: ToggleItem[]; selected: string[]; onToggle: (key: string) => void;
}) {
    return (
        <div>
            <h3 className="text-sm font-semibold mb-2">{title}</h3>
            <div className="grid grid-cols-2 gap-2">
                {items.map(({ key, label }) => {
                    const on = selected.includes(key);
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onToggle(key)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left',
                                on
                                    ? 'bg-primary/10 text-primary border-primary'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            )}
                        >
                            {on ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

const Organizations = () => {
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

    const load = async () => {
        setLoading(true);
        try {
            setOrganizations(await organizationsApi.getAll());
        } catch (err) {
            showError(err instanceof Error ? err.message : 'Could not load operators');
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
            showError(err instanceof Error ? err.message : 'Something went wrong');
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
            showError('End date must be after the start date.');
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
            ? await run(() => organizationsApi.update(editing.id, common), 'Operator updated')
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
                'Operator created',
            );
        if (ok) setFormOpen(false);
    };

    const openModules = (org: Organization) => {
        setModulesOrg(org);
        setSelectedModules([...org.allowedModules]);
        setSelectedTabs([...org.allowedSettingsTabs]);
    };

    const handleSaveModules = async () => {
        if (!modulesOrg) return;
        const ok = await run(async () => {
            await organizationsApi.updateModules(modulesOrg.id, selectedModules as ModuleKey[]);
            await organizationsApi.updateSettingsTabs(modulesOrg.id, selectedTabs as SettingsTabKey[]);
        }, 'Modules updated');
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
                    <h1 className="text-lg sm:text-xl font-bold text-foreground">Operators</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Subscriptions, limits and modules for each cable / broadband operator
                    </p>
                </div>
                {canEdit && (
                    <Button onClick={openCreate} className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Operator
                    </Button>
                )}
            </div>

            {loading ? (
                <div className="text-center py-12">Loading…</div>
            ) : organizations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No operators yet.</div>
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
                                    <SubscriptionBadge org={org} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                    <dt className="text-muted-foreground">Code</dt>
                                    <dd className="font-mono">{org.code ?? org.id}</dd>
                                    <dt className="text-muted-foreground">Subscription</dt>
                                    <dd>{formatDateIN(org.subscriptionStart)} → {formatDateIN(org.subscriptionEnd)}</dd>
                                    <dt className="text-muted-foreground">Providers</dt>
                                    <dd>{usage(org.providersUsed, org.maxProviders)}</dd>
                                    <dt className="text-muted-foreground">Plans</dt>
                                    <dd>{usage(org.plansUsed, org.maxPlans)}</dd>
                                    <dt className="text-muted-foreground">Status</dt>
                                    <dd className="capitalize">{org.status}</dd>
                                </dl>
                                {canEdit && (
                                    <div className="flex flex-wrap gap-1.5">
                                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => openEdit(org)}>
                                            <Pencil className="w-3 h-3 mr-1" /> Edit
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => openModules(org)}>
                                            <Settings className="w-3 h-3 mr-1" /> Modules
                                        </Button>
                                        <Select
                                            aria-label="Renew subscription"
                                            value=""
                                            disabled={saving}
                                            onChange={(e) => {
                                                const months = Number(e.target.value);
                                                if (months) run(() => organizationsApi.renewSubscription(org.id, months), `Renewed for ${months} month(s)`);
                                            }}
                                            className="h-8 text-xs w-28"
                                        >
                                            <option value="">Renew…</option>
                                            <option value="1">+1 month</option>
                                            <option value="3">+3 months</option>
                                            <option value="6">+6 months</option>
                                            <option value="12">+12 months</option>
                                        </Select>
                                        <Select
                                            aria-label="Status"
                                            value={org.status}
                                            disabled={saving}
                                            onChange={(e) =>
                                                run(() => organizationsApi.updateStatus(org.id, e.target.value as OrganizationStatus), 'Status updated')
                                            }
                                            className="h-8 text-xs w-28"
                                        >
                                            <option value="active">Active</option>
                                            <option value="disabled">Disabled</option>
                                            <option value="suspended">Suspended</option>
                                        </Select>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {formOpen && (
                <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
                    <DialogHeader title={editing ? `Edit ${editing.name}` : 'Add Operator'} onClose={() => setFormOpen(false)} />
                    <DialogBody>
                        <div className="px-4 sm:px-5 py-4 space-y-5">
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold">Business</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">Business name</span>
                                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sri Murugan Cable" />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">Short code</span>
                                        <Input
                                            value={form.code}
                                            disabled={!!editing}
                                            maxLength={20}
                                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                                            placeholder="SMC01"
                                        />
                                        <span className="block text-xs text-muted-foreground mt-1">Used in receipt numbers. Can't be changed later.</span>
                                    </label>
                                </div>
                            </section>

                            {!editing && (
                                <section className="space-y-3">
                                    <h3 className="text-sm font-semibold">Owner login</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className="block text-sm">
                                            <span className="block font-medium mb-1">Owner name</span>
                                            <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                                        </label>
                                        <label className="block text-sm">
                                            <span className="block font-medium mb-1">Owner mobile</span>
                                            <Input inputMode="numeric" maxLength={10} value={form.ownerMobile}
                                                onChange={(e) => setForm({ ...form, ownerMobile: e.target.value.replace(/\D/g, '') })} />
                                        </label>
                                        <label className="block text-sm">
                                            <span className="block font-medium mb-1">Username</span>
                                            <Input autoComplete="off" value={form.ownerUsername}
                                                onChange={(e) => setForm({ ...form, ownerUsername: e.target.value.trim() })} />
                                        </label>
                                        <label className="block text-sm">
                                            <span className="block font-medium mb-1">Password (min 8 characters)</span>
                                            <Input type="password" autoComplete="new-password" value={form.ownerPassword}
                                                onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
                                        </label>
                                    </div>
                                </section>
                            )}

                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold">Subscription</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">Start date</span>
                                        <Input type="date" value={form.subscriptionStart} onChange={(e) => setForm({ ...form, subscriptionStart: e.target.value })} />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">End date</span>
                                        <Input type="date" value={form.subscriptionEnd} onChange={(e) => setForm({ ...form, subscriptionEnd: e.target.value })} />
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground">The end date is the last day they can use LCO Desk.</p>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold">
                                    Limits <span className="font-normal text-muted-foreground">(leave empty for unlimited)</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">Max providers</span>
                                        <Input type="number" min={0} value={form.maxProviders}
                                            onChange={(e) => setForm({ ...form, maxProviders: e.target.value })} placeholder="e.g. 5" />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="block font-medium mb-1">Max plans</span>
                                        <Input type="number" min={0} value={form.maxPlans}
                                            onChange={(e) => setForm({ ...form, maxPlans: e.target.value })} placeholder="e.g. 20" />
                                    </label>
                                </div>
                            </section>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={!formValid || saving}>{saving ? 'Saving…' : 'Save'}</Button>
                    </DialogFooter>
                </Dialog>
            )}

            {modulesOrg && (
                <Dialog open={!!modulesOrg} onClose={() => setModulesOrg(null)}>
                    <DialogHeader title={`Modules — ${modulesOrg.name}`} onClose={() => setModulesOrg(null)} />
                    <DialogBody>
                        <div className="px-4 sm:px-5 py-4 space-y-5">
                            <ToggleGrid title="Menu" items={LCO_MODULES} selected={selectedModules}
                                onToggle={(k) => setSelectedModules((p) => toggle(p, k))} />
                            <ToggleGrid title="Settings sections" items={LCO_SETTINGS_TABS} selected={selectedTabs}
                                onToggle={(k) => setSelectedTabs((p) => toggle(p, k))} />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModulesOrg(null)}>Cancel</Button>
                        <Button onClick={handleSaveModules} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                    </DialogFooter>
                </Dialog>
            )}
        </div>
    );
};

export default Organizations;
