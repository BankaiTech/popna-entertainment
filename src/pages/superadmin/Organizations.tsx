// SaaS Master Controller - Organizations Management Page
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Plus, Building2, Check, Settings, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { organizationsApi } from '@/api/organizations';
import type { Organization, OrganizationStatus, ModuleKey, SettingsTabKey, IndustryType } from '@/models/types';
import { ALL_MODULES, ALL_SETTINGS_TABS } from '@/models/types';
import { INDUSTRY_TEMPLATES, getTemplateById } from '@/config/industryTemplates';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';

const emptyForm = () => ({
  name: '',
  industryType: 'general' as IndustryType,
  subscriptionStart: new Date().toISOString().split('T')[0],
  subscriptionEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  adminUsername: '',
  adminEmail: '',
  adminPassword: '',
});

const Organizations = () => {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [modulesOrg, setModulesOrg] = useState<Organization | null>(null);
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<SettingsTabKey[]>([]);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    const orgs = await organizationsApi.getAll();
    setOrganizations(orgs);
    setLoading(false);
  };

  const isAddFormValid =
    formData.name.trim().length > 0 &&
    formData.adminUsername.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail.trim()) &&
    formData.adminPassword.length >= 6;

  const handleAdd = async () => {
    if (!isAddFormValid) {
      showError(
        t(
          'organizations.fillAdminFields',
          'Please fill organization name and admin username, email, and password (min 6 characters).'
        )
      );
      return;
    }
    setSaving(true);
    try {
      const tpl = getTemplateById(formData.industryType);
      await organizationsApi.create({
        name: formData.name.trim(),
        status: 'active',
        industryType: formData.industryType,
        terminology: tpl?.terminology ?? {},
        allowedModules: (tpl?.enabledModules ?? [...ALL_MODULES]) as ModuleKey[],
        allowedSettingsTabs: (tpl?.enabledSettingsTabs ?? [...ALL_SETTINGS_TABS]) as SettingsTabKey[],
        subscriptionStart: formData.subscriptionStart,
        subscriptionEnd: formData.subscriptionEnd,
        admin: {
          username: formData.adminUsername.trim(),
          email: formData.adminEmail.trim(),
          password: formData.adminPassword,
          name: `${formData.name.trim()} Admin`,
        },
      });
      showSuccess(
        t(
          'organizations.createdWithAdmin',
          'Organization and admin account created. They can log in with the username and password you set.'
        )
      );
      setShowAddModal(false);
      setShowPassword(false);
      setFormData(emptyForm());
      await loadOrganizations();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('organizations.createFailed', 'Failed to create organization');
      showError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleIndustryChange = async (orgId: string, newIndustry: IndustryType) => {
    const tpl = getTemplateById(newIndustry);
    await organizationsApi.update(orgId, {
      industryType: newIndustry,
      terminology: tpl?.terminology ?? {},
      allowedModules: (tpl?.enabledModules ?? [...ALL_MODULES]) as ModuleKey[],
      allowedSettingsTabs: (tpl?.enabledSettingsTabs ?? [...ALL_SETTINGS_TABS]) as SettingsTabKey[],
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
    setSelectedModules((prev) => (prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]));
  };

  const toggleTab = (tab: SettingsTabKey) => {
    setSelectedTabs((prev) => (prev.includes(tab) ? prev.filter((t) => t !== tab) : [...prev, tab]));
  };

  const getStatusColor = (status: OrganizationStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'disabled':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'suspended':
        return 'bg-red-50 text-red-700 border-red-200';
      default: {
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">
            {t('organizations.title', 'Organizations')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('organizations.subtitle', 'Create, manage, and control organization access')}
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData(emptyForm());
            setShowPassword(false);
            setShowAddModal(true);
          }}
          className="w-full sm:w-auto"
        >
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
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                      getStatusColor(org.status)
                    )}
                  >
                    {org.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    {t('organizations.id', 'ID')}: <span className="font-mono">{org.id}</span>
                  </p>
                  <p>
                    {t('organizations.modules', 'Modules')}: {org.allowedModules.length} / {ALL_MODULES.length}
                  </p>
                  <p>
                    {t('organizations.subscription', 'Subscription')}: {org.subscriptionStart} —{' '}
                    {org.subscriptionEnd}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Select
                    value={org.industryType ?? 'general'}
                    onChange={(e) => handleIndustryChange(org.id, e.target.value as IndustryType)}
                    className="h-8 text-xs flex-1 min-w-[120px]"
                  >
                    {INDUSTRY_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {t(tpl.labelKey)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={org.status}
                    onChange={(e) => handleStatusChange(org.id, e.target.value as OrganizationStatus)}
                    className="h-8 text-xs w-24"
                  >
                    <option value="active">{t('organizations.active', 'Active')}</option>
                    <option value="disabled">{t('organizations.disabled', 'Disabled')}</option>
                    <option value="suspended">{t('organizations.suspended', 'Suspended')}</option>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => openModulesEditor(org)} className="text-xs h-8">
                    <Settings className="w-3 h-3 mr-1" />
                    {t('organizations.manageModules', 'Modules')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAddModal && (
        <Dialog open={showAddModal} onClose={() => setShowAddModal(false)}>
          <DialogHeader
            title={t('organizations.addOrganization', 'Add Organization')}
            onClose={() => setShowAddModal(false)}
          />
          <DialogBody>
            <div className="px-4 sm:px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('organizations.orgName', 'Organization Name')}
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('organizations.placeholderOrgName', 'Enter organization name')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('organizations.industryType', 'Industry Type')}
                </label>
                <Select
                  value={formData.industryType}
                  onChange={(e) => setFormData({ ...formData, industryType: e.target.value as IndustryType })}
                >
                  {INDUSTRY_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {t(tpl.labelKey)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('organizations.subscriptionStart', 'Start Date')}
                  </label>
                  <Input
                    type="date"
                    value={formData.subscriptionStart}
                    onChange={(e) => setFormData({ ...formData, subscriptionStart: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('organizations.subscriptionEnd', 'End Date')}
                  </label>
                  <Input
                    type="date"
                    value={formData.subscriptionEnd}
                    onChange={(e) => setFormData({ ...formData, subscriptionEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('organizations.adminAccount', 'Organization Admin Account')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t(
                      'organizations.adminAccountHint',
                      'This admin can log in and manage this organization.'
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('organizations.adminUsername', 'Username')}
                  </label>
                  <Input
                    autoComplete="off"
                    value={formData.adminUsername}
                    onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value })}
                    placeholder={t('organizations.placeholderAdminUsername', 'e.g. acme_admin')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('organizations.adminEmail', 'Email')}
                  </label>
                  <Input
                    type="email"
                    autoComplete="off"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder={t('organizations.placeholderAdminEmail', 'admin@company.com')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('organizations.adminPassword', 'Password')}
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      placeholder={t('organizations.placeholderAdminPassword', 'Min. 6 characters')}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword
                          ? t('common.hidePassword', 'Hide password')
                          : t('common.showPassword', 'Show password')
                      }
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={saving}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={!isAddFormValid || saving}>
              {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {showModulesModal && modulesOrg && (
        <Dialog open={showModulesModal} onClose={() => setShowModulesModal(false)} size="lg">
          <DialogHeader
            title={`${t('organizations.manageModulesFor', 'Manage Modules')} - ${modulesOrg.name}`}
            onClose={() => setShowModulesModal(false)}
          />
          <DialogBody>
            <div className="px-4 sm:px-5 py-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {t('organizations.allowedModules', 'Allowed Modules')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_MODULES.map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModule(mod)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                        selectedModules.includes(mod)
                          ? 'bg-primary/10 text-primary border-primary'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {selectedModules.includes(mod) ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                      {t(
                        `superadmin.modules.${mod}`,
                        mod.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {t('organizations.allowedSettingsTabs', 'Allowed Settings Tabs')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SETTINGS_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => toggleTab(tab)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                        selectedTabs.includes(tab)
                          ? 'bg-primary/10 text-primary border-primary'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {selectedTabs.includes(tab) ? <Check className="w-3 h-3" /> : <div className="w-3 h-3" />}
                      {t(
                        `superadmin.settingsTabs.${tab}`,
                        tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModulesModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSaveModules}>{t('common.saveChanges', 'Save Changes')}</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
};

export default Organizations;
