// SaaS Ready - Customer Edit/Add Sheet (payment collection is a separate modal)
// Live (Django) form order: Information (name, mobile, AREA*) → Connection (connection*, product*,
// device ID* for cable) → Address → More (status). Fields the server does not store are shown in mock mode only.
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLt } from '@/lib/lt';
import { isMockMode } from '@/lib/apiHelpers';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './ui/Dialog';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import type { Customer, Provider, CustomerStatus, Address, Subscription, SubscriptionStatus, BillingCycle, User } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { useSubscriptionsStore } from '@/store/useSubscriptionsStore';
import { formatCurrencyINR } from '@/lib/utils';
import { getConnectionTypeLabel, isCableProvider } from '@/lib/providerUtils';
import { showError } from '@/utils/toast';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { getTemplateById, getContactConfig } from '@/config/industryTemplates';
import { useTerminology } from '@/hooks/useTerminology';
import { usersApi } from '@/api/users';
import { planMonthly, rupeesIN } from '@/api/api';

interface CustomerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  /** Return false (or a promise of false) to keep the form open, e.g. when the server refused it. */
  onSave: (customer: Omit<Customer, 'id' | 'createdAt'> | Partial<Customer>) => void | boolean | Promise<void | boolean>;
  prefillData?: {
    name?: string;
    email?: string;
    mobile?: string;
    connectionType?: Provider;
    package?: string;
  };
}

const CustomerSheet = ({ isOpen, onClose, customer, onSave, prefillData }: CustomerSheetProps) => {
  const { t } = useTranslation();
  const tr = useLt();
  const { term } = useTerminology();
  const { role } = useAuthStore();
  const { products, fetchActiveProducts, plans, fetchPlans, customers } = useStore();
  const { currentOrganization } = useOrganizationStore();
  const contactFormConfig = useMemo(() => {
    const template = currentOrganization?.industryType ? getTemplateById(currentOrganization.industryType) : undefined;
    return getContactConfig(template).form;
  }, [currentOrganization?.industryType]);
  const { showPlanTab, showIspFields, showLoyaltyCredit } = contactFormConfig;
  const { isModuleAllowed } = useOrganizationStore();
  const showSubscriptionTab = isModuleAllowed('subscriptions');
  const { subscriptions, fetchSubscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptionsStore();

  // Load products and plans when sheet opens so dropdowns are always populated
  useEffect(() => {
    if (isOpen) {
      fetchActiveProducts();
      fetchPlans();
      if (showSubscriptionTab) fetchSubscriptions();
    }
  }, [isOpen, fetchActiveProducts, fetchPlans, showSubscriptionTab, fetchSubscriptions]);

  const isReadOnly = role === 'employee';
  // Field staff (collection agents / technicians) who can be put in charge of this customer.
  const [fieldStaff, setFieldStaff] = useState<User[]>([]);
  useEffect(() => {
    if (!isOpen || isMockMode() || isReadOnly) return;
    usersApi.getAll()
      .then((all) => setFieldStaff(all.filter((u) => ['agent', 'technician'].includes(u.lcoRole ?? '') && u.status === 'active')))
      .catch(() => setFieldStaff([]));
  }, [isOpen, isReadOnly]);
  const [activeTab, setActiveTab] = useState<'info' | 'plan' | 'address' | 'more' | 'subscriptions'>('info');

  // Subscription form state for inline add/edit
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [subForm, setSubForm] = useState({
    planName: '',
    amount: '' as number | '',
    billingCycle: 'monthly' as BillingCycle,
    startDate: new Date().toISOString().slice(0, 10),
    nextBillingDate: '',
    status: 'active' as SubscriptionStatus,
    autoRenew: true,
  });

  // Customer's subscriptions
  const customerSubscriptions = useMemo(
    () => customer ? subscriptions.filter((s) => s.customerId === customer.id) : [],
    [subscriptions, customer]
  );

  // Stable reference - only recompute when products array identity changes
  const availableProviders = useMemo(
    () => (Array.isArray(products) ? products.map((p) => p.name) : []),
    [products]
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    connectionType: '' as Provider,
    package: '',
    status: 'Active' as CustomerStatus,
    description: '',
    gstin: '' as string | undefined,
    boxNumber: '',
    stbNumber: '',
    canCafId: '',
    cin: '',
    area: '',
    collectorIds: [] as number[],
    permanentDiscount: undefined as number | undefined,
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
    } as Address,
    additionalAddresses: [] as Address[],
    creditLimit: undefined as number | undefined,
    loyaltyPoints: undefined as number | undefined,
    tags: [] as string[],
    customFields: {} as Record<string, unknown>,
  });

  // Products (plans) of the chosen connection only. Nothing to pick until a connection is chosen.
  const availablePlans = useMemo(
    () => (Array.isArray(plans) && formData.connectionType
      ? plans.filter((p) => p.provider === formData.connectionType
        && (p.isActive !== false || p.planName === formData.package))
      : []),
    [plans, formData.connectionType, formData.package]
  );
  const isCable = isCableProvider(formData.connectionType, products);
  const live = !isMockMode();
  // Areas already used, to pick from (and avoid "Gandhi Nagar" vs "Gandhinagar").
  const knownAreas = useMemo(
    () => Array.from(new Set(customers.map((c) => (c.area || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b)),
    [customers]
  );

  const changeConnection = (connectionType: Provider) => {
    // A product from the old connection is not valid for the new one.
    const keep = plans.some((p) => p.provider === connectionType && p.planName === formData.package);
    setFormData({ ...formData, connectionType, package: keep ? formData.package : '' });
  };

  // Reset form when dialog opens/closes or customer changes - NOT on availableProviders change
  useEffect(() => {
    if (!isOpen) return;
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        connectionType: customer.connectionType,
        package: customer.package,
        status: customer.status,
        description: customer.description || '',
        gstin: customer.gstin || undefined,
        boxNumber: customer.boxNumber || '',
        stbNumber: customer.stbNumber || '',
        canCafId: customer.canCafId || '',
        cin: customer.cin || '',
        area: customer.area || '',
        collectorIds: customer.collectorIds ?? [],
        permanentDiscount: customer.permanentDiscount ?? undefined,
        address: customer.address,
        additionalAddresses: customer.additionalAddresses || [],
        creditLimit: customer.creditLimit ?? undefined,
        loyaltyPoints: customer.loyaltyPoints ?? undefined,
        tags: customer.tags ?? [],
        customFields: customer.customFields ?? {},
      });
    } else {
      // Use prefillData if available, otherwise use empty defaults
      setFormData({
        name: prefillData?.name || '',
        email: prefillData?.email || '',
        mobile: prefillData?.mobile || '',
        connectionType: prefillData?.connectionType || '',
        package: prefillData?.package || '',
        status: 'Active',
        description: '',
        gstin: undefined,
        boxNumber: '',
        stbNumber: '',
        canCafId: '',
        cin: '',
        area: '',
        collectorIds: [],
        permanentDiscount: undefined,
        address: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
        },
        additionalAddresses: [],
        creditLimit: undefined,
        loyaltyPoints: undefined,
        tags: [],
        customFields: {},
      });
    }
  }, [customer, isOpen, prefillData]);

  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Security check: Employees cannot add or edit customers
    if (isReadOnly) {
      if (customer) {
        showError(t('customers.noPermissionEdit', 'You do not have permission to edit customer details.'));
      } else {
        showError(t('customers.noPermissionAdd', 'You do not have permission to add customers.'));
      }
      return;
    }

    // Required fields (other tabs are not on screen, so the browser cannot check them).
    const missing = (tab: typeof activeTab, message: string) => { setActiveTab(tab); showError(message); };
    if (!formData.name.trim()) return missing('info', tr('Enter the customer name.'));
    if (showIspFields && !formData.area.trim()) return missing('info', tr('Enter the area.'));
    if (showIspFields && showPlanTab) {
      if (!formData.connectionType) return missing('plan', tr('Choose the connection.'));
      if (!formData.package) return missing('plan', tr('Choose the product.'));
      if (isCable && !formData.stbNumber.trim()) return missing('plan', tr('Enter the device ID. It is required for cable.'));
    }

    if (formData.gstin && formData.gstin.trim() !== '') {
      const gstinValue = formData.gstin.trim().toUpperCase();
      if (gstinValue.length !== 15) {
        showError(t('customerSheet.gstinLengthError', 'GSTIN must be exactly 15 characters'));
        return;
      }
      if (!/^[A-Z0-9]{15}$/.test(gstinValue)) {
        showError(t('customerSheet.gstinAlphanumericError', 'GSTIN must contain only alphanumeric characters'));
        return;
      }
      formData.gstin = gstinValue;
    } else {
      formData.gstin = undefined;
    }

    const payload = { ...formData };
    // A collector who left (inactive) cannot be chosen again; drop them instead of failing the save.
    if (fieldStaff.length > 0) {
      payload.collectorIds = payload.collectorIds.filter((id) => fieldStaff.some((u) => u.id === id));
    }
    const cf = { ...(payload.customFields ?? {}) };
    Object.keys(cf).forEach((k) => { if (k.trim() === '') delete cf[k]; });
    payload.customFields = Object.keys(cf).length ? cf : {};
    setSaving(true);
    try {
      const result = await onSave(payload);
      if (result !== false) onClose();
    } finally {
      setSaving(false);
    }
  };

  const statuses: CustomerStatus[] = ['Active', 'Inactive'];

  useEffect(() => {
    if (isOpen && isReadOnly && !customer) {
      showError(t('customers.noPermissionAdd', 'You do not have permission to add customers.'));
      onClose();
    }
  }, [isOpen, isReadOnly, customer, onClose, t]);

  const customerTerm = term('customer', t('customerSheet.customer', 'Customer'));
  const sheetTitle = isReadOnly
    ? t('customerSheet.details', '{{label}} Details', { label: customerTerm })
    : customer
      ? t('customerSheet.edit', 'Edit {{label}}', { label: customerTerm })
      : t('customerSheet.add', 'Add New {{label}}', { label: customerTerm });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg" className="sm:max-w-[600px]">
      <DialogHeader title={sheetTitle} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Tabs - Plan tab visibility from industry contactConfig */}
        <div className="flex border-b border-border shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 min-w-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'info'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {t('customerSheet.information', 'Information')}
          </button>
          {showPlanTab && (
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`flex-1 min-w-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'plan'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {term('connectionType', t('customerSheet.plan', 'Plan'))}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`flex-1 min-w-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'address'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {t('customerSheet.address', 'Address')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('more')}
            className={`flex-1 min-w-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'more'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {t('customerSheet.more', 'More')}
          </button>
          {showSubscriptionTab && customer && (
            <button
              type="button"
              onClick={() => setActiveTab('subscriptions')}
              className={`flex-1 min-w-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'subscriptions'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {term('subscription', t('customerSheet.subscriptions', 'Subscriptions'))}
            </button>
          )}
        </div>

        <DialogBody className="p-4 sm:p-6 pb-6">
          {/* Information Tab */}
          {activeTab === 'info' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.name', 'Name')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.mobile', 'Mobile')}
                    {isMockMode() && <span className="text-destructive"> *</span>}
                  </label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required={isMockMode()}
                    placeholder={isMockMode() ? undefined : tr('Optional. Needed for SMS.')}
                    disabled={isReadOnly}
                  />
                </div>
                {showIspFields && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.area', 'Area')} <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder={t('customerSheet.areaPlaceholder', 'Enter service area')}
                    list="customer-area-list"
                    autoComplete="off"
                    disabled={isReadOnly}
                  />
                  <datalist id="customer-area-list">
                    {knownAreas.map((a) => <option key={a} value={a} />)}
                  </datalist>
                </div>
                )}
                {live && showIspFields && !isReadOnly && (
                <div className="col-span-full">
                  <span className="block text-sm font-medium mb-2">{tr('Collected by')}</span>
                  {fieldStaff.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{tr('No collection agents yet. Add them in Users.')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {fieldStaff.map((u) => {
                        const on = formData.collectorIds.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer select-none ${on ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-primary"
                              checked={on}
                              onChange={() => setFormData({
                                ...formData,
                                collectorIds: on ? formData.collectorIds.filter((id) => id !== u.id) : [...formData.collectorIds, u.id],
                              })}
                            />
                            {u.name || u.username}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {formData.collectorIds.length === 0
                      ? tr('Nobody chosen: all staff see this customer.')
                      : tr('Only the chosen staff (and owner / manager) see this customer.')}
                  </p>
                </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('customerSheet.email', 'Email')}</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="col-span-full">
                  <label className="block text-sm font-medium mb-2">{t('customerSheet.description', 'Description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:bg-muted disabled:cursor-not-allowed"
                    rows={4}
                    placeholder={t('customerSheet.descriptionPlaceholder', 'Enter customer description...')}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </>
          )}

          {/* Plan Tab - content visibility from industry showIspFields */}
          {activeTab === 'plan' && showPlanTab && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showIspFields && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.connectionType', 'Connection')} <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.connectionType}
                    onChange={(e) => changeConnection(e.target.value as Provider)}
                    disabled={isReadOnly}
                  >
                    {availableProviders.length === 0 ? (
                      <option value="">{t('customerSheet.noProducts', 'No products - add in Settings → Products')}</option>
                    ) : (
                      <>
                        <option value="">{t('customerSheet.selectProduct', '- Select Product -')}</option>
                        {availableProviders.map((provider) => (
                          <option key={provider} value={provider}>
                            {getConnectionTypeLabel(provider, products)}
                          </option>
                        ))}
                      </>
                    )}
                  </Select>
                </div>
                )}
                {showIspFields && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.package', 'Product')} <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={formData.package}
                    onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                    disabled={isReadOnly || !formData.connectionType}
                  >
                    <option value="">
                      {formData.connectionType
                        ? `- ${t('customerSheet.selectPlan', 'Select Product')} -`
                        : tr('Choose the connection first')}
                    </option>
                    {availablePlans.map((plan) => (
                      <option key={plan.id} value={plan.planName}>
                        {plan.planName} · {rupeesIN(planMonthly(plan))}
                      </option>
                    ))}
                  </Select>
                </div>
                )}
                {showIspFields && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.stbNumber', 'Device ID')}{' '}
                    {isCable
                      ? <span className="text-destructive">*</span>
                      : <span className="text-xs text-muted-foreground font-normal">({t('common.optional', 'Optional')})</span>}
                  </label>
                  <Input
                    value={formData.stbNumber}
                    onChange={(e) => setFormData({ ...formData, stbNumber: e.target.value })}
                    placeholder={t('customerSheet.stbNumberPlaceholder', 'Enter STB number or User ID')}
                    disabled={isReadOnly}
                    title={t('customerSheet.stbNumberTooltip', 'Set-Top Box number or User ID')}
                  />
                </div>
                )}
                {showIspFields && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.canCafId', 'CAF/CAN ID')} <span className="text-xs text-muted-foreground font-normal">({t('common.optional', 'Optional')})</span>
                  </label>
                  <Input
                    value={formData.canCafId}
                    onChange={(e) => setFormData({ ...formData, canCafId: e.target.value })}
                    placeholder={t('customerSheet.canCafIdPlaceholder', 'Enter CAF or CAN ID')}
                    disabled={isReadOnly}
                    title={t('customerSheet.canCafIdTooltip', 'Customer Application Form ID or Customer Account Number')}
                  />
                </div>
                )}
                {showIspFields && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.cin', 'CIN')} <span className="text-xs text-muted-foreground font-normal">({t('common.optional', 'Optional')})</span>
                  </label>
                  <Input
                    value={formData.cin}
                    onChange={(e) => setFormData({ ...formData, cin: e.target.value })}
                    placeholder={t('customerSheet.cinPlaceholder', 'Enter Customer Identification Number')}
                    disabled={isReadOnly}
                    title={t('customerSheet.cinTooltip', 'Customer Identification Number')}
                  />
                </div>
                )}
                {/* Box Number - only for cable product customers when showIspFields */}
                {showIspFields && isCable && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('customerSheet.boxNumber', 'Box Number')} <span className="text-xs text-muted-foreground font-normal">({t('common.optional', 'Optional')})</span>
                    </label>
                    <Input
                      value={formData.boxNumber}
                      onChange={(e) => setFormData({ ...formData, boxNumber: e.target.value })}
                      placeholder={t('customerSheet.boxNumberPlaceholder', 'Enter box number')}
                      disabled={isReadOnly}
                    />
                  </div>
                )}
                {showIspFields && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.permanentDiscount', 'Permanent Discount')} <span className="text-xs text-muted-foreground font-normal">(%)</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formData.permanentDiscount ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      setFormData({ ...formData, permanentDiscount: v === undefined || isNaN(v) ? undefined : Math.min(100, Math.max(0, v)) });
                    }}
                    placeholder={t('customerSheet.permanentDiscountPlaceholder', '0–100')}
                    disabled={isReadOnly}
                  />
                  {(() => {
                    // Show the money, so nobody types ₹30 into a % box (30 = 30%, 100 = free).
                    const plan = availablePlans.find((p) => p.planName === formData.package);
                    if (!plan) return null;
                    const full = planMonthly(plan);
                    const pct = formData.permanentDiscount ?? 0;
                    const pay = Math.round(full * (100 - pct)) / 100;
                    return (
                      <p className={`text-xs mt-1.5 ${pct >= 100 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {pct >= 100
                          ? tr('Free connection: mark it paid every month. No reminder SMS.')
                          : tr('Customer pays ₹{{pay}} per month (plan ₹{{full}}).', { pay: rupeesIN(pay).slice(1), full: rupeesIN(full).slice(1) })}
                      </p>
                    );
                  })()}
                </div>
                )}
                {/* GSTIN is not stored for cable / internet customers on the server: demo mode only */}
                {showIspFields && !live && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('customerSheet.gstin', 'GSTIN')} <span className="text-xs text-muted-foreground font-normal">({t('common.optional', 'Optional')})</span>
                  </label>
                  <Input
                    value={formData.gstin || ''}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                      setFormData({ ...formData, gstin: value || undefined });
                    }}
                    placeholder={t('customerSheet.gstinPlaceholder', '15-character GSTIN')}
                    maxLength={15}
                    disabled={isReadOnly}
                    className="uppercase"
                  />
                </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'address' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.addressLine1', 'Address Line 1')}</label>
                <Input
                  value={formData.address.line1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, line1: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.addressLine2', 'Address Line 2')}</label>
                <Input
                  value={formData.address.line2}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, line2: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.city', 'City')}</label>
                <Input
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.state', 'State')}</label>
                <Input
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.pincode', 'Pincode')}</label>
                <Input
                  value={formData.address.pincode || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, pincode: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.country', 'Country')}</label>
                <Input
                  value={formData.address.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value },
                    })
                  }
                  disabled={isReadOnly}
                />
              </div>
              {!live && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('customerSheet.gstin', 'GSTIN')} <span className="text-xs text-muted-foreground">({t('common.optional', 'Optional')})</span>
                </label>
                <Input
                  value={formData.gstin || ''}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                    setFormData({
                      ...formData,
                      gstin: value || undefined,
                    });
                  }}
                  placeholder={t('customerSheet.gstinPlaceholder', '15-character GSTIN')}
                  maxLength={15}
                  disabled={isReadOnly}
                  className="uppercase"
                />
              </div>
              )}

              {/* Multiple Addresses Section (Edit Mode Only; demo mode only - not stored on the server) */}
              {!live && (
              <div className="mt-8 pt-6 border-t border-border col-span-1 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">{t('customerSheet.additionalAddresses', 'Additional Addresses')}</h3>
                  {!!customer && !isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          additionalAddresses: [
                            ...formData.additionalAddresses,
                            { line1: '', line2: '', city: '', state: '', country: 'India', pincode: '' },
                          ],
                        })
                      }
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('customerSheet.addAddress', 'Add Address')}
                    </Button>
                  )}
                </div>

                {!customer && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-border">
                    {t('customerSheet.editToAddAddresses', 'You can add multiple addresses after creating the customer. (Edit mode only)')}
                  </p>
                )}

                {!!customer && formData.additionalAddresses.map((addr, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg mb-4 bg-muted/20 relative">
                    <div className="absolute top-2 right-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newAddresses = [...formData.additionalAddresses];
                          newAddresses.splice(index, 1);
                          setFormData({ ...formData, additionalAddresses: newAddresses });
                        }}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-sm font-medium mb-3 text-muted-foreground">Address {index + 2}</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('customerSheet.addressLine1', 'Address Line 1')}</label>
                        <Input
                          value={addr.line1}
                          onChange={(e) => {
                            const newAddresses = [...formData.additionalAddresses];
                            newAddresses[index].line1 = e.target.value;
                            setFormData({ ...formData, additionalAddresses: newAddresses });
                          }}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('customerSheet.addressLine2', 'Address Line 2')}</label>
                        <Input
                          value={addr.line2}
                          onChange={(e) => {
                            const newAddresses = [...formData.additionalAddresses];
                            newAddresses[index].line2 = e.target.value;
                            setFormData({ ...formData, additionalAddresses: newAddresses });
                          }}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('customerSheet.city', 'City')}</label>
                        <Input
                          value={addr.city}
                          onChange={(e) => {
                            const newAddresses = [...formData.additionalAddresses];
                            newAddresses[index].city = e.target.value;
                            setFormData({ ...formData, additionalAddresses: newAddresses });
                          }}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('customerSheet.state', 'State')}</label>
                        <Input
                          value={addr.state}
                          onChange={(e) => {
                            const newAddresses = [...formData.additionalAddresses];
                            newAddresses[index].state = e.target.value;
                            setFormData({ ...formData, additionalAddresses: newAddresses });
                          }}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('customerSheet.pincode', 'Pincode')}</label>
                        <Input
                          value={addr.pincode || ''}
                          onChange={(e) => {
                            const newAddresses = [...formData.additionalAddresses];
                            newAddresses[index].pincode = e.target.value;
                            setFormData({ ...formData, additionalAddresses: newAddresses });
                          }}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('customerSheet.country', 'Country')}</label>
                        <Input
                          value={addr.country}
                          onChange={(e) => {
                            const newAddresses = [...formData.additionalAddresses];
                            newAddresses[index].country = e.target.value;
                            setFormData({ ...formData, additionalAddresses: newAddresses });
                          }}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">{t('customerSheet.gstin', 'GSTIN')} <span className="text-xs text-muted-foreground">({t('common.optional', 'Optional')})</span></label>
                        <Input
                          value={addr.gstin || ''}
                          onChange={(e) => {
                            const newAddresses = [...formData.additionalAddresses];
                            newAddresses[index].gstin = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                            setFormData({ ...formData, additionalAddresses: newAddresses });
                          }}
                          placeholder={t('customerSheet.gstinPlaceholder', '15-character GSTIN')}
                          maxLength={15}
                          className="uppercase"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          {/* More tab: credit limit, loyalty (industry-driven), tags, custom fields */}
          {activeTab === 'more' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.status', 'Status')}</label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                  disabled={isReadOnly}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status === 'Active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{tr('Inactive customers get no bills or SMS.')}</p>
              </div>
              {showLoyaltyCredit && !live && (
              <>
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.creditLimit', 'Credit Limit')}</label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={formData.creditLimit ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    setFormData({ ...formData, creditLimit: v === undefined || isNaN(v) ? undefined : Math.max(0, v) });
                  }}
                  placeholder={t('customerSheet.creditLimitPlaceholder', 'Amount')}
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('customerSheet.loyaltyPoints', 'Loyalty Points')}</label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={formData.loyaltyPoints ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                    setFormData({ ...formData, loyaltyPoints: v === undefined || isNaN(v) ? undefined : Math.max(0, v) });
                  }}
                  placeholder={t('customerSheet.loyaltyPointsPlaceholder', 'Points')}
                  disabled={isReadOnly}
                />
              </div>
              </>
              )}
              {!live && (<>
              <div className="col-span-full">
                <label className="block text-sm font-medium mb-2">{t('customerSheet.tags', 'Tags')}</label>
                <Input
                  value={(formData.tags ?? []).join(', ')}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const tags = raw.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
                    setFormData({ ...formData, tags });
                  }}
                  placeholder={t('customerSheet.tagsPlaceholder', 'tag1, tag2, tag3')}
                  disabled={isReadOnly}
                />
              </div>
              <div className="col-span-full">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">{t('customerSheet.customFields', 'Custom Fields')}</label>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cf = formData.customFields ?? {};
                        const newKey = `field_${Object.keys(cf).length}`;
                        setFormData({
                          ...formData,
                          customFields: { ...cf, [newKey]: '' },
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t('customerSheet.addField', 'Add')}
                    </Button>
                  )}
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(formData.customFields ?? {}).map(([key, val], idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        value={key}
                        onChange={(e) => {
                          const prev = { ...(formData.customFields ?? {}) };
                          delete prev[key];
                          prev[e.target.value] = val;
                          setFormData({ ...formData, customFields: prev });
                        }}
                        placeholder={t('customerSheet.fieldName', 'Field name')}
                        disabled={isReadOnly}
                        className="flex-1 min-w-0"
                      />
                      <Input
                        value={typeof val === 'string' ? val : String(val ?? '')}
                        onChange={(e) => {
                          const prev = { ...(formData.customFields ?? {}) };
                          prev[key] = e.target.value;
                          setFormData({ ...formData, customFields: prev });
                        }}
                        placeholder={t('customerSheet.fieldValue', 'Value')}
                        disabled={isReadOnly}
                        className="flex-1 min-w-0"
                      />
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            const prev = { ...(formData.customFields ?? {}) };
                            delete prev[key];
                            setFormData({ ...formData, customFields: prev });
                          }}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {Object.keys(formData.customFields ?? {}).length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('customerSheet.noCustomFields', 'No custom fields. Click Add to add key-value pairs.')}</p>
                  )}
                </div>
              </div>
              </>)}
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && showSubscriptionTab && customer && (
            <div className="space-y-4">
              {/* Existing subscriptions list */}
              {customerSubscriptions.length === 0 && !subFormOpen && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t('customerSheet.noSubscriptions', 'No subscriptions for this customer.')}
                </p>
              )}
              {customerSubscriptions.map((sub) => (
                <div key={sub.id} className="border border-border rounded-lg p-3 bg-card space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{sub.planName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrencyINR(sub.amount)} / {t(`subscriptions.${sub.billingCycle}`, sub.billingCycle)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sub.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        sub.status === 'paused' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {t(`subscriptions.status${sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}`, sub.status)}
                      </span>
                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSub(sub);
                              setSubForm({
                                planName: sub.planName,
                                amount: sub.amount,
                                billingCycle: sub.billingCycle,
                                startDate: sub.startDate,
                                nextBillingDate: sub.nextBillingDate,
                                status: sub.status,
                                autoRenew: sub.autoRenew,
                              });
                              setSubFormOpen(true);
                            }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSubscription(sub.id)}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{t('subscriptions.startDate', 'Start')}: {sub.startDate}</span>
                    <span>{t('subscriptions.nextBillingDate', 'Next')}: {sub.nextBillingDate}</span>
                    {sub.autoRenew && <span className="text-green-600 dark:text-green-400">{t('subscriptions.autoRenew', 'Auto-renew')}</span>}
                  </div>
                </div>
              ))}

              {/* Add/Edit subscription form */}
              {subFormOpen ? (
                <div className="border border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">
                      {editingSub ? t('subscriptions.editSubscription', 'Edit Subscription') : t('subscriptions.addSubscription', 'Add Subscription')}
                    </p>
                    <button type="button" onClick={() => { setSubFormOpen(false); setEditingSub(null); }} className="p-1 hover:bg-muted rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('subscriptions.planName', 'Plan name')} *</label>
                      <Input value={subForm.planName} onChange={(e) => setSubForm({ ...subForm, planName: e.target.value })} className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('subscriptions.amount', 'Amount')} *</label>
                      <Input type="number" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value === '' ? '' : Number(e.target.value) })} min={0} className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('subscriptions.billingCycle', 'Billing cycle')}</label>
                      <Select value={subForm.billingCycle} onChange={(e) => setSubForm({ ...subForm, billingCycle: e.target.value as BillingCycle })} className="h-9 text-sm">
                        <option value="monthly">{t('subscriptions.monthly', 'Monthly')}</option>
                        <option value="quarterly">{t('subscriptions.quarterly', 'Quarterly')}</option>
                        <option value="yearly">{t('subscriptions.yearly', 'Yearly')}</option>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('subscriptions.startDate', 'Start date')}</label>
                      <Input type="date" value={subForm.startDate} onChange={(e) => setSubForm({ ...subForm, startDate: e.target.value })} className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('subscriptions.nextBillingDate', 'Next billing')}</label>
                      <Input type="date" value={subForm.nextBillingDate} onChange={(e) => setSubForm({ ...subForm, nextBillingDate: e.target.value })} className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">{t('common.status', 'Status')}</label>
                      <Select value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value as SubscriptionStatus })} className="h-9 text-sm">
                        <option value="active">{t('subscriptions.statusActive', 'Active')}</option>
                        <option value="paused">{t('subscriptions.statusPaused', 'Paused')}</option>
                        <option value="cancelled">{t('subscriptions.statusCancelled', 'Cancelled')}</option>
                        <option value="expired">{t('subscriptions.statusExpired', 'Expired')}</option>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={subForm.autoRenew} onChange={(e) => setSubForm({ ...subForm, autoRenew: e.target.checked })} className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary" />
                    <span className="text-sm">{t('subscriptions.autoRenew', 'Auto renew')}</span>
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setSubFormOpen(false); setEditingSub(null); }}>
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!subForm.planName.trim() || subForm.amount === '' || Number(subForm.amount) < 0}
                      onClick={async () => {
                        const nextDate = subForm.nextBillingDate || (() => {
                          const d = new Date(subForm.startDate);
                          if (subForm.billingCycle === 'monthly') d.setMonth(d.getMonth() + 1);
                          else if (subForm.billingCycle === 'quarterly') d.setMonth(d.getMonth() + 3);
                          else d.setFullYear(d.getFullYear() + 1);
                          return d.toISOString().slice(0, 10);
                        })();
                        const payload = {
                          organizationId: MOCK_ORGANIZATION_ID,
                          customerId: customer.id,
                          customerName: customer.name,
                          planName: subForm.planName.trim(),
                          amount: Number(subForm.amount),
                          billingCycle: subForm.billingCycle,
                          startDate: subForm.startDate,
                          nextBillingDate: nextDate,
                          status: subForm.status,
                          autoRenew: subForm.autoRenew,
                        };
                        if (editingSub) {
                          await updateSubscription(editingSub.id, payload);
                        } else {
                          await addSubscription(payload);
                        }
                        setSubFormOpen(false);
                        setEditingSub(null);
                        setSubForm({
                          planName: '', amount: '', billingCycle: 'monthly',
                          startDate: new Date().toISOString().slice(0, 10),
                          nextBillingDate: '', status: 'active', autoRenew: true,
                        });
                      }}
                    >
                      {editingSub ? t('common.update', 'Update') : t('common.save', 'Save')}
                    </Button>
                  </div>
                </div>
              ) : (
                !isReadOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    setEditingSub(null);
                    setSubForm({
                      planName: '', amount: '', billingCycle: 'monthly',
                      startDate: new Date().toISOString().slice(0, 10),
                      nextBillingDate: '', status: 'active', autoRenew: true,
                    });
                    setSubFormOpen(true);
                  }} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('customerSheet.addSubscription', 'Add Subscription')}
                  </Button>
                )
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {isReadOnly ? t('common.close', 'Close') : t('common.cancel', 'Cancel')}
          </Button>
          {!isReadOnly && (
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">{saving ? tr('Saving...') : customer ? tr('Save changes') : tr('Add customer')}</Button>
          )}
        </DialogFooter>
      </form>
    </Dialog>
  );
};

export default CustomerSheet;
