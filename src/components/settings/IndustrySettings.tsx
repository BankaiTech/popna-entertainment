// Industry / business type selection (applies template: modules, terminology, dashboard widgets)
import { useTranslation } from 'react-i18next';
import { useOrganizationStore } from '@/store/useOrganizationStore';
import { INDUSTRY_TEMPLATES, getTemplateById } from '@/config/industryTemplates';
import type { IndustryType } from '@/models/types';
import { cn } from '@/lib/utils';

const IndustrySettings = () => {
  const { t } = useTranslation();
  const { currentOrganization, setIndustryType } = useOrganizationStore();
  const currentId = (currentOrganization?.industryType ?? 'general') as IndustryType;
  const currentTemplate = getTemplateById(currentId);

  const handleSelect = (id: IndustryType) => {
    setIndustryType(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('settings.industryTitle', 'Industry / Business Type')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.industryDesc', 'Your industry determines which modules, terminology, and dashboard widgets are available.')}
        </p>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
          <span aria-hidden>🌐</span>
          {t('settings.industryMultiLanguageNote', 'Industry names and descriptions are shown in your selected app language.')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INDUSTRY_TEMPLATES.map((template) => {
          const isSelected = currentId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template.id)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3',
                isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {template.icon === 'Wifi' && '📡'}
                {template.icon === 'Store' && '🏪'}
                {template.icon === 'Warehouse' && '📦'}
                {template.icon === 'UtensilsCrossed' && '🍽️'}
                {template.icon === 'Scissors' && '✂️'}
                {template.icon === 'ShoppingBasket' && '🛒'}
                {template.icon === 'Cpu' && '💻'}
                {template.icon === 'Heart' && '❤️'}
                {template.icon === 'Dumbbell' && '🏋️'}
                {template.icon === 'LayoutGrid' && '📋'}
                {!['Wifi', 'Store', 'Warehouse', 'UtensilsCrossed', 'Scissors', 'ShoppingBasket', 'Cpu', 'Heart', 'Dumbbell', 'LayoutGrid'].includes(template.icon) && '📌'}
              </div>
              <p className="font-semibold text-foreground">{t(template.labelKey)}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t(template.descriptionKey)}</p>
              {isSelected && (
                <p className="text-xs font-medium text-primary mt-2">{t('settings.currentIndustry', 'Current')}</p>
              )}
            </button>
          );
        })}
      </div>

      {currentTemplate && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground mb-2">{t('settings.appliedTemplate', 'Applied template')}: {t(currentTemplate.labelKey)}</p>
          <p className="text-xs text-muted-foreground">
            {t('settings.templateModulesHint', 'Modules and settings tabs are filtered by this template. Change industry above to switch.')}
          </p>
        </div>
      )}
    </div>
  );
};

export default IndustrySettings;
