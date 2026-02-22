import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Globe, Save, Plus, Trash2, X } from 'lucide-react';
import type { WebsiteSettings, HighlightCard } from '@/models/types';
import {
  Zap, Clock, Shield, Wifi, Radio, Globe as GlobeIcon, Satellite,
  Package, Building2, CheckCircle, Star, Award, TrendingUp
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Zap,
  Clock,
  Shield,
  Wifi,
  Radio,
  Globe: GlobeIcon,
  Satellite,
  Package,
  Building2,
  CheckCircle,
  Star,
  Award,
  TrendingUp,
};

const availableIcons = [
  { value: 'Zap', label: 'Zap (Lightning)' },
  { value: 'Clock', label: 'Clock' },
  { value: 'Shield', label: 'Shield' },
  { value: 'Wifi', label: 'Wifi' },
  { value: 'Radio', label: 'Radio' },
  { value: 'Globe', label: 'Globe' },
  { value: 'Satellite', label: 'Satellite' },
  { value: 'Package', label: 'Package' },
  { value: 'Building2', label: 'Building' },
  { value: 'CheckCircle', label: 'Check Circle' },
  { value: 'Star', label: 'Star' },
  { value: 'Award', label: 'Award' },
  { value: 'TrendingUp', label: 'Trending Up' },
];

const WebsiteSettingsComponent = () => {
  const { t } = useTranslation();
  const { websiteSettings, fetchWebsiteSettings, updateWebsiteSettings } = useStore();
  const [formData, setFormData] = useState<Partial<WebsiteSettings>>({
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: '',
    heroImage: '',
    highlightSectionTitle: '',
    highlightCards: [],
    ctaButtonText: '',
    ctaButtonLink: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [cardForm, setCardForm] = useState<HighlightCard>({ title: '', description: '', icon: 'Zap' });

  useEffect(() => {
    fetchWebsiteSettings();
  }, [fetchWebsiteSettings]);

  useEffect(() => {
    if (websiteSettings) {
      setFormData({
        heroTitle: websiteSettings.heroTitle || '',
        heroSubtitle: websiteSettings.heroSubtitle || '',
        heroDescription: websiteSettings.heroDescription || '',
        heroImage: websiteSettings.heroImage || '',
        highlightSectionTitle: websiteSettings.highlightSectionTitle || '',
        highlightCards: websiteSettings.highlightCards || [],
        ctaButtonText: websiteSettings.ctaButtonText || '',
        ctaButtonLink: websiteSettings.ctaButtonLink || '',
      });
    }
  }, [websiteSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      await updateWebsiteSettings(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('websiteSettings.saveFailed', 'Failed to update website settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddCard = () => {
    if (cardForm.title && cardForm.description) {
      const newCards = [...(formData.highlightCards || []), cardForm];
      setFormData({ ...formData, highlightCards: newCards });
      setCardForm({ title: '', description: '', icon: 'Zap' });
      setEditingCardIndex(null);
    }
  };

  const handleEditCard = (index: number) => {
    const card = formData.highlightCards?.[index];
    if (card) {
      setCardForm(card);
      setEditingCardIndex(index);
    }
  };

  const handleUpdateCard = () => {
    if (editingCardIndex !== null && cardForm.title && cardForm.description) {
      const newCards = [...(formData.highlightCards || [])];
      newCards[editingCardIndex] = cardForm;
      setFormData({ ...formData, highlightCards: newCards });
      setCardForm({ title: '', description: '', icon: 'Zap' });
      setEditingCardIndex(null);
    }
  };

  const handleDeleteCard = (index: number) => {
    const newCards = formData.highlightCards?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, highlightCards: newCards });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('websiteSettings.title', 'Website Settings')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('websiteSettings.description', 'Configure homepage content and appearance.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('websiteSettings.heroSection', 'Hero Section')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                {t('websiteSettings.heroTitle', 'Hero Title')} <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.heroTitle}
                onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                placeholder={t('websiteSettings.heroTitlePlaceholder', 'Welcome to Our Service')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                {t('websiteSettings.heroSubtitle', 'Hero Subtitle')} <span className="text-destructive">*</span>
              </label>
              <Input
                value={formData.heroSubtitle}
                onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                placeholder={t('websiteSettings.heroSubtitlePlaceholder', 'Cable & Internet Services')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                {t('websiteSettings.heroDescription', 'Hero Description')} <span className="text-destructive">*</span>
              </label>
              <textarea
                value={formData.heroDescription}
                onChange={(e) => setFormData({ ...formData, heroDescription: e.target.value })}
                placeholder={t('websiteSettings.heroDescriptionPlaceholder', 'Choose the right plan for your home or business.')}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                {t('websiteSettings.heroImageUrl', 'Hero Image URL (Optional)')}
              </label>
              <Input
                type="url"
                value={formData.heroImage}
                onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('websiteSettings.highlightCards', 'Highlight Cards')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('websiteSettings.highlightCardsDescription', 'Add feature cards to showcase your services')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">{t('websiteSettings.cardTitle', 'Title')}</label>
                <Input
                  value={cardForm.title}
                  onChange={(e) => setCardForm({ ...cardForm, title: e.target.value })}
                  placeholder={t('websiteSettings.cardTitlePlaceholder', 'Feature title')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">{t('websiteSettings.cardIcon', 'Icon')}</label>
                <Select
                  value={cardForm.icon}
                  onChange={(e) => setCardForm({ ...cardForm, icon: e.target.value })}
                >
                  {availableIcons.map((icon) => (
                    <option key={icon.value} value={icon.value}>
                      {icon.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                {editingCardIndex === null ? (
                  <Button type="button" onClick={handleAddCard} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('websiteSettings.addCard', 'Add Card')}
                  </Button>
                ) : (
                  <div className="flex gap-2 w-full">
                    <Button type="button" onClick={handleUpdateCard} className="flex-1">
                      {t('common.update', 'Update')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCardForm({ title: '', description: '', icon: 'Zap' });
                        setEditingCardIndex(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">{t('websiteSettings.cardDescription', 'Description')}</label>
              <textarea
                value={cardForm.description}
                onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })}
                placeholder={t('websiteSettings.cardDescriptionPlaceholder', 'Feature description')}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                rows={2}
              />
            </div>

            {formData.highlightCards && formData.highlightCards.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-2">{t('websiteSettings.existingCards', 'Existing Cards:')}</p>
                {formData.highlightCards.map((card, index) => {
                  const Icon = iconMap[card.icon] || Zap;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">{card.title}</p>
                          <p className="text-sm text-muted-foreground">{card.description}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCard(index)}
                        >
                          {t('common.edit', 'Edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCard(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('websiteSettings.ctaButton', 'Call-to-Action Button')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('websiteSettings.buttonText', 'Button Text')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.ctaButtonText}
                  onChange={(e) => setFormData({ ...formData, ctaButtonText: e.target.value })}
                  placeholder={t('websiteSettings.buttonTextPlaceholder', 'Get Started')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">
                  {t('websiteSettings.buttonLink', 'Button Link')} <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.ctaButtonLink}
                  onChange={(e) => setFormData({ ...formData, ctaButtonLink: e.target.value })}
                  placeholder="/contact"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                {t('websiteSettings.highlightSectionTitle', 'Highlight Section Title')}
              </label>
              <Input
                value={formData.highlightSectionTitle}
                onChange={(e) => setFormData({ ...formData, highlightSectionTitle: e.target.value })}
                placeholder={t('websiteSettings.highlightSectionTitlePlaceholder', 'Our Services')}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 border border-green-200 rounded-md text-sm text-green-800">
            {t('websiteSettings.saveSuccess', 'Website settings updated successfully!')}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? t('common.saving', 'Saving...') : t('websiteSettings.save', 'Save Website Settings')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default WebsiteSettingsComponent;
