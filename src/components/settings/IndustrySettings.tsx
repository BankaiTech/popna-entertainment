// Industry / business type display (read-only; set by SuperAdmin)
import { useTranslation } from 'react-i18next';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { getTemplateById } from '@/config/industryTemplates';
import type { IndustryType } from '@/models/types';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, string> = {
  Wifi: '📡', Store: '🏪', Warehouse: '📦', UtensilsCrossed: '🍽️',
  Scissors: '✂️', ShoppingBasket: '🛒', Cpu: '💻', Shirt: '👔',
  Heart: '❤️', Dumbbell: '🏋️', Building: '🏢', GraduationCap: '🎓',
  Car: '🚗', Briefcase: '💼', LayoutGrid: '📋',
};

const IndustrySettings = () => {
  const { t } = useTranslation();
  const { currentOrganization } = useOrganizationStore();
  const currentId = (currentOrganization?.industryType ?? 'general') as IndustryType;
  const currentTemplate = getTemplateById(currentId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('settings.industryTitle', 'Industry / Business Type')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.industryReadonly', 'Your industry type is set by the platform administrator. Contact support to change it.')}
        </p>
      </div>

      {currentTemplate && (
        <div className={cn('rounded-xl border-2 border-primary bg-primary/5 dark:bg-primary/10 p-6')}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center text-2xl shrink-0">
              {ICON_MAP[currentTemplate.icon] ?? '📌'}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{t(currentTemplate.labelKey)}</p>
              <p className="text-sm text-muted-foreground mt-1">{t(currentTemplate.descriptionKey)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-muted-foreground">{t('settings.enabledModules', 'Modules')}</p>
              <p className="font-semibold text-foreground mt-1">{currentOrganization?.allowedModules.length ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-muted-foreground">{t('settings.enabledSettingsTabs', 'Settings tabs')}</p>
              <p className="font-semibold text-foreground mt-1">{currentOrganization?.allowedSettingsTabs.length ?? 0}</p>
            </div>
            {currentTemplate.dashboardWidgets && (
              <div className="p-3 rounded-lg bg-background border border-border">
                <p className="text-muted-foreground">{t('settings.dashboardWidgets', 'Dashboard widgets')}</p>
                <p className="font-semibold text-foreground mt-1">{currentTemplate.dashboardWidgets.length}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustrySettings;
