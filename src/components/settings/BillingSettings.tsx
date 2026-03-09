// Billing & UPI payment settings — API ready
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Save, Smartphone, CreditCard, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { upiPaymentApi } from '@/api/upiPayment';
import { organizationsApi } from '@/api/organizations';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import type { Organization } from '@/models/types';
import UpiPaymentModal from '@/components/UpiPaymentModal';
import { PLATFORM_UPI, hasPlatformUpi } from '@/config/platformUpi';

const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' },
  { id: 'bhim', label: 'BHIM' },
  { id: 'other', label: 'Other UPI apps' },
];

const BillingSettings = () => {
  const { t } = useTranslation();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [renewLoading] = useState(false);
  const [renewMessage, setRenewMessage] = useState<string | null>(null);
  const [renewSuccess, setRenewSuccess] = useState<boolean | null>(null);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [form, setForm] = useState({
    upiId: '',
    upiDisplayName: '',
    enabled: false,
    supportedApps: ['gpay', 'phonepe', 'paytm', 'bhim'] as string[],
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [upiData, org] = await Promise.all([
          upiPaymentApi.getConfig(MOCK_ORGANIZATION_ID),
          organizationsApi.getById(MOCK_ORGANIZATION_ID),
        ]);
        setOrganization(org ?? null);
        setForm({
          upiId: upiData.upiId ?? '',
          upiDisplayName: upiData.upiDisplayName ?? '',
          enabled: upiData.enabled ?? false,
          supportedApps: upiData.supportedApps ?? ['gpay', 'phonepe', 'paytm', 'bhim'],
        });
      } catch (e) {
        console.error('Failed to load billing config', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await upiPaymentApi.updateConfig({
        upiId: form.upiId,
        upiDisplayName: form.upiDisplayName,
        enabled: form.enabled,
        supportedApps: form.supportedApps,
      });
      setSuccess(true);
    } catch (e) {
      console.error('Failed to save UPI config', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleApp = (appId: string) => {
    setForm((prev) => ({
      ...prev,
      supportedApps: prev.supportedApps.includes(appId)
        ? prev.supportedApps.filter((a) => a !== appId)
        : [...prev.supportedApps, appId],
    }));
  };

  const handlePayToRenew = async () => {
    // Renewal: org pays platform — use our (platform) UPI/QR only
    if (hasPlatformUpi()) {
      setShowUpiModal(true);
    } else {
      alert(t('settings.renewalUpiNotConfigured', 'Renewal payment is not configured. Please contact support.'));
    }
  };

  const handlePaymentInitiated = () => {
    setShowUpiModal(false);
    setRenewMessage('Payment initiated. Please share the payment screenshot or UTR number for verification.');
    setRenewSuccess(null);
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        {t('settings.loading', 'Loading...')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pay to renew subscription — monthly */}
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">{t('settings.renewSubscription', 'Renew your subscription')}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {t('settings.renewSubscriptionDesc', 'Pay every month to keep your plan active. Payment can be made via UPI apps (Google Pay, PhonePe, Paytm, etc.).')}
      </p>
      <div className="space-y-4">
        {organization && (
          <p className="text-sm text-foreground">
            {t('settings.validUntil', 'Current plan valid until')} <strong>{organization.subscriptionEnd}</strong>.
          </p>
        )}
        <Button onClick={handlePayToRenew} disabled={renewLoading}>
          <CreditCard className="w-4 h-4 mr-2" />
          {renewLoading ? t('settings.creatingPayment', 'Creating payment...') : t('settings.payViaUpi', 'Pay via UPI (monthly renewal)')}
        </Button>
        {renewMessage && (
          <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${renewSuccess === true
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-300'
            : renewSuccess === false
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300'
              : 'bg-muted/50 text-muted-foreground'
            }`}>
            {renewSuccess === true && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {renewSuccess === false && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <p>{renewMessage}</p>
          </div>
        )}
        <div className="rounded-lg p-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">{t('settings.howConfirmationWorks', 'How payment confirmation works')}</p>
          <p>{t('settings.confirmationNote', 'After you pay, share the payment screenshot or UTR number with support. We will verify and extend your subscription. With direct UPI there is no automatic confirmation — a payment gateway can be added later for instant verification.')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Smartphone className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">{t('settings.payByUpi', 'Pay by UPI apps')}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {t('settings.upiDesc', 'Accept subscription and one-time payments via UPI apps. API ready — replace with real payment gateway.')}
      </p>
      <div className="space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          <label htmlFor="upi-enabled" className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              id="upi-enabled"
              checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 focus:ring-blue-500 accent-blue-600"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('settings.enableUpi', 'Enable UPI payments')}
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('settings.upiId', 'UPI ID')} <span className="text-muted-foreground">(e.g. yourname@paytm)</span>
            </label>
            <Input
              value={form.upiId}
              onChange={(e) => setForm((p) => ({ ...p, upiId: e.target.value }))}
              placeholder="yourname@paytm"
              className="max-w-xs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('settings.upiDisplayName', 'Display name (for customer)')}
            </label>
            <Input
              value={form.upiDisplayName}
              onChange={(e) => setForm((p) => ({ ...p, upiDisplayName: e.target.value }))}
              placeholder="Your Business Name"
              className="max-w-xs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('settings.supportedUpiApps', 'Supported UPI apps')}
            </label>
            <div className="flex flex-wrap gap-2">
              {UPI_APPS.map((app) => (
                <label
                  key={app.id}
                  className="inline-flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={form.supportedApps.includes(app.id)}
                    onChange={() => toggleApp(app.id)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 focus:ring-blue-500 accent-blue-600"
                  />
                  <span className="text-gray-900 dark:text-gray-100">{app.label}</span>
                </label>
              ))}
            </div>
          </div>

          {success && (
            <p className="text-sm text-green-600">{t('settings.saved', 'Settings saved.')}</p>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? t('settings.saving', 'Saving...') : t('settings.save', 'Save')}
            </Button>
          </div>
        </form>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('settings.apiReadyNote', 'Configure your UPI ID above to accept direct UPI payments without any payment gateway fees.')}
      </p>

      {/* UPI Payment Modal — renewal uses platform (our) UPI only; note includes org id, name, Subscription Renewal */}
      {hasPlatformUpi() && (
        <UpiPaymentModal
          isOpen={showUpiModal}
          onClose={() => setShowUpiModal(false)}
          upiId={PLATFORM_UPI.upiId}
          businessName={PLATFORM_UPI.businessName}
          amount={500} // Monthly subscription amount - adjust as needed
          description={
            organization
              ? `${organization.id} | ${organization.name} | Subscription Renewal`
              : t('settings.monthlyRenewal', 'Monthly Subscription Renewal')
          }
          transactionRef={organization ? `SUB_${organization.id}_${Date.now()}` : `SUB${Date.now()}`}
          onPaymentInitiated={handlePaymentInitiated}
        />
      )}
    </div>
  );
};

export default BillingSettings;
