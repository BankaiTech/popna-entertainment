// Generic card-based list for small screens; use with a table that shows on md+
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type FieldAccessor<T> = keyof T | ((item: T) => React.ReactNode);

function getValue<T>(item: T, field: FieldAccessor<T>): React.ReactNode {
  if (typeof field === 'function') return field(item);
  const v = item[field as keyof T];
  return v != null ? String(v) : '—';
}

export interface MobileCardListProps<T> {
  /** Data items */
  data: T[];
  /** Primary line (e.g. name) */
  primaryField: FieldAccessor<T>;
  /** Secondary line (e.g. description or subtitle) */
  secondaryField?: FieldAccessor<T>;
  /** Status or badge value */
  statusField?: FieldAccessor<T>;
  /** Click handler */
  onItemClick: (item: T) => void;
  /** Optional custom badge/content renderer */
  renderBadge?: (item: T) => React.ReactNode;
  /** Optional key extractor */
  getKey?: (item: T) => string | number;
  /** Empty message when data.length === 0 */
  emptyMessage?: string;
  className?: string;
}

export default function MobileCardList<T>({
  data,
  primaryField,
  secondaryField,
  statusField,
  onItemClick,
  renderBadge,
  getKey = (item) => (item as { id?: number | string }).id ?? 0,
  emptyMessage,
  className,
}: MobileCardListProps<T>) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <div className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        {emptyMessage ?? t('common.noResults', 'No results')}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3 p-3 md:hidden', className)}>
      {data.map((item) => (
        <button
          key={getKey(item)}
          type="button"
          onClick={() => onItemClick(item)}
          className="w-full text-left bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:bg-muted/30 transition-all active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">
                {getValue(item, primaryField)}
              </p>
              {secondaryField != null && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {getValue(item, secondaryField)}
                </p>
              )}
            </div>
            {(statusField != null || renderBadge) && (
              <div className="shrink-0 flex items-center gap-1.5">
                {renderBadge ? renderBadge(item) : statusField != null && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {getValue(item, statusField)}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
