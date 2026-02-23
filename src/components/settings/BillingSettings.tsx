// Billing & UPI payment settings — API ready
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Save, Smartphone, CreditCard, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { upiPaymentApi } from '@/api/upiPayment';
import { organizationsApi } from '@/api/organizations';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import type { Organization } from '@/models/types';
import { formatCurrencyINR } from '@/lib/utils';

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
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewMessage, setRenewMessage] = useState<string | null>(null);
  const [renewSuccess, setRenewSuccess] = useState<boolean | null>(null);
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
    setRenewLoading(true);
    setRenewMessage(null);
    setRenewSuccess(null);
    try {
      const result = await upiPaymentApi.createRenewalPayment({ organizationId: MOCK_ORGANIZATION_ID });
      if (result.paymentLink) {
        window.open(result.paymentLink, '_blank');
        setRenewMessage(t('settings.paymentLinkOpened', 'Payment link opened. Complete payment in the new tab.'));
      } else {
        // Mock/demo: treat as paid immediately — replace with real payment callback in production
        const renewed = await organizationsApi.renewSubscription(MOCK_ORGANIZATION_ID);
        if (renewed) {
          setOrganization(renewed);
          setRenewSuccess(true);
          setRenewMessage(
            t('settings.subscriptionRenewed', 'Subscription renewed! Valid until: {{date}}. Amount: {{amount}}.', {
              date: renewed.subscriptionEnd,
              amount: formatCurrencyINR(result.amount),
            })
          );
        }
      }
    } catch (e) {
      setRenewSuccess(false);
      setRenewMessage(t('settings.renewalError', 'Could not create payment. Try again or contact support.'));
    } finally {
      setRenewLoading(false);
    }
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-5 h-5" />
            {t('settings.renewSubscription', 'Renew your subscription')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('settings.renewSubscriptionDesc', 'Pay every month to keep your plan active. Payment can be made via UPI apps (Google Pay, PhonePe, Paytm, etc.).')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
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
              ? 'bg-green-50 border border-green-200 text-green-800'
              : renewSuccess === false
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-muted/50 text-muted-foreground'
              }`}>
              {renewSuccess === true && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {renewSuccess === false && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <p>{renewMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-5 h-5" />
            {t('settings.payByUpi', 'Pay by UPI apps')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('settings.upiDesc', 'Accept subscription and one-time payments via UPI apps. API ready — replace with real payment gateway.')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="upi-enabled"
                checked={form.enabled}
                onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                className="rounded border-border"
              />
              <label htmlFor="upi-enabled" className="text-sm font-medium">
                {t('settings.enableUpi', 'Enable UPI payments')}
              </label>
            </div>

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
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={form.supportedApps.includes(app.id)}
                      onChange={() => toggleApp(app.id)}
                      className="rounded border-border"
                    />
                    {app.label}
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
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {t('settings.apiReadyNote', 'API ready — replace upiPaymentApi with your payment gateway (e.g. Razorpay, Paytm, PhonePe) for live UPI collection.')}
      </p>
    </div>
  );
};

export default BillingSettings;
