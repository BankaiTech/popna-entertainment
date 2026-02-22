// SaaS Master Controller — Organizations Management Page
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Building2, Check, X, Settings } from 'lucide-react';
import { organizationsApi } from '@/api/organizations';
import type { Organization, OrganizationStatus, ModuleKey, SettingsTabKey } from '@/models/types';
import { ALL_MODULES, ALL_SETTINGS_TABS } from '@/models/types';
import { cn } from '@/lib/utils';

const MODULE_LABELS: Record<ModuleKey, string> = {
    'dashboard': 'Dashboard',
    'customers': 'Customers',
    'complaints': 'Complaints',
    'payments': 'Payments',
    'catalog': 'Catalog',
    'invoices': 'Invoices',
    'purchase-invoices': 'Purchase Invoices',
    'users': 'Users',
    'settings': 'Settings',
    'connection-requests': 'New Connections',
};

const SETTINGS_TAB_LABELS: Record<SettingsTabKey, string> = {
    'company': 'Company Settings',
    'products': 'Products',
};

const Organizations = () => {
    const { t } = useTranslation();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showModulesModal, setShowModulesModal] = useState(false);
    const [modulesOrg, setModulesOrg] = useState<Organization | null>(null);
    const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);
    const [selectedTabs, setSelectedTabs] = useState<SettingsTabKey[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        subscriptionStart: new Date().toISOString().split('T')[0],
        subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        setLoading(true);
        const orgs = await organizationsApi.getAll();
        setOrganizations(orgs);
        setLoading(false);
    };

    const handleAdd = async () => {
        await organizationsApi.create({
            name: formData.name,
            status: 'active',
            allowedModules: [...ALL_MODULES],
            allowedSettingsTabs: [...ALL_SETTINGS_TABS],
            subscriptionStart: formData.subscriptionStart,
            subscriptionEnd: formData.subscriptionEnd,
        });
        setShowAddModal(false);
        setFormData({
            name: '',
            subscriptionStart: new Date().toISOString().split('T')[0],
            subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        await loadOrganizations();
    };

    const handleStatusChange = async (id: string, status: OrganizationStatus) => {
        await organizationsApi.updateStatus(id, status);
        await loadOrganizations();
    };

    const openModulesEditor = (org: Organization) => {
        setModulesOrg(org);
        setSelectedModules([...org.allowedModules]);
        setSelectedTabs([...org.allowedSettingsTabs]);
        setShowModulesModal(true);
    };

    const handleSaveModules = async () => {
        if (!modulesOrg) return;
        await organizationsApi.updateModules(modulesOrg.id, selectedModules);
        await organizationsApi.updateSettingsTabs(modulesOrg.id, selectedTabs);
        setShowModulesModal(false);
        setModulesOrg(null);
        await loadOrganizations();
    };

    const toggleModule = (mod: ModuleKey) => {
        setSelectedModules((prev) =>
            prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
        );
    };

    const toggleTab = (tab: SettingsTabKey) => {
        setSelectedTabs((prev) =>
            prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab]
        );
    };

    const getStatusColor = (status: OrganizationStatus) => {
        switch (status) {
            case 'active': return 'bg-green-50 text-green-700 border-green-200';
            case 'disabled': return 'bg-gray-50 text-gray-700 border-gray-200';
            case 'suspended': return 'bg-red-50 text-red-700 border-red-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-lg sm:text-xl font-bold text-foreground">{t('organizations.title', 'Organizations')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('organizations.subtitle', 'Create, manage, and control organization access')}</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('organizations.addOrganization', 'Add Organization')}
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12">{t('common.loading', 'Loading...')}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {organizations.map((org) => (
                        <Card key={org.id} className="hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        <h3 className="font-semibold text-foreground">{org.name}</h3>
                                    </div>
                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', getStatusColor(org.status))}>
                                        {org.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-xs text-muted-foreground space-y-1">
                                    <p>{t('organizations.id', 'ID')}: <span className="font-mono">{org.id}</span></p>
                                    <p>{t('organizations.modules', 'Modules')}: {org.allowedModules.length} / {ALL_MODULES.length}</p>
                                    <p>{t('organizations.subscription', 'Subscription')}: {org.subscriptionStart} — {org.subscriptionEnd}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <Select
                                        value={org.status}
                                        onChange={(e) => handleStatusChange(org.id, e.target.value as OrganizationStatus)}
                                        className="h-7 text-xs w-24"
                                    >
                                        <option value="active">{t('organizations.active', 'Active')}</option>
                                        <option value="disabled">{t('organizations.disabled', 'Disabled')}</option>
                                        <option value="suspended">{t('organizations.suspended', 'Suspended')}</option>
                                    </Select>
                                    <Button variant="outline" size="sm" onClick={() => openModulesEditor(org)} className="text-xs">
                                        <Settings className="w-3 h-3 mr-1" />
                                        {t('organizations.manageModules', 'Modules')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Organization Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-card rounded-modal shadow-soft-xl w-full max-w-md flex flex-col overflow-hidden border border-border">
                        <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{t('organizations.addOrganization', 'Add Organization')}</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-accent rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 px-4 sm:px-5 py-4 space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('organizations.orgName', 'Organization Name')}</label>
                                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter organization name" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('organizations.subscriptionStart', 'Start Date')}</label>
                                    <Input type="date" value={formData.subscriptionStart} onChange={(e) => setFormData({ ...formData, subscriptionStart: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('organizations.subscriptionEnd', 'End Date')}</label>
                                    <Input type="date" value={formData.subscriptionEnd} onChange={(e) => setFormData({ ...formData, subscriptionEnd: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 flex justify-end gap-2 px-4 sm:px-5 py-4 border-t border-border bg-card">
                            <Button variant="outline" onClick={() => setShowAddModal(false)}>{t('common.cancel', 'Cancel')}</Button>
                            <Button onClick={handleAdd} disabled={!formData.name.trim()}>{t('common.save', 'Save')}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modules Assignment Modal */}
            {showModulesModal && modulesOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-card rounded-modal shadow-soft-xl w-full max-w-lg flex flex-col overflow-hidden border border-border max-h-[90vh]">
                        <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{t('organizations.manageModulesFor', 'Manage Modules')} — {modulesOrg.name}</h2>
                            <button onClick={() => setShowModulesModal(false)} className="p-1.5 hover:bg-accent rounded-md"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
                            {/* Modules */}
                            <div>
                                <h3 className="text-sm font-semibold mb-2">{t('organizations.allowedModules', 'Allowed Modules')}</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_MODULES.map((mod) => (
                                        <button
                                            key={mod}
                                            onClick={() => toggleModule(mod)}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                                                selectedModules.includes(mod)
                                                    ? 'bg-primary/10 text-primary border-primary'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                            )}
                                        >
                                            {selectedModules.includes(mod) ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                                            {MODULE_LABELS[mod]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Settings Tabs */}
                            <div>
                                <h3 className="text-sm font-semibold mb-2">{t('organizations.allowedSettingsTabs', 'Allowed Settings Tabs')}</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_SETTINGS_TABS.map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => toggleTab(tab)}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                                                selectedTabs.includes(tab)
                                                    ? 'bg-primary/10 text-primary border-primary'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                            )}
                                        >
                                            {selectedTabs.includes(tab) ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                                            {SETTINGS_TAB_LABELS[tab]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 flex justify-end gap-2 px-4 sm:px-5 py-4 border-t border-border bg-card">
                            <Button variant="outline" onClick={() => setShowModulesModal(false)}>{t('common.cancel', 'Cancel')}</Button>
                            <Button onClick={handleSaveModules}>{t('common.save', 'Save Changes')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Organizations;
