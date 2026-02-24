import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Building2, Save } from 'lucide-react';
import type { CompanyProfile } from '@/models/types';

const CompanyProfileSettings = () => {
  const { t } = useTranslation();
  const { companyProfile, fetchCompanyProfile, updateCompanyProfile } = useStore();
  const [formData, setFormData] = useState<Partial<CompanyProfile>>({
    companyName: '',
    gstin: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    contactNumber: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCompanyProfile();
  }, [fetchCompanyProfile]);

  useEffect(() => {
    if (companyProfile) {
      setFormData({
        companyName: companyProfile.companyName || '',
        gstin: companyProfile.gstin || '',
        addressLine1: companyProfile.addressLine1 || '',
        addressLine2: companyProfile.addressLine2 || '',
        city: companyProfile.city || '',
        state: companyProfile.state || '',
        country: companyProfile.country || 'India',
        pincode: companyProfile.pincode || '',
        contactNumber: companyProfile.contactNumber || '',
        email: companyProfile.email || '',
      });
    }
  }, [companyProfile]);

  const validateGSTIN = (gstin: string): boolean => {
    const gstinRegex = /^[0-9A-Z]{15}$/;
    return gstinRegex.test(gstin);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      setError(t('companyProfile.validation.gstinInvalid', 'GSTIN must be exactly 15 alphanumeric characters'));
      return;
    }

    setSaving(true);
    try {
      await updateCompanyProfile(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('companyProfile.saveFailed', 'Failed to update company profile'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t('companyProfile.companyInformation', 'Company Information')}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-100 border border-green-200 rounded-md text-sm text-green-800">
                {t('companyProfile.saveSuccess', 'Company profile updated successfully!')}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.companyName', 'Company Name')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder={t('companyProfile.companyNamePlaceholder', 'Enter company name')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.gstin', 'GSTIN')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase().slice(0, 15) })}
                  placeholder="29ABCDE1234F1Z5"
                  maxLength={15}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('companyProfile.gstinHint', '15 characters, alphanumeric')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.email', 'Email')} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('companyProfile.emailPlaceholder', 'info@company.com')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.contactNumber', 'Contact Number')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  placeholder={t('companyProfile.contactNumberPlaceholder', '+91 9876543210')}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.addressLine1', 'Address Line 1')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder={t('companyProfile.addressLine1Placeholder', 'Street address')}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.addressLine2', 'Address Line 2')}
                </label>
                <Input
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder={t('companyProfile.addressLine2Placeholder', 'Suite, unit, building, floor, etc.')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.city', 'City')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t('companyProfile.cityPlaceholder', 'City')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.state', 'State')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder={t('companyProfile.statePlaceholder', 'State')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.country', 'Country')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder={t('companyProfile.countryPlaceholder', 'Country')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('companyProfile.pincode', 'Pincode')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder={t('companyProfile.pincodePlaceholder', '123456')}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? t('common.saving', 'Saving...') : t('companyProfile.save', 'Save Company Profile')}
              </Button>
            </div>
          </form>
    </div>
  );
};

export default CompanyProfileSettings;
